const express = require("express");
const router = express.Router();

const requireAuth = require("../requireAuth");

const HealthFitness = require("../models/HealthFitness.model");
const MindDigitalWellbeing = require("../models/MindDigitalWellbeing.model");
const AcademicsCareerGrowth = require("../models/AcademicsCareerGrowth.model");
const LifestylePersonalGrowth = require("../models/LifestylePersonalGrowth.model");

// All categories
const categories = {
  "health-fitness": {
    label: "Health & Fitness",
    model: HealthFitness,
  },
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

// Calculate metrics
function calculateMetrics(id, data) {
  const metrics = { computedAt: new Date(), dataDays: 0 };

  // Health and Fitness
  if (id === "health-fitness") {
    if (data.heightCm && data.currentWeightKg) {
      const height = data.heightCm / 100;
      metrics.bmi =
        Math.round((data.currentWeightKg / (height * height)) * 10) / 10;
    }

    metrics.weightChangeKg = data.targetWeightKg - data.currentWeightKg;

    metrics.averageSteps = data.physicalActivity?.dailySteps;

    metrics.workoutMinutesPerWeek =
      (data.physicalActivity?.workoutsPerWeek || 0) *
      (data.physicalActivity?.averageWorkoutMinutes || 0);

    metrics.overallScore = data.fitnessConsistencyRating * 10;
  }

  // Mind and Digital
  if (id === "mind-digital") {
    metrics.averageScreenHours = data.screenTimeMinutesPerDay / 60;

    const usage = data.digitalUsage || {};

    const entertainment =
      (usage.socialMediaMinutesPerDay || 0) +
      (usage.youtubeOttMinutesPerDay || 0) +
      (usage.gamingMinutesPerDay || 0);

    metrics.entertainmentScreenPct = data.screenTimeMinutesPerDay
      ? Math.round((entertainment / data.screenTimeMinutesPerDay) * 100)
      : 0;

    metrics.phoneBeforeSleepRatePct =
      ((data.digitalDistractions?.phoneBeforeSleepNightsPerWeek || 0) / 7) *
      100;

    metrics.averageMood = data.moodMentalEnergy?.averageMoodRating;
    metrics.averageEnergy = data.moodMentalEnergy?.mentalEnergyRating;
    metrics.averageStress = data.stress?.rating;

    metrics.focusWellbeingScore = Math.round(
      (((data.moodMentalEnergy?.averageMoodRating || 0) +
        (data.moodMentalEnergy?.mentalEnergyRating || 0) +
        (data.motivationFocus?.motivationRating || 0) +
        (data.motivationFocus?.distractionManagementRating || 0) +
        (data.stress?.rating ? 11 - data.stress.rating : 0)) /
        5) *
        10,
    );
  }

  // Academics and Career
  if (id === "academics-career") {
    const academic = data.academicProfile || {};
    const goals = data.academicGoals || {};

    metrics.normalizedCurrentGradePct =
      (academic.currentGradeValue / academic.currentGradeScale) * 100;

    metrics.normalizedTargetGradePct =
      (goals.targetGradeValue / goals.targetGradeScale) * 100;

    metrics.gradeGoalGapPct =
      metrics.normalizedTargetGradePct - metrics.normalizedCurrentGradePct;

    metrics.weeklyStudyHours = (data.studyRoutine?.dailyStudyHours || 0) * 7;

    metrics.assignmentConsistencyPct = data.studyRoutine?.assignmentOnTimePct;

    metrics.careerPrepScore =
      (data.careerPreparation?.consistencyRating || 0) * 10;

    metrics.skillsInProgressCount = data.technicalSkills?.length || 0;
  }

  // Lifestyle and Personal Growth
  if (id === "lifestyle-growth") {
    metrics.planningDaysPerWeek = data.timeManagement?.planningDaysPerWeek;

    metrics.procrastinationRatePct =
      ((data.timeManagement?.procrastinationDaysPerWeek || 0) / 7) * 100;

    const goals = [
      ...(data.personalGoals?.shortTerm || []),
      ...(data.personalGoals?.longTerm || []),
    ];

    if (goals.length) {
      metrics.averageGoalProgressPct =
        goals.reduce((sum, goal) => sum + goal.progressPct, 0) / goals.length;
    }

    metrics.socialHoursPerWeek =
      data.socialLife?.timeWithFriendsFamilyHoursPerWeek;

    const income =
      data.financialHabits?.monthlyIncome ||
      data.financialHabits?.monthlyAllowance;

    if (income > 0) {
      metrics.savingsRatePct =
        ((data.financialHabits?.monthlySavings || 0) / income) * 100;
    }

    metrics.improvementMinutesPerWeek =
      data.selfImprovement?.availableMinutesPerWeek;

    const habits = data.personalHabits || {};

    metrics.overallScore =
      (((habits.routineConsistency || 0) +
        (habits.selfDiscipline || 0) +
        (habits.confidence || 0)) /
        3) *
      10;
  }

  return metrics;
}

// Get all categories
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await Promise.all(
      Object.entries(categories).map(async ([id, category]) => {
        const data = await category.model.findOne({
          userId: req.user._id,
        });

        return {
          id,
          label: category.label,
          completed: Boolean(data),
          satisfaction: data?.satisfaction || null,
          updatedAt: data?.updatedAt || null,
        };
      }),
    );

    res.json({ categories: result });
  } catch (error) {
    res.status(500).json({ message: "Could not load categories" });
  }
});

// Get one category
router.get("/:categoryId", requireAuth, async (req, res) => {
  try {
    const category = categories[req.params.categoryId];

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const data = await category.model.findOne({
      userId: req.user._id,
    });

    res.json({
      categoryId: req.params.categoryId,
      data,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load category" });
  }
});

// Add or update category
router.put("/:categoryId", requireAuth, async (req, res) => {
  try {
    const id = req.params.categoryId;
    const category = categories[id];

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const data = { ...req.body };

    // Prevent users from changing protected fields
    delete data._id;
    delete data.userId;
    delete data.metrics;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.__v;

    const metrics = calculateMetrics(id, data);

    const updatedData = await category.model.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...data,
        userId: req.user._id,
        metrics,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    res.json({
      categoryId: id,
      data: updatedData,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not save category" });
  }
});

module.exports = router;
