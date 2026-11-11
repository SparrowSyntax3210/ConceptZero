const express = require("express");
const app = express();
const path = require("path");
const userRoutes = require("./routes/user.routes");
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../../frontend/public/src")));
app.use("/api/users", userRoutes);
app.use("/api/profile", require("./routes/Profile.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/analysis", require("./routes/analysis.routes"));
app.use("/api/goals", require("./routes/goal.routes"));

app.get("/test", (req, res) => {
  res.send("Hello World");
});

module.exports = app;
