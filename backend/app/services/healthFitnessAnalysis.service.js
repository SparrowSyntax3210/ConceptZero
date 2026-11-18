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
        "longTermTrajectory",
        "guidelines",
        "keyInsights",
        "assumptions",
      ],
      properties: {
        confidence: { type: "string", enum: ["low", "moderate", "high"] },
        currentSummary: { type: "string", maxLength: 150 },
        guidelineSummary: { type: "string", maxLength: 150 },
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
        longTermTrajectory: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "month",
              "currentScore",
              "guidelineScore",
              "currentSummary",
              "guidelineSummary",
            ],
            properties: {
              month: { type: "integer", minimum: 0, maximum: 60 },
              currentScore: { type: "number", minimum: 0, maximum: 100 },
              guidelineScore: { type: "number", minimum: 0, maximum: 100 },
              currentSummary: { type: "string", maxLength: 150 },
              guidelineSummary: { type: "string", maxLength: 150 },
            },
          },
        },
        guidelines: {
          type: "array",
          maxItems: 3,
          items: { type: "string", maxLength: 110 },
        },
        keyInsights: {
          type: "array",
          maxItems: 3,
          items: { type: "string", maxLength: 110 },
        },
        assumptions: {
          type: "array",
          maxItems: 2,
          items: { type: "string", maxLength: 110 },
        },
      },
    },
  },
};

async function analyzeOverviewProjection(input) {
  const messages = [
    {
      role: "system",
      content:
        "You are STACKED's cautious personal-growth analyst. Use only the supplied scores and numeric quantities. Return compact JSON with exactly 5 short-term points (weeks 0,2,4,6,8) and 8 longTermTrajectory points (months 0,3,6,12,24,36,48,60). At month/week 0 both scores equal baselineScore. Every long-term point must contain a different concise currentSummary and guidelineSummary (max 12 words each) specific to that month. Give each path a distinct score at each visible checkpoint; keep changes small, conservative, and flattening over time. Never extrapolate short-term gains linearly or invent large changes. Use modest one-point changes when evidence is sparse and make uncertainty clear. Do not diagnose, give medical advice, or promise results. Provide at most 2 short guidelines, 2 key insights, and 1 assumption. Return only the JSON.",
    },
    { role: "user", content: JSON.stringify(input) },
  ];
  return createChatCompletion({
    messages,
    responseFormat: overviewProjectionFormat,
    temperature: 0.15,
    maxTokens: 2400,
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
        "Write a detailed, warm, believable letter from a possible future version of the person to their present self, set about the requested timeframe (3 or 6 months). Personalize it using the supplied profile sections and the activitySummary. Mention the real completed activity count and consistency only when consistencyPercent is available; otherwise be honest that there is not enough logged activity yet and encourage a gentle start. Distinguish completed activities from active goals, and never invent logs, events, relationships, achievements, health outcomes, or exact future results. Describe the future as an imagined possibility that depends on continued choices, never a promise or medical prediction. Use 4–6 meaningful paragraphs and about 220–300 words so the letter feels more substantial. Keep a human, personal voice rather than an AI report, and avoid pressure or shame. The groundingNote should briefly explain that this is an imaginative reflection based on profile and recent activity data, not a prediction. Return only the requested JSON.",
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
