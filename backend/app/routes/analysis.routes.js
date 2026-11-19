const express = require("express");
const router = express.Router();

const requireAuth = require("../requireAuth");

const HealthFitness = require("../models/HealthFitness.model");
const MindDigitalWellbeing = require("../models/MindDigitalWellbeing.model");
const AcademicsCareerGrowth = require("../models/AcademicsCareerGrowth.model");
const LifestylePersonalGrowth = require("../models/LifestylePersonalGrowth.model");
const Goal = require("../models/Goal.model");

const {
  analyzeHealthFitnessComparison,
  analyzeCategorySuggestions,
  analyzeOverviewProjection,
  writeFutureSelfLetter,
} = require("../services/healthFitnessAnalysis.service");

// Profile categories
const profileCategories = [
  {
    id: "health-fitness",
    label: "Physical Health",
    model: HealthFitness,
    score: (doc) =>
      doc.metrics?.overallScore ??
      ratingScore(doc.fitnessConsistencyRating, doc.satisfaction),
  },
  {
    id: "mind-digital",
    label: "Mind & Digital Wellbeing",
    model: MindDigitalWellbeing,
    score: (doc) =>
      doc.metrics?.focusWellbeingScore ??
      ratingScore(doc.moodMentalEnergy?.averageMoodRating, doc.satisfaction),
  },
  {
    id: "academics-career",
    label: "Academics & Career Growth",
    model: AcademicsCareerGrowth,
    score: (doc) =>
      doc.metrics?.careerPrepScore ??
      ratingScore(doc.careerPreparation?.consistencyRating, doc.satisfaction),
  },
  {
    id: "lifestyle-growth",
    label: "Lifestyle & Personal Growth",
    model: LifestylePersonalGrowth,
    score: (doc) =>
      doc.metrics?.overallScore ??
      ratingScore(doc.personalHabits?.routineConsistency, doc.satisfaction),
  },
];

// Common helper functions
function ratingScore(...ratings) {
  const values = ratings.filter(Number.isFinite);

  return values.length
    ? Math.round(
        values.reduce((sum, value) => sum + value * 10, 0) / values.length,
      )
    : 0;
}

function toPlainProfile(doc) {
  const { _id, userId, __v, createdAt, updatedAt, ...profile } = doc;
  return profile;
}

function getScore(category, doc) {
  return Math.max(0, Math.min(100, Math.round(category.score(doc) || 0)));
}

function getErrorResponse(res, error, message) {
  console.error(message, error);

  if (error.message?.includes("OPENROUTER_API_KEY")) {
    return res.status(503).json({ message: error.message });
  }

  if (error.statusCode === 429) {
    return res
      .status(429)
      .set("Retry-After", "5")
      .json({
        message:
          "Analysis is temporarily busy. Please wait a few seconds and try again.",
      });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message:
        error.statusCode === 503
          ? "The analysis service is temporarily unavailable. Please try again shortly."
          : error.message || message,
    });
  }

  return res.status(502).json({
    message: error.message || message,
  });
}

