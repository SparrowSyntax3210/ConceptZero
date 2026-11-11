const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const requireAuth = require("../requireAuth");
const Goal = require("../models/Goal.model");

router.use(requireAuth);

function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00.000Z`));
}

router.get("/", async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.includeArchived !== "true") filter.active = true;
    const goals = await Goal.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ goals });
  } catch (error) {
    console.error("Could not load goals:", error);
    return res.status(500).json({ message: "Could not load your goals." });
  }
});

router.put("/:goalId/checkin", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.goalId)) return res.status(400).json({ message: "Invalid goal ID." });
  const date = req.body?.date;
  const completed = req.body?.completed;
  if (!validDate(date) || typeof completed !== "boolean") {
    return res.status(400).json({ message: "Send a valid YYYY-MM-DD date and completed boolean." });
  }
  const actualValue = req.body?.actualValue == null ? undefined : Number(req.body.actualValue);
  if (actualValue !== undefined && (!Number.isFinite(actualValue) || actualValue < 0)) {
    return res.status(400).json({ message: "actualValue must be a non-negative number." });
  }

  try {
    const goal = await Goal.findOne({ _id: req.params.goalId, userId: req.user._id, active: true });
    if (!goal) return res.status(404).json({ message: "Goal not found." });
    const log = goal.logs.find((item) => item.date === date);
    if (log) {
      log.completed = completed;
      log.completedAt = completed ? new Date() : null;
      if (actualValue !== undefined) log.actualValue = actualValue;
      else if (!completed) log.actualValue = undefined;
    } else {
      goal.logs.push({ date, completed, ...(actualValue !== undefined ? { actualValue } : {}) });
    }
    await goal.save();
    return res.json({ goal });
  } catch (error) {
    console.error("Could not save goal check-in:", error);
    return res.status(500).json({ message: "Could not save today's check-in." });
  }
});

router.delete("/:goalId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.goalId)) return res.status(400).json({ message: "Invalid goal ID." });
  try {
    const result = await Goal.updateOne({ _id: req.params.goalId, userId: req.user._id }, { $set: { active: false, archivedAt: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ message: "Goal not found." });
    return res.sendStatus(204);
  } catch (error) {
    console.error("Could not archive goal:", error);
    return res.status(500).json({ message: "Could not remove this goal." });
  }
});

module.exports = router;
