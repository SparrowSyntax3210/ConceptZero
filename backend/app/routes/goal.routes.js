const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const requireAuth = require("../requireAuth");
const Goal = require("../models/Goal.model");

router.use(requireAuth);

// Get all goals
router.get("/", async (req, res) => {
  try {
    const filter = { userId: req.user._id };

    if (req.query.includeArchived !== "true") {
      filter.active = true;
    }

    const goals = await Goal.find(filter).sort({ createdAt: -1 });

    res.json({ goals });
  } catch (error) {
    res.status(500).json({ message: "Error loading goals" });
  }
});

// Complete or update a goal
router.put("/:goalId/checkin", async (req, res) => {
  try {
    const { date, completed, actualValue } = req.body;

    if (!mongoose.isValidObjectId(req.params.goalId)) {
      return res.status(400).send("Invalid goal ID");
    }

    if (!date || typeof completed !== "boolean") {
      return res.status(400).send("Invalid date or completion status");
    }

    const goal = await Goal.findOne({
      _id: req.params.goalId,
      userId: req.user._id,
      active: true,
    });

    if (!goal) {
      return res.status(404).send("Goal not found");
    }

    // Find existing check-in
    const log = goal.logs.find((item) => item.date === date);

    if (log) {
      log.completed = completed;
      log.completedAt = completed ? new Date() : null;

      if (actualValue !== undefined) {
        log.actualValue = actualValue;
      }
    } else {
      goal.logs.push({
        date,
        completed,
        actualValue,
        completedAt: completed ? new Date() : null,
      });
    }

    await goal.save();

    res.json({ goal });
  } catch (error) {
    res.status(500).send("Error updating goal");
  }
});

// Archive a goal
router.delete("/:goalId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.goalId)) {
      return res.status(400).send("Invalid goal ID");
    }

    const goal = await Goal.findOneAndUpdate(
      {
        _id: req.params.goalId,
        userId: req.user._id,
      },
      {
        active: false,
        archivedAt: new Date(),
      },
    );

    if (!goal) {
      return res.status(404).send("Goal not found");
    }

    res.send("Goal archived successfully");
  } catch (error) {
    res.status(500).send("Error archiving goal");
  }
});

module.exports = router;
