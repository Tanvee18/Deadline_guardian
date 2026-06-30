const admin = require("firebase-admin");
const { extractDeadline } = require("./deadlineExtractionAgent");
const { planTask } = require("./plannerAgent");
const { scheduleTasks } = require("./schedulerAgent");
const { monitorSchedule } = require("./monitorAgent");
const { replanSchedule } = require("./replannerAgent");
const { explainSchedule } = require("./communicatorAgent");

/**
 * Orchestrator Agent
 * 
 * Coordinates workflows between individual agents, manages shared state in Firestore,
 * and maintains execution consistency.
 */
class Orchestrator {
  constructor(apiKey, googleAccessToken = null) {
    this.apiKey = apiKey;
    this.db = admin.firestore();
    this.googleAccessToken = googleAccessToken; // OAuth token for Gmail/Calendar API calls
  }

  /**
   * Write a confirmed schedule block to Google Calendar (if OAuth token is present).
   * Returns the real event ID from Google Calendar, or null if token is absent.
   */
  async _writeToGoogleCalendar(title, startTime, endTime) {
    if (!this.googleAccessToken) return null;
    try {
      const { google } = require("googleapis");
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: this.googleAccessToken });
      const calendar = google.calendar({ version: "v3", auth });
      const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: `[DeadlineGuardian] ${title}`,
          start: { dateTime: startTime, timeZone: "UTC" },
          end:   { dateTime: endTime,   timeZone: "UTC" },
          description: "Focus block auto-scheduled by DeadlineGuardian AI."
        }
      });
      return event.data.id;
    } catch (err) {
      console.warn("Calendar write failed (non-fatal):", err.message);
      return null;
    }
  }

  /**
   * Delete a Google Calendar event by event ID.
   */
  async _deleteFromGoogleCalendar(calendarEventId) {
    if (!this.googleAccessToken || !calendarEventId || calendarEventId.startsWith("mock-")) return;
    try {
      const { google } = require("googleapis");
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: this.googleAccessToken });
      const calendar = google.calendar({ version: "v3", auth });
      await calendar.events.delete({ calendarId: "primary", eventId: calendarEventId });
    } catch (err) {
      console.warn("Calendar delete failed (non-fatal):", err.message);
    }
  }

  /**
   * Pipeline 1: Deadline ingestion -> Subtask breakdown -> Schedule placement
   */
  async handleNewDeadline(userId, rawText, source) {
    try {
      console.log(`Orchestrator: Handling new deadline from ${source} for user ${userId}`);

      // 1. Fetch user preferences
      const prefSnap = await this.db.collection("user_preferences").doc(userId).get();
      const preferences = prefSnap.exists ? prefSnap.data() : { peak_focus_hours: "morning" };

      // 2. Fetch existing active deadlines
      const deadlineSnap = await this.db.collection("deadlines").where("user_id", "==", userId).get();
      const existingDeadlines = [];
      deadlineSnap.forEach(d => existingDeadlines.push({ id: d.id, ...d.data() }));

      // 3. Extract deadline details using Extraction Agent
      const extraction = await extractDeadline(rawText, source, existingDeadlines, this.apiKey);

      if (extraction.conflict) {
        console.log("Orchestrator: Conflict detected. Emitting flag.");
        return { 
          status: "conflict", 
          message: "Conflict detected between existing deadlines and incoming request.",
          extraction 
        };
      }

      // 4. Save deadline to Firestore
      const deadlineRef = this.db.collection("deadlines").doc();
      const deadlineData = {
        id: deadlineRef.id,
        user_id: userId,
        title: extraction.task,
        due_at: extraction.due_date,
        source: source,
        priority: extraction.priority,
        raw_text: rawText,
        created_at: new Date().toISOString()
      };
      await deadlineRef.set(deadlineData);

      // 5. Generate subtask breakdown using Planner Agent
      console.log("Orchestrator: Generating task plan with Planner Agent...");
      const taskPlan = await planTask(extraction.task, extraction.due_date, this.apiKey);

      // Save subtasks to Firestore
      const subtasks = [];
      const taskBatch = this.db.batch();
      for (const st of taskPlan.subtasks) {
        const taskRef = this.db.collection("tasks").doc();
        const taskData = {
          id: taskRef.id,
          deadline_id: deadlineRef.id,
          title: st.title,
          estimated_minutes: st.estimated_minutes,
          status: "planned"
        };
        taskBatch.set(taskRef, taskData);
        subtasks.push(taskData);
      }
      await taskBatch.commit();

      // 6. Fetch existing busy schedule blocks (avoid overlaps)
      const scheduleSnap = await this.db.collection("schedule_blocks")
        .where("status", "==", "planned")
        .get();
      const busyBlocks = [];
      scheduleSnap.forEach(s => busyBlocks.push(s.data()));

      // 7. Generate schedule blocks using Scheduler Agent
      console.log("Orchestrator: Placing subtasks on calendar with Scheduler Agent...");
      const scheduling = await scheduleTasks(subtasks, extraction.due_date, busyBlocks, preferences, this.apiKey);

      // Save schedule blocks to Firestore (and write to Google Calendar if token present)
      const scheduleBatch = this.db.batch();
      const savedBlocks = [];
      for (const sb of scheduling.schedule_blocks) {
        // Match block back to subtask to link task_id
        const matchedSubtask = subtasks.find(s => s.title.toLowerCase() === sb.title.toLowerCase()) || subtasks[0];
        
        // Attempt real Google Calendar write; falls back gracefully if no token
        const calEventId = await this._writeToGoogleCalendar(sb.title, sb.start_time, sb.end_time);

        const blockRef = this.db.collection("schedule_blocks").doc();
        const blockData = {
          id: blockRef.id,
          task_id: matchedSubtask.id,
          title: sb.title,
          start_time: sb.start_time,
          end_time: sb.end_time,
          status: "planned",
          calendar_event_id: calEventId || `pending-${blockRef.id}`
        };
        scheduleBatch.set(blockRef, blockData);
        savedBlocks.push(blockData);
      }
      await scheduleBatch.commit();

      return {
        status: "success",
        message: `Successfully analyzed "${extraction.task}", broke it into ${subtasks.length} subtasks, and scheduled ${savedBlocks.length} focus blocks.`,
        deadline: deadlineData,
        subtasks,
        schedule_blocks: savedBlocks
      };
    } catch (e) {
      console.error("Orchestrator handleNewDeadline error:", e);
      throw e;
    }
  }

  /**
   * Pipeline 2: Drift detection -> Replanning -> Explanation
   */
  async handleScheduleDrift(userId, missedBlockId) {
    try {
      console.log(`Orchestrator: Handling schedule drift triggered by missed block ${missedBlockId}`);

      // 1. Get the missed block
      const missedRef = this.db.collection("schedule_blocks").doc(missedBlockId);
      const missedSnap = await missedRef.get();
      if (!missedSnap.exists) {
        throw new Error("Target schedule block does not exist.");
      }
      const missedBlock = missedSnap.data();

      // Update missed block status in database
      await missedRef.update({ status: "missed" });

      // 2. Fetch all user deadlines, subtasks, and schedule blocks
      const deadlinesSnap = await this.db.collection("deadlines").where("user_id", "==", userId).get();
      const deadlines = [];
      deadlinesSnap.forEach(d => deadlines.push(d.data()));

      const tasksSnap = await this.db.collection("tasks").get();
      const tasks = [];
      tasksSnap.forEach(t => tasks.push(t.data()));

      const scheduleSnap = await this.db.collection("schedule_blocks").get();
      const allBlocks = [];
      scheduleSnap.forEach(s => allBlocks.push({ id: s.id, ...s.data() }));

      // 3. Monitor Agent: Assess current status & severity of the missed block
      console.log("Orchestrator: Evaluating schedule health with Monitor Agent...");
      const monitoringResult = await monitorSchedule(allBlocks, tasks, deadlines, this.apiKey);

      if (!monitoringResult.drift_detected) {
        return {
          status: "on_track",
          message: "Monitor Agent indicates schedule is still on track. No replanning required."
        };
      }

      // 4. Find all remaining planned (and the missed) tasks to reschedule
      const remainingPlannedBlocks = allBlocks.filter(b => b.status === "planned");
      // Add the missed block back as something that needs to be replanned
      const remainingSubtasks = [
        { title: missedBlock.title, estimated_minutes: 60 },
        ...remainingPlannedBlocks.map(b => ({ title: b.title, estimated_minutes: 60 }))
      ];

      // Get user preferences
      const prefSnap = await this.db.collection("user_preferences").doc(userId).get();
      const preferences = prefSnap.exists ? prefSnap.data() : { peak_focus_hours: "morning" };

      // Find primary deadline for the missed task to set target
      const parentTask = tasks.find(t => t.id === missedBlock.task_id);
      const parentDeadline = parentTask ? deadlines.find(d => d.id === parentTask.deadline_id) : deadlines[0];
      const deadlineDate = parentDeadline ? parentDeadline.due_at : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      // Get busy blocks (pre-existing events, excluding our own planned blocks which we are replanning)
      const busyBlocks = allBlocks.filter(b => b.status === "completed"); // only completed items are fixed

      // 5. Replanner Agent: Re-optimize the calendar positions
      console.log("Orchestrator: Recalculating schedule with Replanner Agent...");
      const replanned = await replanSchedule(
        remainingSubtasks,
        deadlineDate,
        busyBlocks,
        preferences,
        { severity: monitoringResult.severity, reason: monitoringResult.reason },
        this.apiKey
      );

      // 6. Database Update: Delete old planned blocks and write new ones
      const batch = this.db.batch();
      remainingPlannedBlocks.forEach(b => {
        batch.delete(this.db.collection("schedule_blocks").doc(b.id));
      });

      const updatedBlocks = [];
      for (const sb of replanned.updated_schedule) {
        const blockRef = this.db.collection("schedule_blocks").doc();
        // Match back to taskId or use the original missed taskId
        const matchedTask = tasks.find(t => t.title.toLowerCase() === sb.title.toLowerCase()) || parentTask;

        // Delete old Calendar event and write new one if token is present
        const oldBlock = remainingPlannedBlocks.find(b => b.title.toLowerCase() === sb.title.toLowerCase());
        if (oldBlock) await this._deleteFromGoogleCalendar(oldBlock.calendar_event_id);
        const calEventId = await this._writeToGoogleCalendar(sb.title, sb.start_time, sb.end_time);

        const blockData = {
          id: blockRef.id,
          task_id: matchedTask ? matchedTask.id : missedBlock.task_id,
          title: sb.title,
          start_time: sb.start_time,
          end_time: sb.end_time,
          status: "planned",
          calendar_event_id: calEventId || `pending-${blockRef.id}`
        };
        batch.set(blockRef, blockData);
        updatedBlocks.push(blockData);
      }
      await batch.commit();

      // 7. Log Drift Event in database
      const driftRef = this.db.collection("drift_events").doc();
      const driftData = {
        id: driftRef.id,
        task_id: missedBlock.task_id,
        severity: monitoringResult.severity,
        reason: monitoringResult.reason,
        detected_at: new Date().toISOString()
      };
      await driftRef.set(driftData);

      // 8. Communicator Agent: Explain the changes and why
      console.log("Orchestrator: Requesting schedule explanation from Communicator Agent...");
      const oldScheduleSnapshot = [{ title: missedBlock.title, start_time: missedBlock.start_time }, ...remainingPlannedBlocks];
      const communication = await explainSchedule(
        updatedBlocks, 
        deadlines, 
        driftData, 
        { old_schedule: oldScheduleSnapshot, new_schedule: updatedBlocks, reason: monitoringResult.reason },
        this.apiKey
      );

      // Log Replan Log in database
      const replanLogRef = this.db.collection("replan_logs").doc();
      await replanLogRef.set({
        id: replanLogRef.id,
        drift_event_id: driftRef.id,
        old_schedule: oldScheduleSnapshot,
        new_schedule: updatedBlocks,
        reason: monitoringResult.reason,
        explanation: communication.explanation,
        spoken_text: communication.spoken_text,
        created_at: new Date().toISOString()
      });

      return {
        status: "replanned",
        message: `Schedule re-optimized. ${monitoringResult.reason}`,
        drift: driftData,
        explanation: communication.explanation
      };
    } catch (e) {
      console.error("Orchestrator handleScheduleDrift error:", e);
      throw e;
    }
  }

  /**
   * Helper to explain the current calendar plan on-demand ("Why this plan?" button)
   */
  async handleExplainSchedule(userId) {
    try {
      const deadlinesSnap = await this.db.collection("deadlines").where("user_id", "==", userId).get();
      const deadlines = [];
      deadlinesSnap.forEach(d => deadlines.push(d.data()));

      const scheduleSnap = await this.db.collection("schedule_blocks").get();
      const blocks = [];
      scheduleSnap.forEach(s => blocks.push(s.data()));

      // If there is a recent replan log, include it
      const recentLogSnap = await this.db.collection("replan_logs").limit(1).get();
      let recentLog = null;
      recentLogSnap.forEach(l => recentLog = l.data());

      const explanation = await explainSchedule(blocks, deadlines, null, recentLog, this.apiKey);
      return explanation;
    } catch (e) {
      console.error("Orchestrator handleExplainSchedule error:", e);
      throw e;
    }
  }

  /**
   * Clears Firestore database collections for a fresh demo run
   */
  async clearAllUserData(userId) {
    const collections = ["deadlines", "tasks", "schedule_blocks", "drift_events", "replan_logs"];
    for (const collName of collections) {
      const snap = await this.db.collection(collName).get();
      const batch = this.db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    return { message: "Database cleared successfully." };
  }
}

module.exports = Orchestrator;
