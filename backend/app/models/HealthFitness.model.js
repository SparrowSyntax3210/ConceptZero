const mongoose = require("mongoose");

const healthFitnessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    age: { type: Number, min: 13, max: 120 },
    heightCm: { type: Number, min: 80, max: 250 },
    currentWeightKg: { type: Number, min: 20, max: 500 },
    targetWeightKg: { type: Number, min: 20, max: 500 },
    fitnessGoal: {
      type: String,
      enum: ["weight_loss", "muscle_building", "general_fitness", "stay_healthy"],
    },
    physicalActivity: {
      dailySteps: { type: Number, min: 0, max: 100000 },
      workoutsPerWeek: { type: Number, min: 0, max: 14 },
      averageWorkoutMinutes: { type: Number, min: 0, max: 600 },
    },
    sleepRoutine: {
      averageSleepHours: { type: Number, min: 0, max: 24 },
      bedtime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      wakeTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    },
    eatingHabits: {
      mealsPerDay: { type: Number, min: 0, max: 10 },
      breakfastDaysPerWeek: { type: Number, min: 0, max: 7 },
      junkOrOutsideMealsPerWeek: { type: Number, min: 0, max: 21 },
    },
    nutritionHydration: {
      waterMlPerDay: { type: Number, min: 0, max: 10000 },
      fruitVegetableServingsPerDay: { type: Number, min: 0, max: 30 },
      dietaryPreference: {
        type: String,
        enum: ["none", "vegetarian", "vegan", "pescatarian", "other"],
      },
    },
    fitnessConsistencyRating: { type: Number, min: 1, max: 10 },
    satisfaction: { type: Number, min: 1, max: 10, required: true },
    metrics: {
      bmi: { type: Number, min: 0 },
      weightChangeKg: Number,
      averageSteps: { type: Number, min: 0 },
      workoutMinutesPerWeek: { type: Number, min: 0 },
      sleepScheduleVarianceMinutes: { type: Number, min: 0 },
      goalAdherencePct: { type: Number, min: 0, max: 100 },
      overallScore: { type: Number, min: 0, max: 100 },
      dataDays: { type: Number, min: 0 },
      coveragePct: { type: Number, min: 0, max: 100 },
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("HealthFitness", healthFitnessSchema);
