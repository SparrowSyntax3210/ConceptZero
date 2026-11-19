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
        summary: { type: "string", maxLength: 150 },
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
              reason: { type: "string", maxLength: 150 },
            },
          },
        },
        keyInsights: { type: "array", maxItems: 3, items: { type: "string", maxLength: 110 } },
        limits: { type: "array", maxItems: 3, items: { type: "string", maxLength: 110 } },
      },
    },
  },
};

const overviewCache = new Map();
const overviewRequests = new Map();
const OVERVIEW_CACHE_MS = 10 * 60 * 1000;

async function analyzeCategorySuggestions(category) {
  const messages = [
    {
      role: "system",
      content:
        "You are a supportive personal growth coach. Analyze only the single STACKED profile category provided. Return practical, conservative suggested target quantities for the next 8 weeks. Only suggest metrics with adjustable=true, copy each selected metric label exactly, and only return a change when it has a numeric current value. Do not suggest changing fixed facts, grades, self-reported satisfaction, mood, stress, or confidence ratings. Use the current quantity and unit exactly as supplied; do not invent a current measurement or guarantee an outcome. Return a section-specific score from 0 to 100 as an estimate based only on this section's supplied data. Include at most three measurable changes. Make summary one concise sentence (max 20 words), not a report of every field. Keep each key insight and change reason short and scannable (one sentence, max 16 words). If this section has too little data for suggestions, return an empty changes array and state what is missing in summary or keyInsights. Do not refer to other profile sections. Do not diagnose or give medical advice. Return only the requested JSON.",
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
  // Future page reloads should reuse the same projection while the saved
  // profile stays the same. This also prevents duplicate simultaneous calls.
  const cacheKey = JSON.stringify(input);
  const cached = overviewCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const existingRequest = overviewRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const messages = [
    {
      role: "system",
      content:
        "You are STACKED's cautious personal-growth analyst. Use only the supplied scores and numeric quantities. Return compact JSON with exactly 5 short-term points (weeks 0,2,4,6,8) and 8 longTermTrajectory points (months 0,3,6,12,24,36,48,60). At month/week 0 both scores equal baselineScore. Scores are illustrative wellbeing indices, not measured forecasts. Estimate each path independently from the evidence: keep a score unchanged when there is no credible reason for movement; plateaus are normal. Do not force every checkpoint to have a different score, do not add one point merely to make values unique, and do not create smooth monotonic improvement/decline. Use small, non-linear, conservative changes only when supported; guideline path may improve gradually but can plateau, and current path may stay stable or vary modestly. Avoid false precision and make uncertainty clear. At each long-term checkpoint, write a distinct, gentle day-to-day reflection (max 12 words each) about how routines might feel, using conditional language such as may/could. Ground it in supplied profile and guidelines; do not claim to know the person's actual feelings. Keep distant checkpoints especially general. Do not diagnose, give medical advice, or promise results. Provide at most 2 short guidelines, 2 key insights, and 1 assumption. Return only the JSON.",
    },
    { role: "user", content: JSON.stringify(input) },
  ];
  const request = createChatCompletion({
    messages,
    responseFormat: overviewProjectionFormat,
    temperature: 0.15,
    maxTokens: 2400,
  }).then((result) => {
    overviewCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + OVERVIEW_CACHE_MS,
    });
    if (overviewCache.size > 100) {
      const oldestKey = overviewCache.keys().next().value;
      overviewCache.delete(oldestKey);
    }
    return result;
  }).finally(() => {
    overviewRequests.delete(cacheKey);
  });
  overviewRequests.set(cacheKey, request);
  return request;
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
