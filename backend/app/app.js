const express = require("express");
const app = express();
const path = require("path");
const userRoutes = require("./routes/user.routes");
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../../frontend/public/src")));
app.use("/api/users", userRoutes);

app.get("/test", (req, res) => {
  res.send("Hello World");
});

module.exports = app;
