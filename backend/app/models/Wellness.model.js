const mongoose = require("mongoose");

const WellnessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  metrics: {
    sleepMinutes: {
      type: Number,
      default: 420,
    },
    screenMinutes: {
      type: Number,
      default: 300,
    },
    focusMinutes: {
      type: Number,
      default: 120,
    },
    activityMinutes: {
      type: Number,
      default: 35,
    },
    energy: {
      type: Number,
      default: 4,
    },
  },
});

const Wellness = mongoose.model("Wellness", WellnessSchema);
module.exports = Wellness;
