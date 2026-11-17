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

function ratingScore(...ratings) {
  const values = ratings.filter((value) => Number.isFinite(value));
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

function addQuantity(list, metric, value, unit, adjustable = false) {
  if (value == null || !Number.isFinite(Number(value))) return;
  list.push({ metric, value: Number(value), unit, adjustable });
}

function currentQuantities(id, profile) {
  const values = [];
  if (id === "health-fitness") {
    addQuantity(values, "Age", profile.age, "years");
    addQuantity(values, "Height", profile.heightCm, "cm");
    addQuantity(values, "Current weight", profile.currentWeightKg, "kg");
    addQuantity(values, "Target weight", profile.targetWeightKg, "kg");
    addQuantity(
      values,
      "Daily steps",
      profile.physicalActivity?.dailySteps,
      "steps/day",
      true,
    );
    addQuantity(
      values,
      "Workouts",
      profile.physicalActivity?.workoutsPerWeek,
      "sessions/week",
      true,
    );
    addQuantity(
      values,
      "Workout duration",
      profile.physicalActivity?.averageWorkoutMinutes,
      "minutes/session",
      true,
    );
    addQuantity(
      values,
      "Average sleep",
      profile.sleepRoutine?.averageSleepHours,
      "hours/night",
      true,
    );
    addQuantity(
      values,
      "Meals",
      profile.eatingHabits?.mealsPerDay,
      "meals/day",
      true,
    );
    addQuantity(
      values,
      "Breakfast days",
      profile.eatingHabits?.breakfastDaysPerWeek,
      "days/week",
      true,
    );
    addQuantity(
      values,
      "Junk or outside meals",
      profile.eatingHabits?.junkOrOutsideMealsPerWeek,
      "meals/week",
      true,
    );
    addQuantity(
      values,
      "Water intake",
      profile.nutritionHydration?.waterMlPerDay,
      "ml/day",
      true,
    );
    addQuantity(
      values,
      "Fruit and vegetable servings",
      profile.nutritionHydration?.fruitVegetableServingsPerDay,
      "servings/day",
      true,
    );
    addQuantity(
      values,
      "Fitness consistency",
      profile.fitnessConsistencyRating,
      "/10",
      true,
    );
    addQuantity(values, "Satisfaction", profile.satisfaction, "/10");
  } else if (id === "mind-digital") {
    addQuantity(
      values,
      "Screen time",
      profile.screenTimeMinutesPerDay,
      "minutes/day",
      true,
    );
    addQuantity(
      values,
      "Social media",
      profile.digitalUsage?.socialMediaMinutesPerDay,
      "minutes/day",
      true,
    );
    addQuantity(
      values,
      "YouTube and OTT",
      profile.digitalUsage?.youtubeOttMinutesPerDay,
      "minutes/day",
      true,
    );
    addQuantity(
      values,
      "Gaming",
      profile.digitalUsage?.gamingMinutesPerDay,
      "minutes/day",
      true,
    );
    addQuantity(
      values,
      "Phone before sleep",
      profile.digitalDistractions?.phoneBeforeSleepNightsPerWeek,
      "nights/week",
      true,
    );
    addQuantity(
      values,
      "Phone after waking",
      profile.digitalDistractions?.phoneAfterWakeNightsPerWeek,
      "days/week",
      true,
    );
    addQuantity(
      values,
      "Mood rating",
      profile.moodMentalEnergy?.averageMoodRating,
      "/10",
    );
    addQuantity(
      values,
      "Mental energy",
      profile.moodMentalEnergy?.mentalEnergyRating,
      "/10",
    );
    addQuantity(values, "Stress rating", profile.stress?.rating, "/10");
    addQuantity(
      values,
      "Motivation",
      profile.motivationFocus?.motivationRating,
      "/10",
    );
    addQuantity(
      values,
      "Distraction management",
      profile.motivationFocus?.distractionManagementRating,
      "/10",
    );
    addQuantity(
      values,
      "Relaxation sessions",
      profile.relaxationSessionsPerWeek,
      "sessions/week",
      true,
    );
    addQuantity(values, "Satisfaction", profile.satisfaction, "/10");
  } else if (id === "academics-career") {
    addQuantity(
      values,
      "Current grade",
      profile.academicProfile?.currentGradeValue,
      `/${profile.academicProfile?.currentGradeScale || "scale"}`,
    );
    addQuantity(
      values,
      "Target grade",
      profile.academicGoals?.targetGradeValue,
      `/${profile.academicGoals?.targetGradeScale || "scale"}`,
    );
    addQuantity(
      values,
      "Weekly study time",
      profile.metrics?.weeklyStudyHours,
      "hours/week",
    );
    addQuantity(
      values,
      "Daily study",
      profile.studyRoutine?.dailyStudyHours,
      "hours/day",
      true,
    );
    addQuantity(
      values,
      "Attendance",
      profile.studyRoutine?.attendancePct,
      "%",
      true,
    );
    addQuantity(
      values,
      "Assignments on time",
      profile.studyRoutine?.assignmentOnTimePct,
      "%",
      true,
    );
    addQuantity(
      values,
      "DSA practice",
      profile.careerPreparation?.dsaPracticeDaysPerWeek,
      "days/week",
      true,
    );
    addQuantity(
      values,
      "DSA problems",
      profile.careerPreparation?.problemsSolvedPerWeek,
      "problems/week",
      true,
    );
    addQuantity(
      values,
      "Career prep consistency",
      profile.careerPreparation?.consistencyRating,
      "/10",
      true,
    );
    addQuantity(
      values,
      "In-progress skills",
      profile.metrics?.skillsInProgressCount,
      "skills",
    );
    addQuantity(values, "Satisfaction", profile.satisfaction, "/10");
  } else {
    addQuantity(
      values,
      "Free time",
      profile.timeManagement?.freeMinutesPerDay,
      "minutes/day",
    );
    addQuantity(
      values,
      "Planning",
      profile.timeManagement?.planningDaysPerWeek,
      "days/week",
      true,
    );
    addQuantity(
      values,
      "Procrastination",
      profile.timeManagement?.procrastinationDaysPerWeek,
      "days/week",
      true,
    );
    addQuantity(
      values,
      "Routine consistency",
      profile.personalHabits?.routineConsistency,
      "/10",
      true,
    );
    addQuantity(
      values,
      "Self-discipline",
      profile.personalHabits?.selfDiscipline,
      "/10",
      true,
    );
    addQuantity(
      values,
      "Confidence",
      profile.personalHabits?.confidence,
      "/10",
    );
    addQuantity(
      values,
      "Monthly allowance",
      profile.financialHabits?.monthlyAllowance,
      profile.financialHabits?.currencyCode || "currency/month",
    );
    addQuantity(
      values,
      "Monthly income",
      profile.financialHabits?.monthlyIncome,
      profile.financialHabits?.currencyCode || "currency/month",
    );
    addQuantity(
      values,
      "Monthly savings",
      profile.financialHabits?.monthlySavings,
      profile.financialHabits?.currencyCode || "currency/month",
      true,
    );
    addQuantity(
      values,
      "Monthly spending",
      profile.financialHabits?.monthlySpending,
      profile.financialHabits?.currencyCode || "currency/month",
    );
    addQuantity(
      values,
      "Social time",
      profile.socialLife?.timeWithFriendsFamilyHoursPerWeek,
      "hours/week",
      true,
    );
    addQuantity(
      values,
      "Social satisfaction",
      profile.socialLife?.socialSatisfaction,
      "/10",
    );
    addQuantity(
      values,
      "Improvement time",
      profile.selfImprovement?.availableMinutesPerWeek,
      "minutes/week",
      true,
    );
    addQuantity(
      values,
      "Goal progress",
      profile.metrics?.averageGoalProgressPct,
      "%",
    );
    addQuantity(values, "Satisfaction", profile.satisfaction, "/10");
  }
  return values;
}

async function ensureSuggestedGoals(userId, categoryId, changes) {
  const goals = [];
  for (const change of changes) {
    if (
      !Number.isFinite(Number(change.targetValue)) ||
      Number(change.targetValue) < 0
    )
      continue;
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
        targetValue: Number(change.targetValue),
        unit,
        frequency: /\/week$/i.test(unit) ? "weekly" : "daily",
        source: "suggestion",
      });
    }
    goals.push(goal);
  }
  return goals;
}

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
  const result = {};
  for (const [key, nestedFields] of Object.entries(profileFields)) {
    if (nestedFields === null) {
      result[key] = source[key] ?? null;
      continue;
    }
    const nested = source[key];
    const picked = {};
    for (const field of nestedFields) {
      picked[field] = nested?.[field] ?? null;
    }
    result[key] = picked;
  }
  return result;
}