// Profile quantities
const quantityFields = {
  "health-fitness": [
    ["Age", "age", "years"],
    ["Height", "heightCm", "cm"],
    ["Current weight", "currentWeightKg", "kg"],
    ["Target weight", "targetWeightKg", "kg"],
    ["Daily steps", "physicalActivity.dailySteps", "steps/day", true],
    ["Workouts", "physicalActivity.workoutsPerWeek", "sessions/week", true],
    [
      "Workout duration",
      "physicalActivity.averageWorkoutMinutes",
      "minutes/session",
      true,
    ],
    ["Average sleep", "sleepRoutine.averageSleepHours", "hours/night", true],
    ["Meals", "eatingHabits.mealsPerDay", "meals/day", true],
    ["Breakfast days", "eatingHabits.breakfastDaysPerWeek", "days/week", true],
    [
      "Junk or outside meals",
      "eatingHabits.junkOrOutsideMealsPerWeek",
      "meals/week",
      true,
    ],
    ["Water intake", "nutritionHydration.waterMlPerDay", "ml/day", true],
    [
      "Fruit and vegetable servings",
      "nutritionHydration.fruitVegetableServingsPerDay",
      "servings/day",
      true,
    ],
    ["Fitness consistency", "fitnessConsistencyRating", "/10", true],
    ["Satisfaction", "satisfaction", "/10"],
  ],

  "mind-digital": [
    ["Screen time", "screenTimeMinutesPerDay", "minutes/day", true],
    [
      "Social media",
      "digitalUsage.socialMediaMinutesPerDay",
      "minutes/day",
      true,
    ],
    [
      "YouTube and OTT",
      "digitalUsage.youtubeOttMinutesPerDay",
      "minutes/day",
      true,
    ],
    ["Gaming", "digitalUsage.gamingMinutesPerDay", "minutes/day", true],
    [
      "Phone before sleep",
      "digitalDistractions.phoneBeforeSleepNightsPerWeek",
      "nights/week",
      true,
    ],
    [
      "Phone after waking",
      "digitalDistractions.phoneAfterWakeNightsPerWeek",
      "days/week",
      true,
    ],
    ["Mood rating", "moodMentalEnergy.averageMoodRating", "/10"],
    ["Mental energy", "moodMentalEnergy.mentalEnergyRating", "/10"],
    ["Stress rating", "stress.rating", "/10"],
    ["Motivation", "motivationFocus.motivationRating", "/10"],
    [
      "Distraction management",
      "motivationFocus.distractionManagementRating",
      "/10",
    ],
    ["Relaxation sessions", "relaxationSessionsPerWeek", "sessions/week", true],
    ["Satisfaction", "satisfaction", "/10"],
  ],

  "academics-career": [
    ["Current grade", "academicProfile.currentGradeValue", "grade"],
    ["Target grade", "academicGoals.targetGradeValue", "grade"],
    ["Weekly study time", "metrics.weeklyStudyHours", "hours/week"],
    ["Daily study", "studyRoutine.dailyStudyHours", "hours/day", true],
    ["Attendance", "studyRoutine.attendancePct", "%", true],
    ["Assignments on time", "studyRoutine.assignmentOnTimePct", "%", true],
    [
      "DSA practice",
      "careerPreparation.dsaPracticeDaysPerWeek",
      "days/week",
      true,
    ],
    [
      "DSA problems",
      "careerPreparation.problemsSolvedPerWeek",
      "problems/week",
      true,
    ],
    [
      "Career prep consistency",
      "careerPreparation.consistencyRating",
      "/10",
      true,
    ],
    ["In-progress skills", "metrics.skillsInProgressCount", "skills"],
    ["Satisfaction", "satisfaction", "/10"],
  ],

  "lifestyle-growth": [
    ["Free time", "timeManagement.freeMinutesPerDay", "minutes/day"],
    ["Planning", "timeManagement.planningDaysPerWeek", "days/week", true],
    [
      "Procrastination",
      "timeManagement.procrastinationDaysPerWeek",
      "days/week",
      true,
    ],
    ["Routine consistency", "personalHabits.routineConsistency", "/10", true],
    ["Self-discipline", "personalHabits.selfDiscipline", "/10", true],
    ["Confidence", "personalHabits.confidence", "/10"],
    ["Monthly allowance", "financialHabits.monthlyAllowance", "currency/month"],
    ["Monthly income", "financialHabits.monthlyIncome", "currency/month"],
    [
      "Monthly savings",
      "financialHabits.monthlySavings",
      "currency/month",
      true,
    ],
    ["Monthly spending", "financialHabits.monthlySpending", "currency/month"],
    [
      "Social time",
      "socialLife.timeWithFriendsFamilyHoursPerWeek",
      "hours/week",
      true,
    ],
    ["Social satisfaction", "socialLife.socialSatisfaction", "/10"],
    [
      "Improvement time",
      "selfImprovement.availableMinutesPerWeek",
      "minutes/week",
      true,
    ],
    ["Goal progress", "metrics.averageGoalProgressPct", "%"],
    ["Satisfaction", "satisfaction", "/10"],
  ],
};

