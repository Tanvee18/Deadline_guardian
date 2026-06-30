const { GoogleGenAI } = require("@google/genai");

/**
 * Scheduler Agent
 * Model: Gemini 2.5 Pro
 * 
 * Schedules subtasks into available free slots on the user's calendar, respecting:
 * 1. Focus hours (morning/afternoon/evening)
 * 2. Pre-existing busy calendar events
 * 3. Deadlines (must complete before the deadline)
 */
async function scheduleTasks(subtasks, deadlineDate, busyBlocks = [], preferences = {}, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key is required for scheduler agent.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define JSON response schema
  const responseSchema = {
    type: "OBJECT",
    properties: {
      schedule_blocks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { 
              type: "STRING", 
              description: "Title of the scheduled task or subtask." 
            },
            start_time: { 
              type: "STRING", 
              description: "ISO 8601 datetime string representing the start of the block." 
            },
            end_time: { 
              type: "STRING", 
              description: "ISO 8601 datetime string representing the end of the block." 
            }
          },
          required: ["title", "start_time", "end_time"]
        },
        description: "List of allocated calendar blocks for the subtasks, ordered chronologically."
      }
    },
    required: ["schedule_blocks"]
  };

  const focusHoursMapping = {
    morning: "08:00 to 12:00",
    afternoon: "13:00 to 17:00",
    evening: "18:00 to 22:00"
  };

  const selectedFocusTime = focusHoursMapping[preferences.peak_focus_hours] || "09:00 to 17:00";
  const busyBlocksContext = busyBlocks.map(b => 
    `- Busy from: ${b.start_time} to ${b.end_time} (${b.title || "Existing Event"})`
  ).join("\n");

  const prompt = `
You are the Scheduler Agent for DeadlineGuardian.
Your task is to assign specific date/time calendar slots to a list of subtasks.

Subtasks to Schedule:
${subtasks.map((s, i) => `${i + 1}. "${s.title}" (${s.estimated_minutes} mins)`).join("\n")}

Constraints & Context:
- Current Reference Time: ${new Date().toISOString()}
- Overall Task Deadline: ${deadlineDate}
- User's Preferred Peak Focus Hours: ${preferences.peak_focus_hours} (${selectedFocusTime} daily)
- Pre-existing Busy Blocks (DO NOT OVERLAP WITH THESE):
${busyBlocksContext || "None"}

Instructions:
1. Schedule the subtasks sequentially. A subtask cannot start before the previous one ends.
2. Ensure all subtasks are scheduled AFTER the Current Reference Time and completed BEFORE the Task Deadline.
3. Try to schedule blocks within the user's Preferred Peak Focus Hours. If there are no slots available in that range, you may schedule outside them, but NEVER overlap with a Pre-existing Busy Block.
4. Leave a 15-minute buffer between tasks if possible, but keep blocks consecutive if they fit better.
5. All dates and times in the output must be valid ISO 8601 strings.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
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
    console.error("Scheduler Agent error:", error);
    throw error;
  }
}

module.exports = { scheduleTasks };
