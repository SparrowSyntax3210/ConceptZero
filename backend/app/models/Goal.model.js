const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    categoryId: {
      type: String,
      enum: [
        "health-fitness",
        "mind-digital",
        "academics-career",
        "lifestyle-growth",
      ],
      required: true,
    },

    title: { type: String, trim: true, maxlength: 150, required: true },
    metric: { type: String, trim: true, maxlength: 100, required: true },
    reason: { type: String, trim: true, maxlength: 300, default: "" },

    currentValue: { type: Number, min: 0 },
    targetValue: { type: Number, min: 0, required: true },
    unit: { type: String, trim: true, maxlength: 40, required: true },

    frequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
    source: {
      type: String,
      enum: ["suggestion", "manual"],
      default: "suggestion",
    },

    active: { type: Boolean, default: true },
    archivedAt: Date,

    logs: [
      {
        _id: false,
        date: { type: String, required: true },
        completed: { type: Boolean, default: true },
        actualValue: { type: Number, min: 0 },
        completedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, categoryId: 1, metric: 1, active: 1 });

module.exports = mongoose.model("Goal", goalSchema);
