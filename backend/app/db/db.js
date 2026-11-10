const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function connectDB() {
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
}

module.exports = connectDB;
