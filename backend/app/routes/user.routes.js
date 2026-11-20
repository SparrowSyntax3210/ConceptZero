const express = require("express");
const crypto = require("crypto");
const User = require("../models/user.model");

const router = express.Router();

const COOKIE_NAME = "stacked_session";
const SESSION_TIME = 7 * 24 * 60 * 60;

// Get token from cookie
function getToken(req) {
  const cookies = req.headers.cookie || "";
  const token = cookies
    .split(";")
    .find((c) => c.trim().startsWith(COOKIE_NAME + "="));

  return token ? token.trim().split("=")[1] : null;
}

// Hash token
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Create session and cookie
async function createSession(user, req, res) {
  const token = crypto.randomBytes(32).toString("hex");

  user.sessionTokenHash = hashToken(token);
  user.sessionExpiresAt = new Date(Date.now() + SESSION_TIME * 1000);

  await user.save();

  res.cookie(COOKIE_NAME, token, {
    maxAge: SESSION_TIME * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
}

function respondAfterLogin(req, res, user) {
  if (req.accepts("json")) {
    return res.json({
      authenticated: true,
      user: { id: user._id, username: user.username, email: user.email },
    });
  }

  return res.redirect("/");
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).send("Please fill all fields");
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
    });

    await createSession(user, req, res);
    return respondAfterLogin(req, res, user);
  } catch (error) {
    res.status(500).send("Error registering user");
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user || user.password !== password) {
      return res.status(401).send("Invalid email or password");
    }

    await createSession(user, req, res);
    return respondAfterLogin(req, res, user);
  } catch (error) {
    res.status(500).send("Error logging in");
  }
});

// Check login status
router.get("/status", async (req, res) => {
  try {
    const token = getToken(req);

    if (!token) {
      return res.json({ authenticated: false });
    }

    const user = await User.findOne({
      sessionTokenHash: hashToken(token),
      sessionExpiresAt: { $gt: new Date() },
    }).select("_id username email");

    if (!user) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).send("Error checking login status");
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const token = getToken(req);

    if (token) {
      await User.updateOne(
        { sessionTokenHash: hashToken(token) },
        { $unset: { sessionTokenHash: 1, sessionExpiresAt: 1 } },
      );
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res.send("Logged out successfully");
  } catch (error) {
    res.status(500).send("Error logging out");
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).send("Please enter all fields");
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    user.password = newPassword;
    await user.save();

    res.send("Password reset successful");
  } catch (error) {
    res.status(500).send("Error resetting password");
  }
});

module.exports = router;
