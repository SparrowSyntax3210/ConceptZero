const express = require("express");
const mongoose = require("mongoose");
const app = express();
const userRoutes = require("./routes/user.routes");

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "https://stacked-alpha.vercel.app",
  "https://stacked-alpha.app",
  "https://www.stacked-alpha.app",
  ...configuredOrigins,
]);

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch (_error) {
    return false;
  }
}

// Middleware
app.use((req, res, next) => {
  const origin = req.get("Origin");

  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ message: "This website is not allowed to access the API." });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
    return res.sendStatus(204);
  }

  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Render uses /health to check whether the web process is listening.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// User APIs need MongoDB, so return a clear retryable response until it connects.
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    status: "starting",
    message: "The database is still connecting. Please retry shortly.",
  });
});

// API

app.use("/api/users", userRoutes);
app.use("/api/profile", require("./routes/Profile.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/analysis", require("./routes/analysis.routes"));
app.use("/api/goals", require("./routes/goal.routes"));

const readinessCheck = (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "starting",
    database: databaseReady ? "connected" : "disconnected",
  });
};
// This alias lets the Vercel frontend probe the Render service through the
// existing /api/* rewrite before issuing its normal API requests.
app.get("/api/health", readinessCheck);

app.get("/test", (req, res) => {
  res.send("Hello World");
});

module.exports = app;
