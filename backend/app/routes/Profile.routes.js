const express = require("express");
const router = express.Router();

const requireAuth = require("../requireAuth");
const HealthFitness = require("../models/HealthFitness.model");
const MindDigitalWellbeing = require("../models/MindDigitalWellbeing.model");
const AcademicsCareerGrowth = require("../models/AcademicsCareerGrowth.model");
const LifestylePersonalGrowth = require("../models/LifestylePersonalGrowth.model");
const Goal = require("../models/Goal.model");

// Profile models
const models = [
  { id: "health-fitness", label: "Health & Fitness", model: HealthFitness },
  { id: "mind-digital", label: "Mind & Digital", model: MindDigitalWellbeing },
  { id: "academics-career", label: "Academics", model: AcademicsCareerGrowth },
  {
    id: "lifestyle-growth",
    label: "Lifestyle",
    model: LifestylePersonalGrowth,
  },
];

// Summary
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().slice(0, 10);

    // Get all profile details
    const profiles = await Promise.all(
      models.map((item) => item.model.findOne({ userId: req.user._id }).lean()),
    );

    // Get active goals
    const goals = await Goal.find({
      userId: req.user._id,
      active: true,
    }).lean();

    // Profile areas
    const profileAreas = models.map((item, index) => {
      const doc = profiles[index];

      let score = null;

      if (doc) {
        score =
          doc.metrics?.overallScore ??
          doc.metrics?.focusWellbeingScore ??
          doc.metrics?.careerPrepScore ??
          (doc.fitnessConsistencyRating != null
            ? doc.fitnessConsistencyRating * 10
            : null);
      }

      return {
        id: item.id,
        label: item.label,
        completed: Boolean(doc),
        score,
        satisfaction: doc?.satisfaction ?? null,
      };
    });

    // Overall score
    const scores = profileAreas
      .map((item) => item.score)
      .filter((score) => score !== null && Number.isFinite(score));

    const overallScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    // Completed goals today
    const completedToday = goals.filter((goal) =>
      goal.logs.some((log) => log.date === today && log.completed),
    ).length;

    // Calculate streak
    const completedDays = new Set();

    goals.forEach((goal) => {
      goal.logs.forEach((log) => {
        if (log.completed) completedDays.add(log.date);
      });
    });

    let streak = 0;
    let date = new Date(today + "T12:00:00Z");

    if (!completedDays.has(today)) {
      date.setUTCDate(date.getUTCDate() - 1);
    }

    while (completedDays.has(date.toISOString().slice(0, 10))) {
      streak++;
      date.setUTCDate(date.getUTCDate() - 1);
    }

    // Weekly completion
    const weekStart = new Date(today + "T12:00:00Z");
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

    const startDate = weekStart.toISOString().slice(0, 10);

    let weeklyCompleted = 0;

    goals.forEach((goal) => {
      goal.logs.forEach((log) => {
        if (log.completed && log.date >= startDate && log.date <= today) {
          weeklyCompleted++;
        }
      });
    });

    const weeklyCompletionPct = goals.length
      ? Math.round((weeklyCompleted / (goals.length * 7)) * 100)
      : null;

    // Send response
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
      },

      overallScore,
      profileAreas,

      stats: {
        activeGoals: goals.length,
        completedToday,
        currentStreak: streak,
        weeklyCompletionPct,
      },

      preferences: {
        notifications: null,
        weeklyReport: null,
        darkMode: null,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Could not load profile summary" });
  }
});

// Add details
router.post("/add-details", requireAuth, (req, res) => {
  res.send("Add details route");
});

// Get details
router.get("/get-details", requireAuth, (req, res) => {
  res.send("Get details route");
});

module.exports = router;
