const { GoogleGenAI } = require("@google/genai");

/**
 * Deadline Extraction Agent
 * Model: Gemini 2.5 Flash
 * 
 * Extracts tasks, due dates, and priority levels from text inputs (emails, manual entries).
 * Compares against existing active deadlines to perform semantic conflict detection.
 */
async function extractDeadline(text, source, existingDeadlines = [], apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key is required for extraction agent.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define the JSON response schema for Gemini
  const responseSchema = {
    type: "OBJECT",
    properties: {
      task: { 
        type: "STRING", 
        description: "The title of the task being extracted." 
      },
      due_date: { 
        type: "STRING", 
        description: "The due date of the task, formatted as an ISO 8601 string. If no year is specified, assume 2026. If no time is specified, assume 17:00:00 (5 PM)." 
      },
      priority: { 
        type: "STRING", 
        enum: ["low", "medium", "high"], 
        description: "The priority of the task." 
      },
      conflict: { 
        type: "BOOLEAN", 
        description: "Set to true if this task refers to one of the existing deadlines listed but has a different due date. Set to false if it is a brand new task or if the due date matches." 
      },
      candidates: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            due_date: { type: "STRING", description: "ISO 8601 date string" },
            source: { type: "STRING", description: "Where this date came from (e.g. 'existing' or 'inbound')" }
          },
          required: ["due_date", "source"]
        },
        description: "List of conflicting deadlines if conflict is true, containing the existing date and the new date."
      }
    },
    required: ["task", "due_date", "priority", "conflict"]
  };

  // Build the prompt containing existing deadlines context
  const existingDeadlinesContext = existingDeadlines.map(d => 
    `- Task: "${d.title}", Due: "${d.due_at}", Priority: "${d.priority}"`
  ).join("\n");

  const prompt = `
You are the Deadline Extraction Agent for DeadlineGuardian.
Analyze the following input text to extract the task name, due date, and priority.

User's Existing Deadlines:
${existingDeadlinesContext || "None"}

Inbound Text Source: ${source}
Inbound Text:
"${text}"

Current Reference Time: ${new Date().toISOString()}

Instructions:
1. Extract the task title, due date (ISO string), and priority level (low/medium/high).
2. Perform conflict detection: Compare the extracted task with the list of existing deadlines. If it represents the SAME task semantically but the due dates do NOT match, set "conflict" to true and populate the "candidates" array with both the existing date and the new date. Otherwise set "conflict" to false.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1 // Low temperature for high precision extraction
      }
    });

    const result = JSON.parse(response.text);
    // Force set source in result
    result.source = source;
    return result;
  } catch (error) {
    console.error("Deadline Extraction Agent error:", error);
    throw error;
  }
}

module.exports = { extractDeadline };