function getValue(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function currentQuantities(id, profile) {
  return (quantityFields[id] || [])
    .map(([metric, path, unit, adjustable]) => {
      const value = getValue(profile, path);

      if (value == null || !Number.isFinite(Number(value))) return null;

      let finalUnit = unit;

      if (metric === "Current grade") {
        finalUnit = `/${profile.academicProfile?.currentGradeScale || "scale"}`;
      }

      if (metric === "Target grade") {
        finalUnit = `/${profile.academicGoals?.targetGradeScale || "scale"}`;
      }

      if (path.startsWith("financialHabits.")) {
        finalUnit = `${profile.financialHabits?.currencyCode || "currency"}/month`;
      }

      return {
        metric,
        value: Number(value),
        unit: finalUnit,
        adjustable: Boolean(adjustable),
      };
    })
    .filter(Boolean);
}

// Fetch all existing profile sections
async function getProfileSections(userId) {
  const documents = await Promise.all(
    profileCategories.map(({ model }) => model.findOne({ userId }).lean()),
  );

  return profileCategories.flatMap((category, index) => {
    const doc = documents[index];

    if (!doc) return [];

    const profile = toPlainProfile(doc);

    return [
      {
        id: category.id,
        label: category.label,
        currentScore: getScore(category, doc),
        quantities: currentQuantities(category.id, profile),
        profile,
      },
    ];
  });
}

// Create suggested goals if they don't already exist
async function ensureSuggestedGoals(userId, categoryId, changes) {
  const goals = [];

  for (const change of changes) {
    const targetValue = Number(change.targetValue);

    if (!Number.isFinite(targetValue) || targetValue < 0) continue;

    let goal = await Goal.findOne({
      userId,
      categoryId,
      metric: change.metric,
      active: true,
    });

    if (!goal) {
      const unit = String(change.unit || "").trim();

      goal = await Goal.create({
        userId,
        categoryId,
        title: `${change.metric} target`,
        metric: change.metric,
        reason: String(change.reason || "").slice(0, 300),
        currentValue: Number(change.currentValue),
        targetValue,
        unit,
        frequency: /week/i.test(unit) ? "weekly" : "daily",
        source: "suggestion",
      });
    }

    goals.push(goal);
  }

  return goals;
}

// Fields accepted for Health & Fitness comparison
const profileFields = {
  age: null,
  heightCm: null,
  currentWeightKg: null,
  targetWeightKg: null,
  fitnessGoal: null,
  physicalActivity: ["dailySteps", "workoutsPerWeek", "averageWorkoutMinutes"],
  sleepRoutine: ["averageSleepHours", "bedtime", "wakeTime"],
  eatingHabits: [
    "mealsPerDay",
    "breakfastDaysPerWeek",
    "junkOrOutsideMealsPerWeek",
  ],
  nutritionHydration: [
    "waterMlPerDay",
    "fruitVegetableServingsPerDay",
    "dietaryPreference",
  ],
  fitnessConsistencyRating: null,
  satisfaction: null,
};

function pickProfile(source) {
  const profile = {};

  for (const [key, fields] of Object.entries(profileFields)) {
    if (fields === null) {
      profile[key] = source[key] ?? null;
    } else {
      profile[key] = Object.fromEntries(
        fields.map((field) => [field, source[key]?.[field] ?? null]),
      );
    }
  }

  return profile;
}

// Calculate Health & Fitness metrics
function computeMetrics(profile, savedMetrics = {}) {
  const height = Number(profile.heightCm) / 100;
  const weight = Number(profile.currentWeightKg);
  const target = Number(profile.targetWeightKg);

  const bmi =
    weight > 0 && height > 0
      ? Math.round((weight / (height * height)) * 10) / 10
      : null;

  const weightChangeKg =
    Number.isFinite(weight) &&
    Number.isFinite(target) &&
    profile.currentWeightKg != null &&
    profile.targetWeightKg != null
      ? Math.round((target - weight) * 10) / 10
      : null;

  const workouts = Number(profile.physicalActivity?.workoutsPerWeek);
  const duration = Number(profile.physicalActivity?.averageWorkoutMinutes);

  const workoutMinutesPerWeek =
    profile.physicalActivity?.workoutsPerWeek != null &&
    profile.physicalActivity?.averageWorkoutMinutes != null &&
    Number.isFinite(workouts) &&
    Number.isFinite(duration)
      ? workouts * duration
      : null;

  const fitnessRating = Number(profile.fitnessConsistencyRating);

  return {
    bmi,
    weightChangeKg,
    averageSteps: profile.physicalActivity?.dailySteps ?? null,
    workoutMinutesPerWeek,
    sleepScheduleVarianceMinutes:
      savedMetrics.sleepScheduleVarianceMinutes ?? null,
    goalAdherencePct: savedMetrics.goalAdherencePct ?? null,
    overallScore:
      profile.fitnessConsistencyRating != null && Number.isFinite(fitnessRating)
        ? Math.round(fitnessRating * 10)
        : (savedMetrics.overallScore ?? null),
    dataDays: savedMetrics.dataDays ?? 0,
    coveragePct: savedMetrics.coveragePct ?? null,
    computedAt: savedMetrics.computedAt ?? null,
  };
}

// HEALTH & FITNESS COMPARISON
router.post("/health-fitness/compare", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const savedProfile = await HealthFitness.findOne({ userId }).lean();

    const suppliedProfile = req.body?.profile ?? req.body?.current ?? req.body;

    const hasSuppliedProfile =
      suppliedProfile &&
      typeof suppliedProfile === "object" &&
      !Array.isArray(suppliedProfile) &&
      Object.keys(suppliedProfile).some(
        (key) => profileFields[key] !== undefined,
      );

    if (!hasSuppliedProfile && !savedProfile) {
      return res.status(400).json({
        message:
          "Send your Health & Fitness details in the request body or save your profile first.",
      });
    }

    const source = hasSuppliedProfile ? suppliedProfile : savedProfile;
    const current = pickProfile(source);

    const candidate = new HealthFitness({ ...current, userId });
    await candidate.validate();

    const currentMetrics = computeMetrics(current, source.metrics || {});

    const result = await analyzeHealthFitnessComparison({
      current,
      currentMetrics,
    });

    return res.json({
      model: result.model,
      current: {
        profile: current,
        metrics: currentMetrics,
        analysis: result.analysis.current,
      },
      future: result.analysis.future,
      scenario: result.analysis.scenario,
      persisted: false,
    });
  } catch (error) {
    if (["ValidationError", "CastError"].includes(error.name)) {
      return res.status(400).json({ message: error.message });
    }

    return getErrorResponse(res, error, "Health & Fitness analysis failed.");
  }
});

