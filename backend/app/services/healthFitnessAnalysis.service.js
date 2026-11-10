const { createChatCompletion } = require("./openrouter.service");

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "health_fitness_scenario",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["current", "future", "scenario"],
      properties: {
        current: {
          type: "object",
          additionalProperties: false,
          required: ["summary", "positiveSignals", "focusAreas"],
          properties: {
            summary: { type: "string" },
            positiveSignals: { type: "array", items: { type: "string" } },
            focusAreas: { type: "array", items: { type: "string" } },
          },
        },
        future: {
          type: "object",
          additionalProperties: false,
          required: ["summary", "likelyChanges", "focusAreas"],
          properties: {
            summary: { type: "string" },
            likelyChanges: { type: "array", items: { type: "string" } },
            focusAreas: { type: "array", items: { type: "string" } },
          },
        },
        scenario: {
          type: "object",
          additionalProperties: false,
          required: ["timeHorizon", "assumptions", "confidence", "limits"],
          properties: {
            timeHorizon: { type: "string" },
            assumptions: { type: "array", items: { type: "string" } },
            confidence: { type: "string", enum: ["low", "moderate", "high"] },
            limits: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
};

async function analyzeHealthFitnessComparison({ current, currentMetrics }) {
  const messages = [
    {
      role: "system",
      content:
        "You are given a person's complete current Health & Fitness profile and derived metrics. Return an analysis of their current state and a separate qualitative projection of likely future changes based on the profile. Infer a sensible time horizon and state your assumptions. Use all supplied profile fields and metrics, distinguishing measured/self-reported facts from inference. Do not invent current values, exact future metric values, or claim certainty: this is a single snapshot with no time-series history, so keep confidence low or moderate and explain uncertainty. You may describe plausible directions and patterns, but do not diagnose, give medical advice, or create an exercise, diet, or sleep routine. Treat BMI as a rough informational calculation, not a diagnosis. Keep output concise, supportive, and grounded only in supplied data. Return only the requested JSON structure.",
    },
    {
      role: "user",
      content: JSON.stringify({ current, currentMetrics }),
    },
  ];

  return createChatCompletion({ messages, responseFormat });
}

module.exports = { analyzeHealthFitnessComparison };