function computeMetrics(profile, savedMetrics = {}) {
  const heightM =
    profile.heightCm == null ? NaN : Number(profile.heightCm) / 100;
  const weight =
    profile.currentWeightKg == null ? NaN : Number(profile.currentWeightKg);
  const target =
    profile.targetWeightKg == null ? NaN : Number(profile.targetWeightKg);
  const bmi =
    weight > 0 && heightM > 0
      ? Math.round((weight / (heightM * heightM)) * 10) / 10
      : null;
  const weightGapKg =
    Number.isFinite(weight) && Number.isFinite(target)
      ? Math.round((target - weight) * 10) / 10
      : null;
  const workouts = profile.physicalActivity?.workoutsPerWeek;
  const duration = profile.physicalActivity?.averageWorkoutMinutes;
  const workoutMinutesPerWeek =
    workouts != null &&
    duration != null &&
    Number.isFinite(Number(workouts)) &&
    Number.isFinite(Number(duration))
      ? Number(workouts) * Number(duration)
      : null;

  return {
    bmi,
    weightChangeKg: weightGapKg,
    averageSteps: profile.physicalActivity?.dailySteps ?? null,
    workoutMinutesPerWeek,
    sleepScheduleVarianceMinutes:
      savedMetrics.sleepScheduleVarianceMinutes ?? null,
    goalAdherencePct: savedMetrics.goalAdherencePct ?? null,
    overallScore:
      profile.fitnessConsistencyRating != null &&
      Number.isFinite(Number(profile.fitnessConsistencyRating))
        ? Math.round(Number(profile.fitnessConsistencyRating) * 10)
        : (savedMetrics.overallScore ?? null),
    dataDays: savedMetrics.dataDays ?? 0,
    coveragePct: savedMetrics.coveragePct ?? null,
    computedAt: savedMetrics.computedAt ?? null,
  };
}

