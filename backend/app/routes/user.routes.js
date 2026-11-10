const express = require("express");
const router = express.Router();
const User = require("../models/user.model");

router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const newUser = {
    username,
    email,
    password,
  };
  User.create(newUser)
    .then((user) => {
      res.send("User registered successfully");
    })
    .catch((error) => {
      res.status(500).send("Error registering user");
    });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email, password })
    .then((user) => {
      if (user) {
        res.send("Login successful");
      } else {
        res.status(401).send("Invalid email or password");
      }
    })
    .catch((error) => {
      res.status(500).send("Error logging in");
    });
});

module.exports = router;
