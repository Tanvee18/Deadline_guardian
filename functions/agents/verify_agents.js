// Verification Script for DeadlineGuardian Agents
// Ensures all module exports, imports, and syntaxes are valid.

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "deadline-guardian-demo" });

const { extractDeadline } = require("./deadlineExtractionAgent");
const { planTask } = require("./plannerAgent");
const { scheduleTasks } = require("./schedulerAgent");
const { monitorSchedule } = require("./monitorAgent");
const { replanSchedule } = require("./replannerAgent");
const { explainSchedule } = require("./communicatorAgent");
const Orchestrator = require("./orchestrator");

console.log("-----------------------------------------");
console.log("DeadlineGuardian Agent Integrity Verification");
console.log("-----------------------------------------");

try {
  console.log("Checking modules...");
  
  if (typeof extractDeadline !== "function") throw new Error("extractDeadline is not exported correctly.");
  console.log("✓ deadlineExtractionAgent.js loaded.");

  if (typeof planTask !== "function") throw new Error("planTask is not exported correctly.");
  console.log("✓ plannerAgent.js loaded.");

  if (typeof scheduleTasks !== "function") throw new Error("scheduleTasks is not exported correctly.");
  console.log("✓ schedulerAgent.js loaded.");

  if (typeof monitorSchedule !== "function") throw new Error("monitorSchedule is not exported correctly.");
  console.log("✓ monitorAgent.js loaded.");

  if (typeof replanSchedule !== "function") throw new Error("replanSchedule is not exported correctly.");
  console.log("✓ replannerAgent.js loaded.");

  if (typeof explainSchedule !== "function") throw new Error("explainSchedule is not exported correctly.");
  console.log("✓ communicatorAgent.js loaded.");

  const testOrchestrator = new Orchestrator("dummy-api-key");
  if (typeof testOrchestrator.handleNewDeadline !== "function") throw new Error("Orchestrator methods not exported correctly.");
  console.log("✓ orchestrator.js loaded.");

  console.log("-----------------------------------------");
  console.log("ALL AGENT MODULES INTEGRITY CHECKS: PASSED");
  console.log("-----------------------------------------");
} catch (e) {
  console.error("Agent integrity check FAILED:");
  console.error(e.message);
  process.exit(1);
}
