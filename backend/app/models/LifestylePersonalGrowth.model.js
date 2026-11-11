const mongoose = require("mongoose");
const { Schema } = mongoose;

const personalGoalSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    targetDate: Date,
    progressPct: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false },
);

const lifestylePersonalGrowthSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    dailyRoutine: {
      // Bedtime and wake time are stored once in HealthFitness.sleepRoutine.
      mostProductiveTime: {
        type: String,
        enum: [
          "early_morning",
          "morning",
          "afternoon",
          "evening",
          "night",
          "varies",
        ],
      },
    },
    timeManagement: {
      freeMinutesPerDay: { type: Number, min: 0, max: 1440 },
      procrastinationDaysPerWeek: { type: Number, min: 0, max: 7 },
      planningDaysPerWeek: { type: Number, min: 0, max: 7 },
    },
    personalHabits: {
      routineConsistency: { type: Number, min: 1, max: 10 },
      selfDiscipline: { type: Number, min: 1, max: 10 },
      confidence: { type: Number, min: 1, max: 10 },
    },
    financialHabits: {
      monthlyAllowance: { type: Number, min: 0 },
      monthlyIncome: { type: Number, min: 0 },
      monthlySavings: { type: Number, min: 0 },
      monthlySpending: { type: Number, min: 0 },
      currencyCode: {
        type: String,
        uppercase: true,
        trim: true,
        maxlength: 3,
        default: "INR",
      },
    },
    socialLife: {
      timeWithFriendsFamilyHoursPerWeek: { type: Number, min: 0, max: 168 },
      socialSatisfaction: { type: Number, min: 1, max: 10 },
    },
    personalGoals: {
      shortTerm: { type: [personalGoalSchema], default: [] },
      longTerm: { type: [personalGoalSchema], default: [] },
    },
    selfImprovement: {
      habitsToBuild: [{ type: String, trim: true, maxlength: 150 }],
      habitsToEliminate: [{ type: String, trim: true, maxlength: 150 }],
      availableMinutesPerWeek: { type: Number, min: 0, max: 10080 },
    },
    satisfaction: { type: Number, min: 1, max: 10, required: true },
    metrics: {
      planningDaysPerWeek: { type: Number, min: 0, max: 7 },
      procrastinationRatePct: { type: Number, min: 0, max: 100 },
      averageGoalProgressPct: { type: Number, min: 0, max: 100 },
      socialHoursPerWeek: { type: Number, min: 0, max: 168 },
      savingsRatePct: { type: Number, min: 0, max: 100 },
      improvementMinutesPerWeek: { type: Number, min: 0 },
      overallScore: { type: Number, min: 0, max: 100 },
      dataDays: { type: Number, min: 0 },
      coveragePct: { type: Number, min: 0, max: 100 },
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "LifestylePersonalGrowth",
  lifestylePersonalGrowthSchema,
);
