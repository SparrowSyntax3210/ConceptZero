const mongoose = require("mongoose");

const lifestylePersonalGrowthSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    dailyRoutine: {
      mostProductiveTime: String,
    },

    timeManagement: {
      freeMinutesPerDay: Number,
      procrastinationDaysPerWeek: Number,
      planningDaysPerWeek: Number,
    },

    personalHabits: {
      routineConsistency: Number,
      selfDiscipline: Number,
      confidence: Number,
    },

    financialHabits: {
      monthlyAllowance: Number,
      monthlyIncome: Number,
      monthlySavings: Number,
      monthlySpending: Number,
      currencyCode: { type: String, default: "INR" },
    },

    socialLife: {
      timeWithFriendsFamilyHoursPerWeek: Number,
      socialSatisfaction: Number,
    },

    personalGoals: {
      shortTerm: [
        {
          title: { type: String, required: true },
          targetDate: Date,
          progressPct: { type: Number, default: 0 },
        },
      ],
      longTerm: [
        {
          title: { type: String, required: true },
          targetDate: Date,
          progressPct: { type: Number, default: 0 },
        },
      ],
    },

    selfImprovement: {
      habitsToBuild: [String],
      habitsToEliminate: [String],
      availableMinutesPerWeek: Number,
    },

    satisfaction: { type: Number, required: true },

    metrics: {
      planningDaysPerWeek: Number,
      procrastinationRatePct: Number,
      averageGoalProgressPct: Number,
      socialHoursPerWeek: Number,
      savingsRatePct: Number,
      improvementMinutesPerWeek: Number,
      overallScore: Number,
      dataDays: Number,
      coveragePct: Number,
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "LifestylePersonalGrowth",
  lifestylePersonalGrowthSchema,
);
