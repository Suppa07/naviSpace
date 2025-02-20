var express = require("express");
var router = express.Router();
const bcrypt = require("bcryptjs"); 
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to authenticate using token from cookies
function authenticateToken(req, res, next) {
  const token = req.cookies.jwt; // Get token from cookies

  if (!token) return res.status(401).send("Access denied. No token provided.");

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send("Access denied. Invalid token.");
    req.user = user;
    next();
  });
}

// User Signup
router.post("/signup", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword, role });

    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "1h" });

    // Set token in HTTP-only cookie
    res.cookie("jwt", token, {
      httpOnly: true, // Prevents JavaScript access
      secure: false, // Only HTTPS in production
      maxAge: 3600000, // 1 hour  
    });

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding user to MongoDB!");
  }
});

// User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(400).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid credentials");

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    // Set token in HTTP-only cookie
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false,
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

// Protected Route
router.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: "Hello, authenticated user!",
    id: req.user.id,
  });
});

// Logout (Clear cookie)
router.post("/logout", (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
