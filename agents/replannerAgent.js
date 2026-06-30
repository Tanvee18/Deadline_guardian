const { GoogleGenAI } = require("@google/genai");

/**
 * Replanner Agent
 * Model: Gemini 2.5 Pro
 * 
 * Invoked when schedule drift is detected. Reschedules missed and remaining planned task blocks 
 * into future free slots, preserving deadlines and minimizing disruption.
 */
async function replanSchedule(remainingSubtasks, deadlineDate, busyBlocks = [], preferences = {}, driftEvent = {}, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key is required for replanner agent.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define JSON response schema
  const responseSchema = {
    type: "OBJECT",
    properties: {
      updated_schedule: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { 
              type: "STRING", 
              description: "Title of the task block." 
            },
            start_time: { 
              type: "STRING", 
              description: "ISO 8601 datetime representing the rescheduled start time." 
            },
            end_time: { 
              type: "STRING", 
              description: "ISO 8601 datetime representing the rescheduled end time." 
            }
          },
          required: ["title", "start_time", "end_time"]
        },
        description: "The newly generated, non-overlapping chronological list of schedule blocks."
      }
    },
    required: ["updated_schedule"]
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
You are the Replanner Agent for DeadlineGuardian.
Your job is to rebuild the schedule because the user has drifted from their plan.

Drift Incident:
- Severity: ${driftEvent.severity} / 10
- Reason for reschedule: "${driftEvent.reason}"

Remaining Work to Schedule:
${remainingSubtasks.map((s, i) => `${i + 1}. "${s.title}" (${s.estimated_minutes || 60} mins)`).join("\n")}

Constraints & Context:
- Current Reference Time (Reschedule AFTER this): ${new Date().toISOString()}
- Parent Deadline: ${deadlineDate}
- User's Peak Focus Hours: ${preferences.peak_focus_hours} (${selectedFocusTime} daily)
- Pre-existing Busy Blocks (DO NOT OVERLAP):
${busyBlocksContext || "None"}

Instructions:
1. Shift the remaining subtasks to future open slots starting AFTER the Current Reference Time.
2. Ensure they are completed before the Task Deadline.
3. Align them with focus hours as much as possible, leaving a 15-minute buffer.
4. Try to keep changes minimal—do not push tasks further out than necessary.
5. All dates/times in output must be valid ISO 8601 strings.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Replanner Agent error:", error);
    throw error;
  }
}

module.exports = { replanSchedule };
