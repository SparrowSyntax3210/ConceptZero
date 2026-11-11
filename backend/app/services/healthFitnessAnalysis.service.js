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

const categorySuggestionFormat = {
  type: "json_schema",
  json_schema: {
    name: "stacked_category_suggestions",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "timeHorizon",
        "confidence",
        "score",
        "summary",
        "changes",
        "keyInsights",
        "limits",
      ],
      properties: {
        timeHorizon: { type: "string" },
        confidence: { type: "string", enum: ["low", "moderate", "high"] },
        score: { type: "number", minimum: 0, maximum: 100 },
        summary: { type: "string" },
        changes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "metric",
              "currentValue",
              "targetValue",
              "unit",
              "reason",
            ],
            properties: {
              metric: { type: "string" },
              currentValue: { type: "number" },
              targetValue: { type: "number" },
              unit: { type: "string" },
              reason: { type: "string" },
            },
          },
        },
        keyInsights: { type: "array", items: { type: "string" } },
        limits: { type: "array", items: { type: "string" } },
      },
    },
  },
};

async function analyzeCategorySuggestions(category) {
  const messages = [
    {
      role: "system",
      content:
        "You are a supportive personal growth coach. Analyze only the single STACKED profile category provided. Return practical, conservative suggested target quantities for the next 8 weeks. Only suggest metrics with adjustable=true, copy each selected metric label exactly, and only return a change when it has a numeric current value. Do not suggest changing fixed facts, grades, self-reported satisfaction, mood, stress, or confidence ratings. Use the current quantity and unit exactly as supplied; do not invent a current measurement or guarantee an outcome. Return a section-specific score from 0 to 100 as an estimate based only on this section's supplied data. Include at most three measurable changes. If this section has too little data for suggestions, return an empty changes array and state what is missing in summary or keyInsights. Do not refer to other profile sections. Do not diagnose or give medical advice. Return only the requested JSON.",
    },
    { role: "user", content: JSON.stringify(category) },
  ];
  return createChatCompletion({
    messages,
    responseFormat: categorySuggestionFormat,
    temperature: 0.2,
  });
}

const overviewProjectionFormat = {
  type: "json_schema",
  json_schema: {
    name: "stacked_overview_projection",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "confidence",
        "currentSummary",
        "guidelineSummary",
        "trajectory",
        "guidelines",
        "keyInsights",
        "assumptions",
      ],
      properties: {
        confidence: { type: "string", enum: ["low", "moderate", "high"] },
        currentSummary: { type: "string" },
        guidelineSummary: { type: "string" },
        trajectory: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["week", "currentScore", "guidelineScore"],
            properties: {
              week: { type: "integer", minimum: 0, maximum: 8 },
              currentScore: { type: "number", minimum: 0, maximum: 100 },
              guidelineScore: { type: "number", minimum: 0, maximum: 100 },
            },
          },
        },
        guidelines: { type: "array", items: { type: "string" } },
        keyInsights: { type: "array", items: { type: "string" } },
        assumptions: { type: "array", items: { type: "string" } },
      },
    },
  },
};

async function analyzeOverviewProjection(input) {
  const messages = [
    {
      role: "system",
      content:
        "You are STACKED's cautious personal-growth analyst. Compare two illustrative 8-week scenarios using only the supplied completed profile areas, quantities, scores, and baselineScore. Scenario one asks what may happen if the person's current patterns continue. Scenario two asks what may happen if they follow the practical guidelines you suggest. Distinguish user-reported facts from estimates. Do not diagnose, give medical advice, promise outcomes, or imply these values are measured forecasts. Keep changes modest and uncertainty explicit. Return exactly five trajectory points for weeks 0, 2, 4, 6, and 8; week 0 must equal baselineScore for both paths. A guided path may improve only where the supplied data supports a practical change. The current path may remain flat if there is no basis to infer direction. Do not penalize a person without evidence. Make guidelines specific, low-risk, and optional. State that results depend on consistency and other factors. Return only the requested JSON.",
    },
    { role: "user", content: JSON.stringify(input) },
  ];
  return createChatCompletion({
    messages,
    responseFormat: overviewProjectionFormat,
    temperature: 0.15,
  });
}

const futureSelfLetterFormat = {
  type: "json_schema",
  json_schema: {
    name: "stacked_future_self_letter",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "greeting", "paragraphs", "signoff", "futureSelfLabel", "groundingNote"],
      properties: {
        subject: { type: "string" },
        greeting: { type: "string" },
        paragraphs: { type: "array", items: { type: "string" } },
        signoff: { type: "string" },
        futureSelfLabel: { type: "string" },
        groundingNote: { type: "string" },
      },
    },
  },
};

async function writeFutureSelfLetter(input) {
  const messages = [
    {
      role: "system",
      content:
        "Write a short, warm, believable letter from a possible future version of the person to their present self. The future self has followed practical, gentle STACKED guidelines consistently and is grateful for the small choices that helped. Use only the profile facts and suggested guidelines supplied; do not invent events, relationships, achievements, health outcomes, or exact future results. Refer to the future as an imagined possibility, never a promise. Keep it personal but subtle, encouraging without pressure or shame, around 140–190 words, with 3–5 paragraphs. The letter should sound like a human writing to themselves, not an AI report. Add a brief grounding note outside the letter explaining that this is an imaginative reflection, not a prediction. Return only the requested JSON.",
    },
    { role: "user", content: JSON.stringify(input) },
  ];
  return createChatCompletion({
    messages,
    responseFormat: futureSelfLetterFormat,
    temperature: 0.65,
  });
}

module.exports = {
  analyzeHealthFitnessComparison,
  analyzeCategorySuggestions,
  analyzeOverviewProjection,
  writeFutureSelfLetter,
};
