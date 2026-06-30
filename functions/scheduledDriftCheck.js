const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const Orchestrator = require("./agents/orchestrator");

// Periodically run monitor checks on calendar blocks
exports.scheduledDriftCheck = onSchedule({
  schedule: "every 15 minutes",
  timeZone: "UTC",
  retryCount: 1,
  memory: "256MiB"
}, async (event) => {
  console.log("Running scheduled drift check...");
  
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  
  const db = admin.firestore();
  
  // Find all schedule blocks that are overdue (end_time is in the past, status is still 'planned')
  const now = new Date().toISOString();
  const missedBlocksSnap = await db.collection("schedule_blocks")
    .where("status", "==", "planned")
    .where("end_time", "<", now)
    .get();

  if (missedBlocksSnap.empty) {
    console.log("Scheduled Audit: No overdue task blocks detected.");
    return;
  }

  console.log(`Scheduled Audit: Detected ${missedBlocksSnap.size} overdue planned blocks. Initiating recovery...`);

  const apiKey = process.env.GEMINI_API_KEY || "";
  const orchestrator = new Orchestrator(apiKey);

  const tasksToProcess = [];
  missedBlocksSnap.forEach(snap => {
    const block = snap.data();
    tasksToProcess.push((async () => {
      try {
        // Resolve user id by fetching parent task -> parent deadline
        const taskSnap = await db.collection("tasks").doc(block.task_id).get();
        if (!taskSnap.exists) return;
        const task = taskSnap.data();

        const deadlineSnap = await db.collection("deadlines").doc(task.deadline_id).get();
        if (!deadlineSnap.exists) return;
        const deadline = deadlineSnap.data();

        console.log(`Triggering auto-replan for user ${deadline.user_id} due to missed block: "${block.title}"`);
        
        // Execute drift recovery
        await orchestrator.handleScheduleDrift(deadline.user_id, block.id);
      } catch (e) {
        console.error(`Failed to execute recovery check for block ${block.id}:`, e);
      }
    })());
  });

  await Promise.all(tasksToProcess);
  console.log("Scheduled drift check completed successfully.");
});
