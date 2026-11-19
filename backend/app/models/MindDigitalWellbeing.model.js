const mongoose = require("mongoose");

const mindDigitalWellbeingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    screenTimeMinutesPerDay: Number,

    digitalUsage: {
      socialMediaMinutesPerDay: Number,
      youtubeOttMinutesPerDay: Number,
      gamingMinutesPerDay: Number,
    },

    digitalDistractions: {
      mostDistractingApp: String,
      phoneBeforeSleepNightsPerWeek: Number,
      phoneAfterWakeNightsPerWeek: Number,
    },

    moodMentalEnergy: {
      averageMoodRating: Number,
      mentalEnergyRating: Number,
    },

    stress: {
      rating: Number,
      majorSource: String,
    },

    motivationFocus: {
      motivationRating: Number,
      distractionManagementRating: Number,
    },

    relaxationSessionsPerWeek: Number,

    satisfaction: { type: Number, required: true },

    metrics: {
      averageScreenHours: Number,
      entertainmentScreenPct: Number,
      phoneBeforeSleepRatePct: Number,
      averageMood: Number,
      averageEnergy: Number,
      averageStress: Number,
      focusWellbeingScore: Number,
      dataDays: Number,
      coveragePct: Number,
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "MindDigitalWellbeing",
  mindDigitalWellbeingSchema,
);
