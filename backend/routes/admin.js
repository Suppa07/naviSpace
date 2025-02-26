const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const Floor = require("../models/Floor");
const Company = require("../models/Company");

const JWT_SECRET = process.env.JWT_SECRET;
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware to authenticate token and check admin role
function authenticateAdmin(req, res, next) {
  // console.log(req.cookies,"cookies");
  const token = req.cookies.jwt; // Get token from cookies

  if (!token) return res.status(401).send("Access denied. No token provided.");

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).send("Access denied. Invalid token.");

    // Fetch user details
    const adminUser = await User.findById(user.id);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).send("Access denied. Not an admin.");
    }

    req.user = adminUser;
    next();
  });
}

// Get all users in the admin's company
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({ company_id: req.user.company_id }).select(
      "-password"
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users.");
  }
});

// Get all resources and their active reservations
router.get("/resources", authenticateAdmin, async (req, res) => {
  try {
    console.log(req.user.company_id);
    const resources = await Resource.find({ company_id: req.user.company_id });
    console.log(resources);
    // Fetch reservations that haven't expired
    const reservations = await Reservation.find({
      resource_id: { $in: resources.map((r) => r._id) },
      end_time: { $gt: new Date() }, // Only future reservations
    });

    res.json({ resources, reservations });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching resources and reservations.");
  }
});

// Reserve a resource for a user
router.post("/reserve", authenticateAdmin, async (req, res) => {
  const { resource_id, user_id, start_time, end_time } = req.body;

  try {
    const user = await User.findById(user_id);
    const resource = await Resource.findById(resource_id);

    if (!user || !resource)
      return res.status(404).send("User or Resource not found.");
    if (user.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .send("Cannot reserve for users outside your company.");
    }

    const newReservation = new Reservation({
      resource_id,
      start_time,
      end_time,
      participants: [user_id],
      is_fixed: false,
    });

    await newReservation.save();
    res.json({ message: "Resource reserved successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error reserving resource.");
  }
});

// Upload a floor plan (URL stored in DB)
router.post(
  "/floor-plan",
  authenticateAdmin,
  upload.single("floorPlan"),
  async (req, res) => {
    const { name } = req.body;
    const filePath = req.file ? req.file.path : null;

    if (!filePath) {
      return res.status(400).send("File upload failed.");
    }

    try {
      const newFloor = new Floor({
        company_id: req.user.company_id,
        name,
        layout_url: `uploads/${req.file.filename}`,
      });

      await newFloor.save();
      res.json({ message: "Floor plan uploaded successfully.", filePath });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error uploading floor plan.");
    }
  }
);

// Add a new resource
router.post("/resources", authenticateAdmin, async (req, res) => {
  console.log(req.body);
  const { resource_type, floor_id, location, name, capacity, amenities } =
    req.body;

  try {
    if (!Array.isArray(location) || location.length !== 2) {
      return res
        .status(400)
        .json({ error: "Invalid location format. Expected [x, y]." });
    }

    const newResource = new Resource({
      resource_type,
      floor_id,
      location, // Already an array [x, y]
      name,
      capacity,
      amenities,
      company_id: req.user.company_id,
    });

    await newResource.save();
    res.json({ message: "Resource added successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding resource");
  }
});

// Remove a user (only if they belong to the same company)
router.delete("/users/:user_id", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.user_id);

    if (!user) return res.status(404).send("User not found.");
    if (user.company_id.toString() !== req.user.company_id.toString()) {
      return res.status(403).send("Cannot remove users outside your company.");
    }

    await User.deleteOne({ _id: user._id });
    res.json({ message: "User removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing user.");
  }
});

// Get all floor plans for the company
router.get("/floorplans", authenticateAdmin, async (req, res) => {
  try {
    const floors = await Floor.find({ company_id: req.user.company_id });
    res.json(floors);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching floor plans.");
  }
});

module.exports = router;
