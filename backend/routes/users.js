var express = require("express");
var router = express.Router();
const bcrypt = require("bcryptjs"); 
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to authenticate using token from cookies
function authenticateToken(req, res, next) {
  const token = req.cookies.jwt; // Get token from cookies

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Access denied. Invalid token." });
    req.user = user;
    next();
  });
}

// User Signup (Admin or User)
router.post("/signup", async (req, res) => {
  const { username, email_id, password, role, company_name } = req.body;

  try {
    // Check if the company exists
    let company = await Company.findOne({ company_name });

    // If user is admin and company does not exist, create a new company
    if (role === "admin" && !company) {
      company = new Company({ company_name });
      await company.save();
    }

    // If user is not admin and company does not exist, reject signup
    if (role !== "admin" && !company) {
      return res.status(400).json({ message: "Company does not exist. Contact an admin to register." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user with the resolved company ID
    const newUser = new User({
      username,
      email_id,
      password: hashedPassword,
      role,
      company_id: company._id, // Assign the found/created company
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "1h" });

    // Set token in HTTP-only cookie
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false,
      maxAge: 3600000, // 1 hour
    });

    res.json({ message: "User registered successfully", company_id: company._id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding user to MongoDB!");
  }
});

// User Login
router.post("/login", async (req, res) => {
  const { email_id, password } = req.body;

  try {
    const user = await User.findOne({ email_id });

    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

    // Set token in HTTP-only cookie
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get Current User (Protected)
router.get("/protected", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").populate("company_id", "company_name"); // Exclude password & show company name
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout (Clear cookie)
router.post("/logout", (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