// FUTURE-SELF LETTER
router.post("/letter", requireAuth, async (req, res) => {
  try {
    const timeframeMonths = Number(req.body?.timeframeMonths) === 6 ? 6 : 3;

    const sections = await getProfileSections(req.user._id);

    if (!sections.length) {
      return res.status(404).json({
        message:
          "Complete at least one profile area before asking your future self to write a letter.",
      });
    }

    const goals = await Goal.find({ userId: req.user._id }).lean();

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 29);

    function dateKey(value) {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
      }

      const date = value ? new Date(value) : null;

      if (!date || Number.isNaN(date.getTime())) return null;

      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
    }

    const recentCompletions = goals.flatMap((goal) =>
      (goal.logs || [])
        .filter((log) => log.completed !== false)
        .map((log) => dateKey(log.date || log.completedAt))
        .filter(
          (day) => day && day >= dateKey(windowStart) && day <= dateKey(now),
        ),
    );

    const activeGoals = goals.filter((goal) => goal.active !== false);

    const expectedCheckIns = activeGoals.reduce((total, goal) => {
      const createdAt = goal.createdAt ? new Date(goal.createdAt) : windowStart;

      const start = new Date(
        Math.max(windowStart.getTime(), createdAt.getTime()),
      );

      start.setHours(0, 0, 0, 0);

      const activeDays = Math.max(
        1,
        Math.floor((today - start) / 86400000) + 1,
      );

      return (
        total +
        (goal.frequency === "weekly" ? Math.ceil(activeDays / 7) : activeDays)
      );
    }, 0);

    const activitySummary = {
      windowDays: 30,
      completedActivities: recentCompletions.length,
      activeGoals: activeGoals.length,
      activeDays: new Set(recentCompletions).size,
      consistencyPercent:
        expectedCheckIns > 0 && recentCompletions.length
          ? Math.min(
              100,
              Math.round((recentCompletions.length / expectedCheckIns) * 100),
            )
          : null,
      consistencyNote: recentCompletions.length
        ? "Consistency is estimated from completed goal check-ins compared with active goal frequency over the last 30 days."
        : "No completed goal check-ins were recorded in the last 30 days, so consistency cannot be estimated yet.",
    };

    const result = await writeFutureSelfLetter({
      timeframeMonths,
      sections,
      activitySummary,
    });

    return res.json({
      model: result.model,
      letter: result.analysis,
      timeframeMonths,
      activitySummary,
      profileAreas: sections.map(({ id, label }) => ({ id, label })),
      disclaimer:
        "A hopeful reflection based on your current check-in, not a prediction of what will happen.",
    });
  } catch (error) {
    return getErrorResponse(
      res,
      error,
      "The letter service could not complete this request.",
    );
  }
});

