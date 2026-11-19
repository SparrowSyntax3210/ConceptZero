const mongoose = require("mongoose");

const healthFitnessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    age: Number,
    heightCm: Number,
    currentWeightKg: Number,
    targetWeightKg: Number,
    fitnessGoal: String,

    physicalActivity: {
      dailySteps: Number,
      workoutsPerWeek: Number,
      averageWorkoutMinutes: Number,
    },

    sleepRoutine: {
      averageSleepHours: Number,
      bedtime: String,
      wakeTime: String,
    },

    eatingHabits: {
      mealsPerDay: Number,
      breakfastDaysPerWeek: Number,
      junkOrOutsideMealsPerWeek: Number,
    },

    nutritionHydration: {
      waterMlPerDay: Number,
      fruitVegetableServingsPerDay: Number,
      dietaryPreference: String,
    },

    fitnessConsistencyRating: Number,
    satisfaction: { type: Number, required: true },

    metrics: {
      bmi: Number,
      weightChangeKg: Number,
      averageSteps: Number,
      workoutMinutesPerWeek: Number,
      sleepScheduleVarianceMinutes: Number,
      goalAdherencePct: Number,
      overallScore: Number,
      dataDays: Number,
      coveragePct: Number,
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("HealthFitness", healthFitnessSchema);
