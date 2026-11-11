const mongoose = require("mongoose");
const { Schema } = mongoose;

const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    level: { type: Number, min: 1, max: 10 },
  },
  { _id: false },
);

const experienceSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["project", "hackathon", "internship", "certification", "other"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    completedAt: Date,
  },
  { _id: false },
);

const academicsCareerGrowthSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    academicProfile: {
      course: { type: String, trim: true, maxlength: 150 },
      year: { type: Number, min: 1, max: 20 },
      semester: { type: Number, min: 1, max: 40 },
      currentGradeValue: { type: Number, min: 0 },
      currentGradeScale: { type: Number, enum: [4, 10, 100] },
    },
    academicGoals: {
      targetGradeValue: { type: Number, min: 0 },
      targetGradeScale: { type: Number, enum: [4, 10, 100] },
      goals: [{ type: String, trim: true, maxlength: 250 }],
    },
    studyRoutine: {
      dailyStudyHours: { type: Number, min: 0, max: 24 },
      attendancePct: { type: Number, min: 0, max: 100 },
      assignmentOnTimePct: { type: Number, min: 0, max: 100 },
    },
    careerObjective: {
      desiredRole: { type: String, trim: true, maxlength: 150 },
      industry: { type: String, trim: true, maxlength: 150 },
      targetCompanies: [{ type: String, trim: true, maxlength: 150 }],
    },
    technicalSkills: { type: [skillSchema], default: [] },
    practicalExperience: { type: [experienceSchema], default: [] },
    careerPreparation: {
      dsaPracticeDaysPerWeek: { type: Number, min: 0, max: 7 },
      problemsSolvedPerWeek: { type: Number, min: 0, max: 1000 },
      consistencyRating: { type: Number, min: 1, max: 10 },
    },
    satisfaction: { type: Number, min: 1, max: 10, required: true },
    metrics: {
      normalizedCurrentGradePct: { type: Number, min: 0, max: 100 },
      normalizedTargetGradePct: { type: Number, min: 0, max: 100 },
      gradeGoalGapPct: Number,
      weeklyStudyHours: { type: Number, min: 0 },
      assignmentConsistencyPct: { type: Number, min: 0, max: 100 },
      careerPrepScore: { type: Number, min: 0, max: 100 },
      skillsInProgressCount: { type: Number, min: 0 },
      dataDays: { type: Number, min: 0 },
      coveragePct: { type: Number, min: 0, max: 100 },
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "AcademicsCareerGrowth",
  academicsCareerGrowthSchema,
);