// OVERALL PROGRESS OVERVIEW
router.post("/overview", requireAuth, async (req, res) => {
  try {
    const sections = await getProfileSections(req.user._id);

    if (!sections.length) {
      return res.status(404).json({
        message:
          "Complete at least one profile area before requesting an overview.",
      });
    }

    const baselineScore = Math.round(
      sections.reduce((sum, section) => sum + section.currentScore, 0) /
        sections.length,
    );

    const analysisSections = sections.map(
      ({ id, label, currentScore, quantities }) => ({
        id,
        label,
        currentScore,
        quantities,
      }),
    );

    const result = await analyzeOverviewProjection({
      baselineScore,
      sections: analysisSections,
    });

    const expectedWeeks = [0, 2, 4, 6, 8];
    const expectedMonths = [0, 3, 6, 12, 24, 36, 48, 60];

    const trajectoryMap = new Map(
      (result.analysis.trajectory || []).map((point) => [
        Number(point.week),
        point,
      ]),
    );

    const longTermMap = new Map(
      (result.analysis.longTermTrajectory || []).map((point) => [
        Number(point.month),
        point,
      ]),
    );

    // Check that the AI returned all required points.
    for (const week of expectedWeeks) {
      const point = trajectoryMap.get(week);

      if (
        !point ||
        !Number.isFinite(Number(point.currentScore)) ||
        !Number.isFinite(Number(point.guidelineScore))
      ) {
        throw new Error(
          "The overview model returned an incomplete projection. Please retry.",
        );
      }
    }

    for (const month of expectedMonths) {
      const point = longTermMap.get(month);

      if (
        !point ||
        !Number.isFinite(Number(point.currentScore)) ||
        !Number.isFinite(Number(point.guidelineScore)) ||
        typeof point.currentSummary !== "string" ||
        !point.currentSummary.trim() ||
        typeof point.guidelineSummary !== "string" ||
        !point.guidelineSummary.trim()
      ) {
        throw new Error(
          "The overview model returned an incomplete long-range projection. Please retry.",
        );
      }
    }

    function limitScore(value) {
      return Math.round(Math.max(0, Math.min(100, Number(value))));
    }

    const trajectory = expectedWeeks.map((week) => {
      const point = trajectoryMap.get(week);

      return {
        week,
        currentScore:
          week === 0 ? baselineScore : limitScore(point.currentScore),
        guidelineScore:
          week === 0 ? baselineScore : limitScore(point.guidelineScore),
      };
    });

    const longTermTrajectory = expectedMonths.map((month) => {
      const point = longTermMap.get(month);

      return {
        month,
        currentScore:
          month === 0 ? baselineScore : limitScore(point.currentScore),
        guidelineScore:
          month === 0 ? baselineScore : limitScore(point.guidelineScore),
        currentSummary: point.currentSummary.trim(),
        guidelineSummary: point.guidelineSummary.trim(),
      };
    });

    return res.json({
      model: result.model,
      timeHorizonWeeks: 8,
      timeHorizonMonths: 60,
      baselineScore,

      sections: sections.map(({ id, label, currentScore }) => ({
        id,
        label,
        currentScore,
      })),

      currentPath: {
        label: "If your current patterns continue",
        summary: result.analysis.currentSummary,
        startScore: baselineScore,
        projectedScore: trajectory[trajectory.length - 1].currentScore,
      },

      guidelinePath: {
        label: "If you follow these guidelines",
        summary: result.analysis.guidelineSummary,
        startScore: baselineScore,
        projectedScore: trajectory[trajectory.length - 1].guidelineScore,
        guidelines: result.analysis.guidelines || [],
      },

      trajectory,
      longTermTrajectory,
      confidence: result.analysis.confidence,
      keyInsights: result.analysis.keyInsights || [],
      assumptions: result.analysis.assumptions || [],

      disclaimer:
        "These are illustrative scenarios based on your current check-in, not measured forecasts. Outcomes vary with consistency and other factors.",
    });
  } catch (error) {
    return getErrorResponse(
      res,
      error,
      "The overview analysis provider could not complete this request.",
    );
  }
});

