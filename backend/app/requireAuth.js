const crypto = require("crypto");
const User = require("./models/user.model");

function getCookie(req, name) {
  const item = (req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : null;
}

async function requireAuth(req, res, next) {
  const token = getCookie(req, "stacked_session");
  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      sessionTokenHash: tokenHash,
      sessionExpiresAt: { $gt: new Date() },
    }).select("_id username email");

    if (!user) return res.status(401).json({ message: "Your session has expired" });
    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication check failed:", error);
    return res.status(500).json({ message: "Could not verify your session" });
  }
}

module.exports = requireAuth;
