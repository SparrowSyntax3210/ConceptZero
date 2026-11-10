const mongoose = require("mongoose");

const mindDigitalWellbeingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    screenTimeMinutesPerDay: { type: Number, min: 0, max: 1440 },
    digitalUsage: {
      socialMediaMinutesPerDay: { type: Number, min: 0, max: 1440 },
      youtubeOttMinutesPerDay: { type: Number, min: 0, max: 1440 },
      gamingMinutesPerDay: { type: Number, min: 0, max: 1440 },
    },
    digitalDistractions: {
      mostDistractingApp: { type: String, trim: true, maxlength: 100 },
      phoneBeforeSleepNightsPerWeek: { type: Number, min: 0, max: 7 },
      phoneAfterWakeNightsPerWeek: { type: Number, min: 0, max: 7 },
    },
    moodMentalEnergy: {
      averageMoodRating: { type: Number, min: 1, max: 10 },
      mentalEnergyRating: { type: Number, min: 1, max: 10 },
    },
    stress: {
      rating: { type: Number, min: 1, max: 10 },
      majorSource: { type: String, trim: true, maxlength: 500 },
    },
    motivationFocus: {
      motivationRating: { type: Number, min: 1, max: 10 },
      distractionManagementRating: { type: Number, min: 1, max: 10 },
    },
    relaxationSessionsPerWeek: { type: Number, min: 0, max: 21 },
    satisfaction: { type: Number, min: 1, max: 10, required: true },
    metrics: {
      averageScreenHours: { type: Number, min: 0, max: 24 },
      entertainmentScreenPct: { type: Number, min: 0, max: 100 },
      phoneBeforeSleepRatePct: { type: Number, min: 0, max: 100 },
      averageMood: { type: Number, min: 1, max: 10 },
      averageEnergy: { type: Number, min: 1, max: 10 },
      averageStress: { type: Number, min: 1, max: 10 },
      focusWellbeingScore: { type: Number, min: 0, max: 100 },
      dataDays: { type: Number, min: 0 },
      coveragePct: { type: Number, min: 0, max: 100 },
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "MindDigitalWellbeing",
  mindDigitalWellbeingSchema,
);
