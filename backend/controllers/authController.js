const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

const JWT_SECRET = process.env.JWT_SECRET;

exports.signup = async (req, res) => {
  const { username, email_id, password, role, company_name } = req.body;

  try {
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
    console.error(err);
    res.status(500).send("Error adding user to MongoDB!");
  }
};

exports.login = async (req, res) => {
  const { email_id, password } = req.body;

  try {
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
