const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const axios = require("axios");

const JWT_SECRET = process.env.JWT_SECRET;

const { z } = require("zod");

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email_id: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.string().min(1, "Role is required"),
  company_name: z.string().min(1, "Company name is required"),
});

exports.signup = async (req, res) => {
  try {
    const { username, email_id, password, role, company_name } =
      signupSchema.parse(req.body);

    let company = await Company.findOne({ company_name });

    if (role === "admin" && !company) {
      company = new Company({ company_name });
      await company.save();
    }

    if (role !== "admin" && !company) {
      return res.status(400).json({
        message: "Company does not exist. Contact an admin to register.",
      });
    }

const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      username,
      email_id,
      password: hashedPassword,
      role,
      company_id: company._id,
      email_verified: false
    });

    await newUser.save();

    // Send verification email
    try {
      await axios.post('http://localhost:5001/send-verification-mail', {
        email: email_id
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with signup even if email fails
    }

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false,
      maxAge: 3600000,
    });

    res.json({
      message: "User registered successfully. Please check your email for verification.",
      role: newUser.role,
      company_id: company._id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).send("Error adding user to MongoDB!");
  }
};

const loginSchema = z.object({
  email_id: z.string().email("Invalid email"),
  password: z.string().min(1, "Password cannot be empty"),
});

exports.login = async (req, res) => {
  try {
    const { email_id, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email_id });

    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.email_verified) {
      return res.status(403).json({ 
        error: "Please verify your email before logging in",
        needsVerification: true
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.json({ message: "Login successful", role: user.role });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getProtected = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("company_id", "company_name");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.logout = (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.json({ message: "Logged out successfully" });
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, verified } = req.body;
    
    if (!email || !verified) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid verification data" 
      });
    }

    const user = await User.findOne({ email_id: email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    user.email_verified = true;
    await user.save();

    res.json({ 
      success: true, 
      message: "Email verified successfully" 
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email_id: email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    await axios.post('http://localhost:5001/send-verification-mail', {
      email: email
    });

    res.json({ message: "Verification email sent successfully" });
  } catch (error) {
    console.error('Error resending verification:', error);
    res.status(500).json({ error: "Failed to resend verification email" });
  }
};