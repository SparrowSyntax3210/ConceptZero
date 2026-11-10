const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // MongoDB generates this ObjectId automatically and other user-owned
  // documents can reference it with `ref: "User"`.
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  sessionTokenHash: {
    type: String,
    select: false,
  },
  sessionExpiresAt: {
    type: Date,
    select: false,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
