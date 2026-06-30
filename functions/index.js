const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const path = require("path");

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import agents from sibling directory
const Orchestrator = require("./agents/orchestrator");
const { extractDeadline } = require("./agents/deadlineExtractionAgent");
const { planTask } = require("./agents/plannerAgent");
const { scheduleTasks } = require("./agents/schedulerAgent");
const { monitorSchedule } = require("./agents/monitorAgent");
const { replanSchedule } = require("./agents/replannerAgent");
const { explainSchedule } = require("./agents/communicatorAgent");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Helper to get Gemini API key
function getApiKey() {
  const key = process.env.GEMINI_API_KEY || "";
  return key;
}

// Check if we are running in Mock Mode
function isMockMode() {
  const key = getApiKey();
  return !key || key === "mock" || key === "demo" || key.trim() === "";
}

/**
 * Fetch the user's stored Google OAuth access token from Firestore.
 * This token is written during the sign-in popup in the frontend.
 */
async function getUserGoogleToken(userId) {
  try {
    const userSnap = await db.collection("users").doc(userId).get();
    if (userSnap.exists && userSnap.data().google_access_token) {
      return userSnap.data().google_access_token;
    }
  } catch (e) {
    console.warn("Could not fetch google_access_token for user:", e.message);
  }
  return null;
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    mode: isMockMode() ? "Mock Mode (Simulated LLM)" : "Live Mode (Gemini API Active)",
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint to ingest an email/text, extract deadline, plan subtasks, and schedule blocks
 */
app.post("/extract-deadline", async (req, res) => {
  const { userId, text, source } = req.body;
  if (!userId || !text) {
    return res.status(400).json({ error: "Missing userId or text in request body." });
  }

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured. Set GEMINI_API_KEY environment variable." });
    }
    if (!isMockMode()) {
      // Live Mode: Run the real Gemini multi-agent orchestrator
      // Thread the user's Google OAuth token so Calendar writes are real
      const googleToken = await getUserGoogleToken(userId);
      const orchestrator = new Orchestrator(apiKey, googleToken);
      const result = await orchestrator.handleNewDeadline(userId, text, source || "manual");
      return res.json(result);
    }

    // -------------------------------------------------------------
    // Mock Mode Fallback Engine
    // -------------------------------------------------------------
    console.log("Running in Mock Mode. Simulating Gemini Agents...");
    
    // Simulate latency
    await new Promise(r => setTimeout(r, 1500));

    // 1. Check user preferences
    const prefSnap = await db.collection("user_preferences").doc(userId).get();
    const preferences = prefSnap.exists ? prefSnap.data() : { peak_focus_hours: "morning" };

    // 2. Fetch existing deadlines
    const deadlineSnap = await db.collection("deadlines").where("user_id", "==", userId).get();
    const existing = [];
    deadlineSnap.forEach(d => existing.push(d.data()));

    // Simulate Extraction Agent output
    let taskName = text;
    let priority = "medium";
    let daysAhead = 3;

    if (text.toLowerCase().includes("report") || text.toLowerCase().includes("financial")) {
      taskName = "Q2 Financial Report & Analysis";
      priority = "high";
      daysAhead = 4;
    } else if (text.toLowerCase().includes("pitch") || text.toLowerCase().includes("slide")) {
      taskName = "Q3 Product Pitch Presentation";
      priority = "high";
      daysAhead = 2;
    } else if (text.toLowerCase().includes("tax")) {
      taskName = "Annual Tax Filing Preparation";
      priority = "medium";
      daysAhead = 5;
    }

    const calculatedDueDate = new Date(Date.now() + daysAhead * 24 * 3600 * 1000);
    calculatedDueDate.setHours(17, 0, 0, 0); // 5 PM
    const isoDueDate = calculatedDueDate.toISOString();

    // Check for conflict simulation (disagreeing on due dates)
    const existingMatch = existing.find(d => d.title.toLowerCase().includes("report") || d.title.toLowerCase().includes("pitch"));
    if (existingMatch && text.toLowerCase().includes("conflict")) {
      return res.json({
        status: "conflict",
        message: "Conflict detected between existing deadlines and incoming request.",
        extraction: {
          task: existingMatch.title,
          due_date: isoDueDate,
          priority: priority,
          conflict: true,
          candidates: [
            { source: "existing", due_date: existingMatch.due_at },
            { source: "inbound", due_date: isoDueDate }
          ]
        }
      });
    }

    // Save Mock Deadline
    const deadlineRef = db.collection("deadlines").doc();
    const deadlineData = {
      id: deadlineRef.id,
      user_id: userId,
      title: taskName,
      due_at: isoDueDate,
      source: source || "manual",
      priority: priority,
      raw_text: text,
      created_at: new Date().toISOString()
    };
    await deadlineRef.set(deadlineData);

    // Save Mock subtasks (Planner Agent simulation)
    const subtaskTemplates = [
      { title: `Gather inputs and requirements for ${taskName}`, mins: 60 },
      { title: `Draft core sections and analysis of ${taskName}`, mins: 90 },
      { title: `Format layout, review structure, and refine data`, mins: 45 },
      { title: `Final polish and submit ${taskName}`, mins: 30 }
    ];

    const subtasks = [];
    const taskBatch = db.batch();
    for (const temp of subtaskTemplates) {
      const taskRef = db.collection("tasks").doc();
      const taskData = {
        id: taskRef.id,
        deadline_id: deadlineRef.id,
        title: temp.title,
        estimated_minutes: temp.mins,
        status: "planned"
      };
      taskBatch.set(taskRef, taskData);
      subtasks.push(taskData);
    }
    await taskBatch.commit();

    // Save Mock Schedule Blocks (Scheduler Agent simulation)
    const savedBlocks = [];
    const scheduleBatch = db.batch();
    
    // Position blocks tomorrow
    let baseHour = preferences.peak_focus_hours === "morning" ? 9 : 
                   preferences.peak_focus_hours === "afternoon" ? 14 : 18;

    for (let i = 0; i < subtasks.length; i++) {
      const sub = subtasks[i];
      const start = new Date();
      start.setDate(start.getDate() + 1); // Tomorrow
      start.setHours(baseHour + i * 2, 0, 0, 0); // spaced 2 hours apart
      
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + sub.estimated_minutes);

      const blockRef = db.collection("schedule_blocks").doc();
      const blockData = {
        id: blockRef.id,
        task_id: sub.id,
        title: sub.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "planned",
        calendar_event_id: `mock-${blockRef.id}`
      };
      scheduleBatch.set(blockRef, blockData);
      savedBlocks.push(blockData);
    }
    await scheduleBatch.commit();

    res.json({
      status: "success",
      message: `[MOCK MODE] Analyzed "${taskName}", generated ${subtasks.length} subtasks, and scheduled ${savedBlocks.length} focus blocks.`,
      deadline: deadlineData,
      subtasks,
      schedule_blocks: savedBlocks
    });

  } catch (error) {
    console.error("Endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to simulate a task block being missed, triggering monitor -> replanner -> communicator
 */
app.post("/simulate-drift", async (req, res) => {
  const { userId, scheduleBlockId } = req.body;
  if (!userId || !scheduleBlockId) {
    return res.status(400).json({ error: "Missing userId or scheduleBlockId." });
  }

  try {
    const apiKey = getApiKey();
    if (!isMockMode()) {
      // Live Mode
      const googleToken = await getUserGoogleToken(userId);
      const orchestrator = new Orchestrator(apiKey, googleToken);
      const result = await orchestrator.handleScheduleDrift(userId, scheduleBlockId);
      return res.json(result);
    }

    // -------------------------------------------------------------
    // Mock Mode Fallback Engine
    // -------------------------------------------------------------
    console.log("Rescheduling in Mock Mode...");
    await new Promise(r => setTimeout(r, 1500));

    // Update target block to missed
    const missedRef = db.collection("schedule_blocks").doc(scheduleBlockId);
    const missedSnap = await missedRef.get();
    if (!missedSnap.exists) {
      return res.status(404).json({ error: "Block not found." });
    }
    const missedBlock = missedSnap.data();
    await missedRef.update({ status: "missed" });

    // Fetch details
    const deadlinesSnap = await db.collection("deadlines").where("user_id", "==", userId).get();
    const deadlines = [];
    deadlinesSnap.forEach(d => deadlines.push(d.data()));

    const tasksSnap = await db.collection("tasks").get();
    const tasks = [];
    tasksSnap.forEach(t => tasks.push(t.data()));

    const scheduleSnap = await db.collection("schedule_blocks").get();
    const allBlocks = [];
    scheduleSnap.forEach(s => allBlocks.push({ id: s.id, ...s.data() }));

    const remainingPlannedBlocks = allBlocks.filter(b => b.status === "planned");

    // Re-schedule remaining items to start later (e.g. push forward 3 hours)
    const batch = db.batch();
    remainingPlannedBlocks.forEach(b => {
      batch.delete(db.collection("schedule_blocks").doc(b.id));
    });

    const updatedBlocks = [];
    const remainingTasks = [
      { title: missedBlock.title, id: missedBlock.task_id },
      ...remainingPlannedBlocks.map(b => ({ title: b.title, id: b.task_id }))
    ];

    for (let i = 0; i < remainingTasks.length; i++) {
      const task = remainingTasks[i];
      const start = new Date();
      start.setDate(start.getDate() + 1 + Math.floor(i / 2)); // Shift over the next 1-2 days
      start.setHours(10 + (i % 2) * 3, 0, 0, 0); // 10 AM, 1 PM
      
      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      const blockRef = db.collection("schedule_blocks").doc();
      const blockData = {
        id: blockRef.id,
        task_id: task.id,
        title: task.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "planned",
        calendar_event_id: `mock-${blockRef.id}`
      };
      batch.set(blockRef, blockData);
      updatedBlocks.push(blockData);
    }
    await batch.commit();

    // Log drift event
    const driftRef = db.collection("drift_events").doc();
    const driftData = {
      id: driftRef.id,
      task_id: missedBlock.task_id,
      severity: 7,
      reason: `Missed calendar block: "${missedBlock.title}"`,
      detected_at: new Date().toISOString()
    };
    await driftRef.set(driftData);

    // Mock Communicator Agent output
    const mockExplanation = `You missed your focus block for "${missedBlock.title}". To protect your deadline, the Planner and Scheduler Agents have shifted this slot and remaining subtasks to tomorrow. Your focus window has been re-aligned to start at 10:00 AM tomorrow.`;
    const mockSpokenText = `Your schedule was adjusted because you missed a focus block. I moved the remaining tasks to tomorrow.`;

    const replanLogRef = db.collection("replan_logs").doc();
    await replanLogRef.set({
      id: replanLogRef.id,
      drift_event_id: driftRef.id,
      old_schedule: [{ title: missedBlock.title, start_time: missedBlock.start_time }, ...remainingPlannedBlocks],
      new_schedule: updatedBlocks,
      reason: driftData.reason,
      explanation: mockExplanation,
      spoken_text: mockSpokenText,
      created_at: new Date().toISOString()
    });

    res.json({
      status: "replanned",
      message: `[MOCK MODE] Schedule re-optimized: ${driftData.reason}`,
      drift: driftData,
      explanation: mockExplanation
    });

  } catch (error) {
    console.error("Drift simulation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * On-demand explanation of current plan
 */
app.post("/explain-schedule", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId." });
  }

  try {
    const apiKey = getApiKey();
    if (!isMockMode()) {
      // Live Mode
      const orchestrator = new Orchestrator(apiKey);
      const result = await orchestrator.handleExplainSchedule(userId);
      return res.json(result);
    }

    // Mock Mode
    await new Promise(r => setTimeout(r, 800));
    
    // Fetch preferences
    const prefSnap = await db.collection("user_preferences").doc(userId).get();
    const preferences = prefSnap.exists ? prefSnap.data() : { peak_focus_hours: "morning" };

    const mockExplanation = `Your calendar is structured to optimize your deep work capability. We have booked task blocks during your peak focus hours (${preferences.peak_focus_hours === "morning" ? "Morning 8AM-12PM" : "Afternoon 1PM-5PM"}) to guarantee maximum focus and efficiency. The sequencing places foundational study and draft writing first, followed by review cycles, ensuring the final submission lands 24 hours ahead of your hard deadline.`;

    res.json({
      explanation: mockExplanation,
      spoken_text: "I set up your work blocks during focus hours to ensure you complete your tasks early."
    });
  } catch (error) {
    console.error("Explain plan error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to mark a block as completed
 */
app.post("/complete-block", async (req, res) => {
  const { scheduleBlockId } = req.body;
  if (!scheduleBlockId) {
    return res.status(400).json({ error: "Missing scheduleBlockId." });
  }

  try {
    const blockRef = db.collection("schedule_blocks").doc(scheduleBlockId);
    const snap = await blockRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Block not found." });
    }
    const block = snap.data();

    // Mark block completed
    await blockRef.update({ status: "completed" });

    // Mark matching subtask completed
    if (block.task_id) {
      await db.collection("tasks").doc(block.task_id).update({ status: "completed" });
    }

    res.json({ message: "Block marked as completed successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to clear all user schedule records to reset the dashboard demo
 */
app.post("/clear-database", async (req, res) => {
  const { userId } = req.body;
  try {
    const orchestrator = new Orchestrator("");
    const result = await orchestrator.clearAllUserData(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
  // ------------------------------------------------------------------
  // Gmail fetch endpoint – returns recent message subjects for deadline extraction
  // ------------------------------------------------------------------
  app.get("/fetch-gmail", async (req, res) => {
    const { userId, maxResults = 10 } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter." });
    }
    try {
      const token = await getUserGoogleToken(userId);
      if (!token) {
        return res.status(403).json({ error: "Google OAuth token not available for user." });
      }
      const { google } = require("googleapis");
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: token });
      const gmail = google.gmail({ version: "v1", auth });
      const resp = await gmail.users.messages.list({ userId: "me", maxResults: Number(maxResults) });
      const messages = resp.data.messages || [];
      const details = await Promise.all(messages.map(async (m) => {
        const msg = await gmail.users.messages.get({ userId: "me", id: m.id, format: "metadata", metadataHeaders: ["Subject"] });
        const subjectHeader = msg.data.payload.headers.find(h => h.name === "Subject");
        return { id: m.id, subject: subjectHeader ? subjectHeader.value : "(no subject)" };
      }));
      res.json({ messages: details });
    } catch (e) {
      console.error("Gmail fetch error:", e);
      res.status(500).json({ error: e.message });
    }
  });
// Expose api HTTPS Function
exports.api = onRequest({ cors: true, timeoutSeconds: 60, memory: "256MiB" }, app);

// Export background scheduled functions
const { scheduledDriftCheck } = require("./scheduledDriftCheck");
exports.scheduledDriftCheck = scheduledDriftCheck;
