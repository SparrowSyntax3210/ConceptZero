const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const User = require("../models/user.model");

const SESSION_COOKIE = "stacked_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function getSessionToken(req) {
  const cookies = (req.headers.cookie || "").split(";");
  const entry = cookies.find((cookie) =>
    cookie.trim().startsWith(`${SESSION_COOKIE}=`),
  );
  return entry ? entry.trim().slice(SESSION_COOKIE.length + 1) : null;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(req, res, token) {
  const secure =
    req.secure || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`,
  );
}

async function startSession(user, req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  user.sessionTokenHash = hashToken(token);
  user.sessionExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await user.save();
  setSessionCookie(req, res, token);
}

router.post("/register", async (req, res) => {
  const username = (req.body?.username || req.body?.name || "").trim();
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password;

  if (!username || !email || !password) {
    return res.status(400).send("Name, email, and password are required.");
  }

  try {
    const user = await User.create({ username, email, password });
    await startSession(user, req, res);
    return res.redirect(303, "/");
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "account";
      return res
        .status(409)
        .send(`An account with this ${field} already exists.`);
    }
    if (error.name === "ValidationError") {
      return res.status(400).send(error.message);
    }
    console.error("Error registering user:", error);
    return res.status(500).send("Error registering user");
  }
});

router.post("/login", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password;

  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).send("Invalid email or password");

    await startSession(user, req, res);
    return res.redirect(303, "/");
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).send("Error logging in");
  }
});

router.get("/status", async (req, res) => {
  const token = getSessionToken(req);
  if (!token) return res.json({ authenticated: false, user: null });

  try {
    const user = await User.findOne({
      sessionTokenHash: hashToken(token),
      sessionExpiresAt: { $gt: new Date() },
    }).select("_id username email");

    if (!user) return res.json({ authenticated: false, user: null });
    return res.json({
      authenticated: true,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Error checking login status:", error);
    return res.status(500).json({ message: "Could not check login status" });
  }
});

router.post("/logout", async (req, res) => {
  const token = getSessionToken(req);
  if (token) {
    try {
      await User.updateOne(
        { sessionTokenHash: hashToken(token) },
        { $unset: { sessionTokenHash: 1, sessionExpiresAt: 1 } },
      );
    } catch (error) {
      console.error("Error logging out:", error);
      return res.status(500).send("Error logging out");
    }
  }

  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${
      req.secure || process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return res.sendStatus(204);
});

router.post("/forgot-password", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const newPassword = req.body?.newPassword;
  if (!email || !newPassword) {
    return res.status(400).send("Email and new password are required.");
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { password: newPassword },
    );
    if (!user) return res.status(404).send("User not found");
    return res.send("Password reset successful");
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).send("Error resetting password");
  }
});

module.exports = router;