router.post("/health-fitness/compare", requireAuth, async (req, res) => {
  try {
    const savedProfile = await HealthFitness.findOne({
      userId: req.user._id,
    }).lean();
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
    const candidate = new HealthFitness({ ...current, userId: req.user._id });
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
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Health & Fitness analysis failed:", error);
    if (error.message.includes("OPENROUTER_API_KEY")) {
      return res.status(503).json({ message: error.message });
    }
    return res.status(502).json({
      message:
        error.message ||
        "The analysis provider could not complete this request.",
    });
  }
});

router.post("/letter", requireAuth, async (req, res) => {
  try {
    const timeframeMonths = Number(req.body?.timeframeMonths) === 6 ? 6 : 3;
    const documents = await Promise.all(
      profileCategories.map(({ model }) =>
        model.findOne({ userId: req.user._id }).lean(),
      ),
    );
    const sections = profileCategories.flatMap((category, index) => {
      const document = documents[index];
      if (!document) return [];
      const profile = toPlainProfile(document);
      return [
        {
          id: category.id,
          label: category.label,
          currentScore: Math.max(
            0,
            Math.min(100, Math.round(category.score(document) || 0)),
          ),
          quantities: currentQuantities(category.id, profile),
          profile,
        },
      ];
    });
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
    windowStart.setHours(0, 0, 0, 0);
    const dateKey = (value) => {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
      }
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return null;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const recentCompletions = goals.flatMap((goal) =>
      (goal.logs || []).flatMap((log) => {
        if (log.completed === false) return [];
        const day = dateKey(log.date || log.completedAt);
        if (!day || day < dateKey(windowStart) || day > dateKey(now)) return [];
        return [{ day }];
      }),
    );
    const activityDays = new Set(recentCompletions.map(({ day }) => day));
    const activeGoals = goals.filter((goal) => goal.active !== false);
    const expectedCheckIns = activeGoals.reduce((total, goal) => {
      const createdAt = goal.createdAt ? new Date(goal.createdAt) : windowStart;
      const goalStart = new Date(Math.max(windowStart.getTime(), createdAt.getTime()));
      goalStart.setHours(0, 0, 0, 0);
      const activeDays = Math.max(1, Math.floor((today - goalStart) / 86400000) + 1);
      return total + (goal.frequency === "weekly" ? Math.ceil(activeDays / 7) : activeDays);
    }, 0);
    const activitySummary = {
      windowDays: 30,
      completedActivities: recentCompletions.length,
      activeGoals: activeGoals.length,
      activeDays: activityDays.size,
      consistencyPercent: expectedCheckIns > 0 && recentCompletions.length > 0
        ? Math.min(100, Math.round((recentCompletions.length / expectedCheckIns) * 100))
        : null,
      consistencyNote: recentCompletions.length
        ? "Consistency is estimated from completed goal check-ins compared with active goal frequency over the last 30 days."
        : "No completed goal check-ins were recorded in the last 30 days, so consistency cannot be estimated yet.",
    };

    const result = await writeFutureSelfLetter({ timeframeMonths, sections, activitySummary });
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
    console.error("Future-self letter generation failed:", error);
    if (error.message.includes("OPENROUTER_API_KEY")) {
      return res.status(503).json({ message: error.message });
    }
    return res.status(502).json({
      message:
        error.message || "The letter service could not complete this request.",
    });
  }
});

