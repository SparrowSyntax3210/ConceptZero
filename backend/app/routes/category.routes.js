const express = require("express");
const router = express.Router();
const requireAuth = require("../requireAuth");
const HealthFitness = require("../models/HealthFitness.model");
const MindDigitalWellbeing = require("../models/MindDigitalWellbeing.model");
const AcademicsCareerGrowth = require("../models/AcademicsCareerGrowth.model");
const LifestylePersonalGrowth = require("../models/LifestylePersonalGrowth.model");

const categories = {
  "health-fitness": { label: "Health & Fitness", model: HealthFitness },
  "mind-digital": {
    label: "Mind & Digital Wellbeing",
    model: MindDigitalWellbeing,
  },
  "academics-career": {
    label: "Academics & Career Growth",
    model: AcademicsCareerGrowth,
  },
  "lifestyle-growth": {
    label: "Lifestyle & Personal Growth",
    model: LifestylePersonalGrowth,
  },
};

function average(values) {
  const available = values.filter((value) => Number.isFinite(value));
  return available.length
    ? Math.round(
        (available.reduce((sum, value) => sum + value, 0) / available.length) *
          10,
      ) / 10
    : undefined;
}

function calculateMetrics(categoryId, data) {
  const metrics = { computedAt: new Date(), dataDays: 0 };

  if (categoryId === "health-fitness") {
    const heightM = Number(data.heightCm) / 100;
    if (data.currentWeightKg > 0 && heightM > 0) {
      metrics.bmi =
        Math.round((data.currentWeightKg / (heightM * heightM)) * 10) / 10;
    }
    if (
      Number.isFinite(data.targetWeightKg) &&
      Number.isFinite(data.currentWeightKg)
    ) {
      metrics.weightChangeKg =
        Math.round((data.targetWeightKg - data.currentWeightKg) * 10) / 10;
    }
    if (Number.isFinite(data.physicalActivity?.dailySteps)) {
      metrics.averageSteps = data.physicalActivity.dailySteps;
    }
    if (
      Number.isFinite(data.physicalActivity?.workoutsPerWeek) &&
      Number.isFinite(data.physicalActivity?.averageWorkoutMinutes)
    ) {
      metrics.workoutMinutesPerWeek =
        data.physicalActivity.workoutsPerWeek *
        data.physicalActivity.averageWorkoutMinutes;
    }
    if (Number.isFinite(data.fitnessConsistencyRating)) {
      metrics.overallScore = data.fitnessConsistencyRating * 10;
    }
  }

  if (categoryId === "mind-digital") {
    if (Number.isFinite(data.screenTimeMinutesPerDay)) {
      metrics.averageScreenHours =
        Math.round((data.screenTimeMinutesPerDay / 60) * 10) / 10;
    }
    const entertainmentMinutes =
      (data.digitalUsage?.socialMediaMinutesPerDay || 0) +
      (data.digitalUsage?.youtubeOttMinutesPerDay || 0) +
      (data.digitalUsage?.gamingMinutesPerDay || 0);
    if (data.screenTimeMinutesPerDay > 0) {
      metrics.entertainmentScreenPct = Math.min(
        100,
        Math.round((entertainmentMinutes / data.screenTimeMinutesPerDay) * 100),
      );
    }
    if (
      Number.isFinite(data.digitalDistractions?.phoneBeforeSleepNightsPerWeek)
    ) {
      metrics.phoneBeforeSleepRatePct = Math.round(
        (data.digitalDistractions.phoneBeforeSleepNightsPerWeek / 7) * 100,
      );
    }
    metrics.averageMood = data.moodMentalEnergy?.averageMoodRating;
    metrics.averageEnergy = data.moodMentalEnergy?.mentalEnergyRating;
    metrics.averageStress = data.stress?.rating;
    const wellbeingInputs = [
      data.moodMentalEnergy?.averageMoodRating,
      data.moodMentalEnergy?.mentalEnergyRating,
      data.motivationFocus?.motivationRating,
      data.motivationFocus?.distractionManagementRating,
      Number.isFinite(data.stress?.rating)
        ? 11 - data.stress.rating
        : undefined,
    ];
    const wellbeingAverage = average(wellbeingInputs);
    if (wellbeingAverage !== undefined)
      metrics.focusWellbeingScore = Math.round(wellbeingAverage * 10);
  }

  if (categoryId === "academics-career") {
    const current = data.academicProfile?.currentGradeValue;
    const currentScale = data.academicProfile?.currentGradeScale;
    const target = data.academicGoals?.targetGradeValue;
    const targetScale = data.academicGoals?.targetGradeScale;
    if (Number.isFinite(current) && currentScale > 0) {
      metrics.normalizedCurrentGradePct =
        Math.round((current / currentScale) * 1000) / 10;
    }
    if (Number.isFinite(target) && targetScale > 0) {
      metrics.normalizedTargetGradePct =
        Math.round((target / targetScale) * 1000) / 10;
    }
    if (
      Number.isFinite(metrics.normalizedCurrentGradePct) &&
      Number.isFinite(metrics.normalizedTargetGradePct)
    ) {
      metrics.gradeGoalGapPct =
        Math.round(
          (metrics.normalizedTargetGradePct -
            metrics.normalizedCurrentGradePct) *
            10,
        ) / 10;
    }
    if (Number.isFinite(data.studyRoutine?.dailyStudyHours)) {
      metrics.weeklyStudyHours = data.studyRoutine.dailyStudyHours * 7;
    }
    metrics.assignmentConsistencyPct = data.studyRoutine?.assignmentOnTimePct;
    if (Number.isFinite(data.careerPreparation?.consistencyRating)) {
      metrics.careerPrepScore = data.careerPreparation.consistencyRating * 10;
    }
    if (Array.isArray(data.technicalSkills)) {
      metrics.skillsInProgressCount = data.technicalSkills.length;
    }
  }

  if (categoryId === "lifestyle-growth") {
    metrics.planningDaysPerWeek = data.timeManagement?.planningDaysPerWeek;
    if (Number.isFinite(data.timeManagement?.procrastinationDaysPerWeek)) {
      metrics.procrastinationRatePct = Math.round(
        (data.timeManagement.procrastinationDaysPerWeek / 7) * 100,
      );
    }
    const goalProgress = [
      ...(data.personalGoals?.shortTerm || []),
      ...(data.personalGoals?.longTerm || []),
    ].map((goal) => goal.progressPct);
    const averageProgress = average(goalProgress);
    if (averageProgress !== undefined)
      metrics.averageGoalProgressPct = averageProgress;
    metrics.socialHoursPerWeek =
      data.socialLife?.timeWithFriendsFamilyHoursPerWeek;
    const income =
      data.financialHabits?.monthlyIncome ||
      data.financialHabits?.monthlyAllowance;
    if (income > 0 && Number.isFinite(data.financialHabits?.monthlySavings)) {
      metrics.savingsRatePct = Math.round(
        Math.min(100, (data.financialHabits.monthlySavings / income) * 100),
      );
    }
    if (Number.isFinite(data.selfImprovement?.availableMinutesPerWeek)) {
      metrics.improvementMinutesPerWeek =
        data.selfImprovement.availableMinutesPerWeek;
    }
    const selfRating = average([
      data.personalHabits?.routineConsistency,
      data.personalHabits?.selfDiscipline,
      data.personalHabits?.confidence,
    ]);
    if (selfRating !== undefined)
      metrics.overallScore = Math.round(selfRating * 10);
  }

  return metrics;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await Promise.all(
      Object.entries(categories).map(async ([id, category]) => {
        const profile = await category.model
          .findOne({ userId: req.user._id })
          .select("satisfaction updatedAt");
        return {
          id,
          label: category.label,
          completed: Boolean(profile),
          satisfaction: profile?.satisfaction ?? null,
          updatedAt: profile?.updatedAt ?? null,
        };
      }),
    );
    return res.json({ categories: result });
  } catch (error) {
    console.error("Could not load category status:", error);
    return res.status(500).json({ message: "Could not load categories" });
  }
});

router.get("/:categoryId", requireAuth, async (req, res) => {
  const category = categories[req.params.categoryId];
  if (!category) return res.status(404).json({ message: "Unknown category" });

  try {
    const data = await category.model.findOne({ userId: req.user._id });
    return res.json({ categoryId: req.params.categoryId, data });
  } catch (error) {
    console.error("Could not load category profile:", error);
    return res.status(500).json({ message: "Could not load this category" });
  }
});

router.put("/:categoryId", requireAuth, async (req, res) => {
  const category = categories[req.params.categoryId];
  if (!category) return res.status(404).json({ message: "Unknown category" });

  const input = { ...req.body };
  for (const protectedField of [
    "_id",
    "__v",
    "userId",
    "metrics",
    "createdAt",
    "updatedAt",
  ]) {
    delete input[protectedField];
  }

  try {
    const data = await category.model.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          ...input,
          userId: req.user._id,
          metrics: calculateMetrics(req.params.categoryId, input),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    return res.json({ categoryId: req.params.categoryId, data });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not save category profile:", error);
    return res.status(500).json({ message: "Could not save this category" });
  }
});

module.exports = router;
