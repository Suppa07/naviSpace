// const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const Floor = require("../models/Floor");
// const Company = require("../models/Company");
// const fs = require("fs");
// const path = require("path");

// const JWT_SECRET = process.env.JWT_SECRET;

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ company_id: req.user.company_id }).select(
      "-password"
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users.");
  }
};

exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find({ company_id: req.user.company_id });
    const reservations = await Reservation.find({
      resource_id: { $in: resources.map((r) => r._id) },
      end_time: { $gt: new Date() },
    }).populate("resource_id");

    res.json({ resources, reservations });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching resources and reservations.");
  }
};

exports.reserveResource = async (req, res) => {
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
      resource_type: await Resource.findById(resource_id).select(
        "resource_type"
      ),
      is_fixed: false,
    });

    await newReservation.save();
    res.json({ message: "Resource reserved successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error reserving resource.");
  }
};
exports.uploadFloorPlan = async (req, res) => {
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
      base_location: {
        latitude: 0,
        longitude: 0,
      },
      realx: req.body.realx,
      realy: req.body.realy,
      floor_number: req.body.floor_number,
      walkable_paths: [],
      transition_points: [],
    });

    await newFloor.save();
    res.json({ message: "Floor plan uploaded successfully.", filePath });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading floor plan.");
  }
};
exports.addResource = async (req, res) => {
  const { resource_type, floor_id, location, name, capacity, amenities } =
    req.body;

  try {
    if (!Array.isArray(location) || location.length !== 2) {
      return res
        .status(400)
        .json({ error: "Invalid location format. Expected [x, y]." });
    }

    // Validate that location contains numeric values
    if (isNaN(parseFloat(location[0])) || isNaN(parseFloat(location[1]))) {
      return res
        .status(400)
        .json({ error: "Location coordinates must be numeric values." });
    }

    // Check if floor exists and belongs to the admin's company
    const floor = await Floor.findById(floor_id);
    if (!floor) {
      return res.status(404).json({ error: "Floor not found." });
    }

    if (floor.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .json({
          error: "Cannot add resources to floors outside your company.",
        });
    }

    const newResource = new Resource({
      resource_type,
      floor_id,
      location,
      name,
      capacity: parseInt(capacity) || 1,
      amenities: Array.isArray(amenities) ? amenities : [],
      company_id: req.user.company_id,
    });

    await newResource.save();
    res.json({
      message: "Resource added successfully.",
      resource: newResource,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding resource: " + err.message);
  }
};

exports.removeUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.user_id);

    if (!user) return res.status(404).send("User not found.");
    if (user.company_id.toString() !== req.user.company_id.toString()) {
      return res.status(403).send("Cannot remove users outside your company.");
    }

    await User.deleteOne({ _id: user._id });
    await Reservation.deleteMany({ participants: { $in: [user._id] } });
    res.json({ message: "User removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing user.");
  }
};

exports.getAllFloorPlans = async (req, res) => {
  try {
    const floors = await Floor.find({ company_id: req.user.company_id });
    res.json(floors);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching floor plans.");
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.resource_id);

    if (!resource) return res.status(404).send("Resource not found.");
    if (resource.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .send("Cannot remove resources outside your company.");
    }

    await Resource.deleteOne({ _id: resource._id });
    await Reservation.deleteMany({ resource_id: resource._id });
    res.json({ message: "Resource removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing resource.");
  }
};
exports.deleteFloorPlan = async (req, res) => {
  try {
    const floor = await Floor.findById(req.params.floor_id);

    if (!floor) return res.status(404).send("Floor plan not found.");
    if (floor.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .send("Cannot delete floor plans outside your company.");
    }

    const resources = await Resource.find({ floor_id: floor._id });
    await Resource.deleteMany({ floor_id: floor._id });
    await Reservation.deleteMany({ resource_id: { $in: resources.map((r) => r._id) } });
    await Floor.deleteOne({ _id: floor._id });
    res.json({ message: "Floor plan deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting floor plan.");
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.reservation_id);

    if (!reservation) return res.status(404).send("Reservation not found.");
    if (reservation.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .send("Cannot delete reservations outside your company.");
    }

    await Reservation.deleteOne({ _id: reservation._id });
    res.json({ message: "Reservation deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting reservation.");
  }
};

exports.setBaseLocation = async (req, res) => {
  const { floor_id, latitude, longitude, floor_number } = req.body;

  try {
    const floor = await Floor.findById(floor_id);

    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }

    if (floor.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .json({ error: "Cannot modify floors outside your company" });
    }

    floor.base_location = { latitude, longitude };
    floor.floor_number = floor_number;
    await floor.save();

    res.json({ message: "Base location set successfully", floor });
  } catch (error) {
    console.error("Error setting base location:", error);
    res.status(500).json({ error: "Failed to set base location" });
  }
};

exports.addWalkablePath = async (req, res) => {
  const { floor_id, start_point, end_point, path_type, distance } = req.body;

  try {
    const floor = await Floor.findById(floor_id);

    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }

    if (floor.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .json({ error: "Cannot modify floors outside your company" });
    }

    floor.walkable_paths.push({
      start_point,
      end_point,
      type: path_type,
      distance,
    });

    await floor.save();
    res.json({ message: "Walkable path added successfully", floor });
  } catch (error) {
    console.error("Error adding walkable path:", error);
    res.status(500).json({ error: "Failed to add walkable path" });
  }
};

exports.addTransitionPoint = async (req, res) => {
  const { floor_id, location, type, connected_floors } = req.body;

  try {
    const floor = await Floor.findById(floor_id);

    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }

    if (floor.company_id.toString() !== req.user.company_id.toString()) {
      return res
        .status(403)
        .json({ error: "Cannot modify floors outside your company" });
    }

    floor.transition_points.push({
      location,
      type,
      connected_floors,
    });

    await floor.save();
    res.json({ message: "Transition point added successfully", floor });
  } catch (error) {
    console.error("Error adding transition point:", error);
    res.status(500).json({ error: "Failed to add transition point" });
  }
};

module.exports = exports;