// INDIVIDUAL CATEGORY SUGGESTIONS
router.post("/category/:categoryId", requireAuth, async (req, res) => {
  const category = profileCategories.find(
    (item) => item.id === req.params.categoryId,
  );

  if (!category) {
    return res.status(404).json({ message: "Unknown profile section." });
  }

  try {
    const document = await category.model
      .findOne({ userId: req.user._id })
      .lean();

    if (!document) {
      return res.status(404).json({
        message: `Save your ${category.label} section before requesting a comparison.`,
      });
    }

    const profile = toPlainProfile(document);
    const currentScore = getScore(category, document);
    const quantities = currentQuantities(category.id, profile);

    const result = await analyzeCategorySuggestions({
      id: category.id,
      label: category.label,
      profile,
      quantities,
    });

    // Match AI suggestions with actual profile values.
    const changes = (result.analysis.changes || [])
      .map((change) => {
        const actual = quantities.find(
          (item) =>
            item.metric.toLowerCase() === change.metric.trim().toLowerCase(),
        );

        return actual
          ? { ...change, currentValue: actual.value, unit: actual.unit }
          : null;
      })
      .filter(Boolean);

    const goals = await ensureSuggestedGoals(
      req.user._id,
      category.id,
      changes,
    );

    return res.json({
      model: result.model,
      categoryId: category.id,
      categoryLabel: category.label,

      current: {
        overallScore: currentScore,
        categories: [
          {
            id: category.id,
            label: category.label,
            score: currentScore,
            quantities,
          },
        ],
      },

      future: {
        overallScore: result.analysis.score,
        categories: [
          {
            id: category.id,
            label: category.label,
            score: result.analysis.score,
            summary: result.analysis.summary,
            changes,
          },
        ],
      },

      goals: goals.map((goal) => ({
        id: goal._id,
        title: goal.title,
        metric: goal.metric,
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        unit: goal.unit,
        frequency: goal.frequency,
      })),

      timeHorizon: result.analysis.timeHorizon,
      confidence: result.analysis.confidence,
      keyInsights: result.analysis.keyInsights,
      limits: result.analysis.limits,
      persisted: false,
    });
  } catch (error) {
    return getErrorResponse(res, error, `${category.label} analysis failed.`);
  }
});

module.exports = router;
