const { GoogleGenAI } = require("@google/genai");

/**
 * Monitor Agent
 * Model: Gemini 2.5 Flash
 * 
 * Runs checks on current schedule blocks to detect if:
 * 1. A planned block was missed (end_time passed but not marked completed)
 * 2. Remaining task durations exceed the time left until the deadline
 * Outputs a drift flag, severity rating (1-10), and reason.
 */
async function monitorSchedule(scheduleBlocks, tasks, deadlines, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key is required for monitor agent.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define JSON response schema
  const responseSchema = {
    type: "OBJECT",
    properties: {
      drift_detected: { 
        type: "BOOLEAN", 
        description: "True if a planned block was missed, if we are running behind, or if a deadline is in jeopardy." 
      },
      severity: { 
        type: "INTEGER", 
        description: "Severity rating from 1 to 10. 1 is negligible; 10 means the deadline is guaranteed to be missed unless immediate action is taken." 
      },
      reason: { 
        type: "STRING", 
        description: "Short descriptive reason explaining why the drift was flagged." 
      }
    },
    required: ["drift_detected", "severity", "reason"]
  };

  const scheduleBlocksContext = scheduleBlocks.map(b => {
    const parentTask = tasks.find(t => t.id === b.task_id);
    const parentDeadline = parentTask ? deadlines.find(d => d.id === parentTask.deadline_id) : null;
    return `- Block: "${b.title || parentTask?.title || "Focus Block"}" 
    Start: ${b.start_time}
    End: ${b.end_time}
    Status: ${b.status}
    Deadline: ${parentDeadline ? `${parentDeadline.title} due on ${parentDeadline.due_at}` : "None"}`;
  }).join("\n");

  const prompt = `
You are the Monitor Agent for DeadlineGuardian.
Your job is to inspect the user's schedule blocks and determine if they have fallen behind (drifted).

Current Reference Time: ${new Date().toISOString()}

Schedule Blocks:
${scheduleBlocksContext || "None"}

Instructions:
1. Examine if any block has an "end_time" that has passed, but its "status" is still "planned" (this indicates it was MISSED).
2. Look at the remaining planned blocks and their parent deadlines. Check if the remaining time between NOW and the deadline is too short to fit the remaining planned work.
3. If drift is detected: set "drift_detected" to true, assess the "severity" (1 to 10), and write a clear "reason" (e.g. "User missed the 2:00 PM focus block for draft writing").
4. If everything is on track: set "drift_detected" to false, "severity" to 0 (or 1), and "reason" to "On track".
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Monitor Agent error:", error);
    throw error;
  }
}

module.exports = { monitorSchedule };
