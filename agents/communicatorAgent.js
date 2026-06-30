const { GoogleGenAI } = require("@google/genai");

/**
 * Communicator Agent
 * Model: Gemini 2.5 Flash
 * 
 * Generates natural language reasoning explaining "Why this plan?" or explaining schedule shifts
 * after a replanning event occurred.
 */
async function explainSchedule(scheduleBlocks, deadlines, driftEvent = null, replanLog = null, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key is required for communicator agent.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define JSON response schema (abides by global JSON-only constraint)
  const responseSchema = {
    type: "OBJECT",
    properties: {
      explanation: { 
        type: "STRING", 
        description: "A detailed paragraph explaining why the schedule is set up this way, referencing focus hours, deadline proximity, and any recent shifts." 
      },
      spoken_text: { 
        type: "STRING", 
        description: "A concise, conversational 1-2 sentence version of the explanation, perfect for Text-to-Speech (TTS) reading." 
      }
    },
    required: ["explanation", "spoken_text"]
  };

  let eventContext = "";
  if (driftEvent && replanLog) {
    eventContext = `
A schedule adjustment just occurred!
- Reason for adjustment: "${driftEvent.reason}"
- Severity: ${driftEvent.severity} / 10
- Rescheduling Action: Adjusted remaining task blocks to minimize conflict.
`;
  }

  const prompt = `
You are the Communicator Agent for DeadlineGuardian.
Your job is to translate complex schedule arrangements and agent decisions into a supportive, human-friendly explanation.

Context:
- Today's Scheduled Blocks:
${scheduleBlocks.map(b => `- "${b.title}" (${b.start_time} to ${b.end_time}) [Status: ${b.status}]`).join("\n")}
- Active Deadlines:
${deadlines.map(d => `- "${d.title}" due on ${d.due_at} (Priority: ${d.priority})`).join("\n")}
${eventContext}

Instructions:
1. Explain "Why this schedule exists" clearly and Empathetically.
2. If a rescheduling event just happened, explain what changed, why it changed, and how it protects their upcoming deadlines.
3. Be professional, clear, and reassuring. Do not sound like a machine.
4. Output must match the specified JSON schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7 // slightly higher temperature for natural, friendly phrasing
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Communicator Agent error:", error);
    throw error;
  }
}

module.exports = { explainSchedule };
