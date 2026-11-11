const express = require("express");
const router = express.Router();
const Profile = require("../models/Profile.model");
const requireAuth = require("../requireAuth");
const HealthFitness = require("../models/HealthFitness.model");
const MindDigitalWellbeing = require("../models/MindDigitalWellbeing.model");
const AcademicsCareerGrowth = require("../models/AcademicsCareerGrowth.model");
const LifestylePersonalGrowth = require("../models/LifestylePersonalGrowth.model");
const Goal = require("../models/Goal.model");

const profileAreas = [
  { id: "health-fitness", label: "Health & Fitness", model: HealthFitness, score: (doc) => doc.metrics?.overallScore ?? (doc.fitnessConsistencyRating == null ? null : doc.fitnessConsistencyRating * 10), quantities: (doc) => ({ bmi: doc.metrics?.bmi ?? null, dailySteps: doc.physicalActivity?.dailySteps ?? null, workoutsPerWeek: doc.physicalActivity?.workoutsPerWeek ?? null, sleepHours: doc.sleepRoutine?.averageSleepHours ?? null, waterMlPerDay: doc.nutritionHydration?.waterMlPerDay ?? null }) },
  { id: "mind-digital", label: "Mind & Digital", model: MindDigitalWellbeing, score: (doc) => doc.metrics?.focusWellbeingScore ?? null, quantities: (doc) => ({ screenTimeMinutesPerDay: doc.screenTimeMinutesPerDay ?? null, mood: doc.moodMentalEnergy?.averageMoodRating ?? null, stress: doc.stress?.rating ?? null, relaxationSessionsPerWeek: doc.relaxationSessionsPerWeek ?? null }) },
  { id: "academics-career", label: "Academics", model: AcademicsCareerGrowth, score: (doc) => doc.metrics?.careerPrepScore ?? null, quantities: (doc) => ({ currentGradePct: doc.metrics?.normalizedCurrentGradePct ?? null, weeklyStudyHours: doc.metrics?.weeklyStudyHours ?? null, attendancePct: doc.studyRoutine?.attendancePct ?? null, skillsInProgress: doc.metrics?.skillsInProgressCount ?? null }) },
  { id: "lifestyle-growth", label: "Lifestyle", model: LifestylePersonalGrowth, score: (doc) => doc.metrics?.overallScore ?? null, quantities: (doc) => ({ planningDaysPerWeek: doc.timeManagement?.planningDaysPerWeek ?? null, procrastinationDaysPerWeek: doc.timeManagement?.procrastinationDaysPerWeek ?? null, socialHoursPerWeek: doc.socialLife?.timeWithFriendsFamilyHoursPerWeek ?? null, goalProgressPct: doc.metrics?.averageGoalProgressPct ?? null }) },
];

function shiftDate(dateKey, offset) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || "") ? req.query.date : new Date().toISOString().slice(0, 10);
    const [documents, goals] = await Promise.all([
      Promise.all(profileAreas.map(({ model }) => model.findOne({ userId: req.user._id }).lean())),
      Goal.find({ userId: req.user._id, active: true }).lean(),
    ]);
    const areas = profileAreas.map((area, index) => {
      const doc = documents[index];
      return {
        id: area.id,
        label: area.label,
        completed: Boolean(doc),
        score: doc ? area.score(doc) : null,
        satisfaction: doc?.satisfaction ?? null,
        quantities: doc ? area.quantities(doc) : null,
      };
    });
    const scores = areas.map((area) => area.score).filter((score) => Number.isFinite(score));
    const completedToday = goals.filter((goal) => goal.logs?.some((log) => log.date === requestedDate && log.completed)).length;
    const completedDays = new Set(goals.flatMap((goal) => (goal.logs || []).filter((log) => log.completed).map((log) => log.date)));
    let streak = 0;
    let cursor = requestedDate;
    if (!completedDays.has(cursor)) cursor = shiftDate(cursor, -1);
    while (completedDays.has(cursor)) { streak += 1; cursor = shiftDate(cursor, -1); }
    const weekStart = shiftDate(requestedDate, -new Date(`${requestedDate}T12:00:00.000Z`).getUTCDay());
    const completionsThisWeek = goals.reduce((total, goal) => total + (goal.logs || []).filter((log) => log.completed && log.date >= weekStart && log.date <= requestedDate).length, 0);
    const weeklyRate = goals.length ? Math.round((completionsThisWeek / (goals.length * 7)) * 100) : null;

    return res.json({
      user: { id: req.user._id, username: req.user.username, email: req.user.email },
      overallScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      profileAreas: areas,
      stats: { activeGoals: goals.length, completedToday, currentStreak: streak, weeklyCompletionPct: weeklyRate },
      preferences: { notifications: null, weeklyReport: null, darkMode: null },
    });
  } catch (error) {
    console.error("Could not load profile summary:", error);
    return res.status(500).json({ message: "Could not load your profile summary." });
  }
});

router.post("/add-details", (req, res) => {});

router.get("/get-details", (req, res) => {});

module.exports = router;
