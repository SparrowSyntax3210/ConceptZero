const express = require("express");
const router = express.Router();
const requireAuth = require("../requireAuth");
const HealthFitness = require("../models/HealthFitness.model");
const { analyzeHealthFitnessComparison } = require("../services/healthFitnessAnalysis.service");

const profileFields = {
  age: null,
  heightCm: null,
  currentWeightKg: null,
  targetWeightKg: null,
  fitnessGoal: null,
  physicalActivity: ["dailySteps", "workoutsPerWeek", "averageWorkoutMinutes"],
  sleepRoutine: ["averageSleepHours", "bedtime", "wakeTime"],
  eatingHabits: ["mealsPerDay", "breakfastDaysPerWeek", "junkOrOutsideMealsPerWeek"],
  nutritionHydration: ["waterMlPerDay", "fruitVegetableServingsPerDay", "dietaryPreference"],
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
  const heightM = profile.heightCm == null ? NaN : Number(profile.heightCm) / 100;
  const weight = profile.currentWeightKg == null ? NaN : Number(profile.currentWeightKg);
  const target = profile.targetWeightKg == null ? NaN : Number(profile.targetWeightKg);
  const bmi = weight > 0 && heightM > 0 ? Math.round((weight / (heightM * heightM)) * 10) / 10 : null;
  const weightGapKg = Number.isFinite(weight) && Number.isFinite(target)
    ? Math.round((target - weight) * 10) / 10
    : null;
  const workouts = profile.physicalActivity?.workoutsPerWeek;
  const duration = profile.physicalActivity?.averageWorkoutMinutes;
  const workoutMinutesPerWeek = workouts != null && duration != null && Number.isFinite(Number(workouts)) && Number.isFinite(Number(duration))
    ? Number(workouts) * Number(duration)
    : null;

  return {
    bmi,
    weightChangeKg: weightGapKg,
    averageSteps: profile.physicalActivity?.dailySteps ?? null,
    workoutMinutesPerWeek,
    sleepScheduleVarianceMinutes: savedMetrics.sleepScheduleVarianceMinutes ?? null,
    goalAdherencePct: savedMetrics.goalAdherencePct ?? null,
    overallScore: profile.fitnessConsistencyRating != null && Number.isFinite(Number(profile.fitnessConsistencyRating))
      ? Math.round(Number(profile.fitnessConsistencyRating) * 10)
      : (savedMetrics.overallScore ?? null),
    dataDays: savedMetrics.dataDays ?? 0,
    coveragePct: savedMetrics.coveragePct ?? null,
    computedAt: savedMetrics.computedAt ?? null,
  };
}

router.post("/health-fitness/compare", requireAuth, async (req, res) => {
  try {
    const savedProfile = await HealthFitness.findOne({ userId: req.user._id }).lean();
    const suppliedProfile = req.body?.profile ?? req.body?.current ?? req.body;
    const hasSuppliedProfile = suppliedProfile && typeof suppliedProfile === "object" && !Array.isArray(suppliedProfile)
      && Object.keys(suppliedProfile).some((key) => profileFields[key] !== undefined);
    if (!hasSuppliedProfile && !savedProfile) {
      return res.status(400).json({ message: "Send your Health & Fitness details in the request body or save your profile first." });
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
      current: { profile: current, metrics: currentMetrics, analysis: result.analysis.current },
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
    return res.status(502).json({ message: error.message || "The analysis provider could not complete this request." });
  }
});

module.exports = router;
