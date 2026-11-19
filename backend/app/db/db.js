const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Read local environment files as soon as the database module loads so the
// server can use values such as PORT before its first request.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in the environment");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};
module.exports = connectDB;
