const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

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
    const { username, email_id, password, role, company_name } = signupSchema.parse(req.body);

    let company = await Company.findOne({ company_name });

    if (role === "admin" && !company) {
      company = new Company({ company_name });
      await company.save();
    }

    if (role !== "admin" && !company) {
      return res
        .status(400)
        .json({
          message: "Company does not exist. Contact an admin to register.",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email_id,
      password: hashedPassword,
      role,
      company_id: company._id,
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false,
      maxAge: 3600000,
    });

    res.json({
      message: "User registered successfully",
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
