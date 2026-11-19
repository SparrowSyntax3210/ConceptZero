const mongoose = require("mongoose");
const { Schema } = mongoose;

const academicsCareerGrowthSchema = new Schema(
  {
    // User information
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Academic profile
    academicProfile: {
      course: { type: String, trim: true, maxlength: 150 },
      year: { type: Number, min: 1, max: 20 },
      semester: { type: Number, min: 1, max: 40 },
      currentGradeValue: { type: Number, min: 0 },
      currentGradeScale: { type: Number, enum: [4, 10, 100] },
    },

    // Academic goals
    academicGoals: {
      targetGradeValue: { type: Number, min: 0 },
      targetGradeScale: { type: Number, enum: [4, 10, 100] },
      goals: [{ type: String, trim: true, maxlength: 250 }],
    },

    // Study routine
    studyRoutine: {
      dailyStudyHours: { type: Number, min: 0, max: 24 },
      attendancePct: { type: Number, min: 0, max: 100 },
      assignmentOnTimePct: { type: Number, min: 0, max: 100 },
    },

    // Career goals
    careerObjective: {
      desiredRole: { type: String, trim: true, maxlength: 150 },
      industry: { type: String, trim: true, maxlength: 150 },
      targetCompanies: [{ type: String, trim: true, maxlength: 150 }],
    },

    // Technical skills
    technicalSkills: [
      {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        level: { type: Number, min: 1, max: 10 },
      },
    ],

    // Projects, internships and certifications
    practicalExperience: [
      {
        type: {
          type: String,
          enum: [
            "project",
            "hackathon",
            "internship",
            "certification",
            "other",
          ],
          required: true,
        },
        title: { type: String, required: true, trim: true, maxlength: 150 },
        completedAt: Date,
      },
    ],

    // Career preparation
    careerPreparation: {
      dsaPracticeDaysPerWeek: { type: Number, min: 0, max: 7 },
      problemsSolvedPerWeek: { type: Number, min: 0, max: 1000 },
      consistencyRating: { type: Number, min: 1, max: 10 },
    },

    // Overall satisfaction
    satisfaction: {
      type: Number,
      min: 1,
      max: 10,
      required: true,
    },

    // Calculated metrics
    metrics: {
      normalizedCurrentGradePct: Number,
      normalizedTargetGradePct: Number,
      gradeGoalGapPct: Number,
      weeklyStudyHours: Number,
      assignmentConsistencyPct: Number,
      careerPrepScore: Number,
      skillsInProgressCount: Number,
      dataDays: Number,
      coveragePct: Number,
      computedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "AcademicsCareerGrowth",
  academicsCareerGrowthSchema,
);
