const { GoogleGenAI } = require("@google/genai");

/**
 * Planner Agent
 * Model: Gemini 2.5 Pro
 * 
 * Takes an overall task and due date, decomposes it into detailed sequential subtasks,
 * and estimates the duration for each.
 */
async function planTask(taskTitle, dueDate, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key is required for planner agent.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define the JSON response schema for Gemini
  const responseSchema = {
    type: "OBJECT",
    properties: {
      subtasks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { 
              type: "STRING", 
              description: "Actionable title of the subtask. Use clear verbs." 
            },
            estimated_minutes: { 
              type: "INTEGER", 
              description: "Reasonable estimate in minutes to complete this specific subtask (e.g. 30, 45, 60, 90)." 
            }
          },
          required: ["title", "estimated_minutes"]
        },
        description: "The list of subtasks ordered chronologically from first step to final completion step."
      }
    },
    required: ["subtasks"]
  };

  const prompt = `
You are the Planner Agent for DeadlineGuardian.
Your job is to break down the following high-level task into a set of sequential, realistic subtasks. 
Estimate the duration (in minutes) for each subtask.

Task to plan: "${taskTitle}"
Due Date: ${dueDate}
Current Reference Time: ${new Date().toISOString()}

Instructions:
1. Provide a step-by-step breakdown (3 to 6 subtasks usually).
2. Estimates should be realistic (no subtask should be more than 120 minutes; break longer steps down).
3. The subtasks must be sorted in the order they should be executed.
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
    console.error("Planner Agent error:", error);
    throw error;
  }
}

module.exports = { planTask };