router.post("/overview", requireAuth, async (req, res) => {
  try {
    const documents = await Promise.all(
      profileCategories.map(({ model }) =>
        model.findOne({ userId: req.user._id }).lean(),
      ),
    );
    const sections = profileCategories.flatMap((category, index) => {
      const document = documents[index];
      if (!document) return [];
      const profile = toPlainProfile(document);
      return [
        {
          id: category.id,
          label: category.label,
          currentScore: Math.max(
            0,
            Math.min(100, Math.round(category.score(document) || 0)),
          ),
          quantities: currentQuantities(category.id, profile),
          profile,
        },
      ];
    });
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
    const result = await analyzeOverviewProjection({ baselineScore, sections });
    const expectedWeeks = [0, 2, 4, 6, 8];
    const pointsByWeek = new Map(
      (result.analysis.trajectory || []).map((point) => [
        Number(point.week),
        point,
      ]),
    );
    if (
      expectedWeeks.some((week) => {
        const point = pointsByWeek.get(week);
        return (
          !point ||
          !Number.isFinite(Number(point.currentScore)) ||
          !Number.isFinite(Number(point.guidelineScore))
        );
      })
    ) {
      throw new Error(
        "The overview model returned an incomplete projection. Please retry.",
      );
    }
    const trajectory = expectedWeeks.map((week) => {
      const point = pointsByWeek.get(week) || {};
      const currentScore = Math.max(
        0,
        Math.min(100, Number(point.currentScore) || 0),
      );
      const guidelineScore = Math.max(
        0,
        Math.min(100, Number(point.guidelineScore) || 0),
      );
      return {
        week,
        currentScore: week === 0 ? baselineScore : Math.round(currentScore),
        guidelineScore: week === 0 ? baselineScore : Math.round(guidelineScore),
      };
    });
    const currentEnd = trajectory[trajectory.length - 1].currentScore;
    const guidelineEnd = trajectory[trajectory.length - 1].guidelineScore;

    return res.json({
      model: result.model,
      timeHorizonWeeks: 8,
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
        projectedScore: currentEnd,
      },
      guidelinePath: {
        label: "If you follow these guidelines",
        summary: result.analysis.guidelineSummary,
        startScore: baselineScore,
        projectedScore: guidelineEnd,
        guidelines: result.analysis.guidelines || [],
      },
      trajectory,
      confidence: result.analysis.confidence,
      keyInsights: result.analysis.keyInsights || [],
      assumptions: result.analysis.assumptions || [],
      disclaimer:
        "These are illustrative scenarios based on your current check-in, not measured forecasts. Outcomes vary with consistency and other factors.",
    });
  } catch (error) {
    console.error("Overview analysis failed:", error);
    if (error.message.includes("OPENROUTER_API_KEY")) {
      return res.status(503).json({ message: error.message });
    }
    return res.status(502).json({
      message:
        error.message ||
        "The overview analysis provider could not complete this request.",
    });
  }
});

router.post("/category/:categoryId", requireAuth, async (req, res) => {
  const category = profileCategories.find(
    (item) => item.id === req.params.categoryId,
  );
  if (!category)
    return res.status(404).json({ message: "Unknown profile section." });

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
    const currentScore = Math.max(
      0,
      Math.min(100, Math.round(category.score(document) || 0)),
    );
    const quantities = currentQuantities(category.id, profile);
    const result = await analyzeCategorySuggestions({
      id: category.id,
      label: category.label,
      profile,
      quantities,
    });
    const changes = result.analysis.changes
      .map((change) => {
        const actual = quantities.find(
          (quantity) =>
            quantity.metric.toLowerCase() ===
            change.metric.trim().toLowerCase(),
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
    console.error(`${category.label} analysis failed:`, error);
    if (error.message.includes("OPENROUTER_API_KEY")) {
      return res.status(503).json({ message: error.message });
    }
    return res.status(502).json({
      message:
        error.message ||
        "The analysis provider could not complete this request.",
    });
  }
});

module.exports = router;
