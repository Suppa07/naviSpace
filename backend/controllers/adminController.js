const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const Floor = require("../models/Floor");
const Company = require("../models/Company");
const {
  uploadFileToS3,
  createGetObjectPreSignedURL,
  deleteObjectFromS3,
} = require("./s3");
const axios = require('axios');
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET;

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let query = { company_id: req.user.company_id };
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email_id: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ created_at: -1 });

    res.json({
      users,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: skip + users.length < total,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users.");
  }
};

exports.getAllReservations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let query = { end_time: { $gt: new Date() } };
    if (search) {
      const resources = await Resource.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      query.$or = [{ resource_id: { $in: resources.map((r) => r._id) } }];
    }

    const total = await Reservation.countDocuments(query);
    const reservations = await Reservation.find(query)
      .populate("resource_id")
      .skip(skip)
      .limit(limit)
      .sort({ start_time: 1 });

    res.json({
      reservations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: skip + reservations.length < total,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching reservations.");
  }
};

exports.getAllResources = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let query = { company_id: req.user.company_id };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { resource_type: { $regex: search, $options: "i" } },
        { amenities: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Resource.countDocuments(query);
    const resources = await Resource.find(query)
      .populate("floor_id", "name")
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    res.json({
      resources,
      total,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: skip + resources.length < total,
      },
    });
  } catch (err) {
    console.error("Error fetching resources:", err);
    res.status(500).send("Error fetching resources.");
  }
};

exports.reserveResource = async (req, res) => {
  const { resource_id, user_id, start_time, end_time } = req.body;
  const session = await Reservation.startSession();

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(user_id).session(session);
      const resource = await Resource.findById(resource_id)
        .select("resource_type name")
        .session(session);

      if (!user || !resource) throw new Error("User or Resource not found.");

      if (user.company_id.toString() !== req.user.company_id.toString()) {
        throw new Error("Cannot reserve for users outside your company.");
      }

      const existingReservation = await Reservation.findOne({
        resource_id,
        $or: [
          { start_time: { $lte: end_time }, end_time: { $gte: start_time } },
          { start_time: { $lte: start_time }, end_time: { $gte: end_time } },
          { start_time: { $gte: start_time }, end_time: { $lte: end_time } },
        ],
      }).session(session);

      if (existingReservation) {
        throw new Error("Resource is already reserved for the given time slot.");
      }

      const newReservation = new Reservation({
        resource_id,
        start_time,
        end_time,
        participants: [user_id],
        resource_type: resource.resource_type,
        is_fixed: false,
      });

      await newReservation.save({ session });

      // Send email notification to the user
      try {
        const startDateTime = new Date(start_time).toLocaleString();
        const endDateTime = new Date(end_time).toLocaleString();
        
        await axios.post('http://localhost:5001/send-notification-to-user', {
          user: user.email_id,
          subject: 'New Reservation Created',
          text: `A new reservation has been created for you for ${resource.name}`,
          html: `
            <h2>New Reservation Created</h2>
            <p>A new reservation has been created for you with the following details:</p>
            <ul>
              <li><strong>Resource:</strong> ${resource.name}</li>
              <li><strong>Type:</strong> ${resource.resource_type}</li>
              <li><strong>Start Time:</strong> ${startDateTime}</li>
              <li><strong>End Time:</strong> ${endDateTime}</li>
            </ul>
          `
        });
      } catch (emailError) {
        console.error('Error sending reservation notification:', emailError);
        // Continue with reservation creation even if email fails
      }
    });

    res.json({ message: "Resource reserved successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error reserving resource.");
  } finally {
    await session.endSession();
  }
};

const fs = require('fs');

exports.uploadFloorPlan = async (req, res) => {
  const { name } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send("File upload failed.");
  }
  console.log(file);

  try {
    const key = `floorplans/${Date.now()}-${path.basename(file.originalname)}`;

    console.log(file.path);
    const uploadResult = await uploadFileToS3(file, key);

    if (uploadResult.error) {
      throw new Error("Failed to upload to S3");
    }

    // Delete the file locally
    fs.unlinkSync(file.path);

    const newFloor = new Floor({
      company_id: req.user.company_id,
      name,
      layout_url: key,
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
    res.json({ message: "Floor plan uploaded successfully.", key });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading floor plan.");
  }
};

exports.addResource = async (req, res) => {
  const { resource_type, floor_id, location, name, capacity, amenities } = req.body;

  try {
    if (!Array.isArray(location) || location.length !== 2) {
      return res.status(400).json({ error: "Invalid location format. Expected [x, y]." });
    }

    if (isNaN(parseFloat(location[0])) || isNaN(parseFloat(location[1]))) {
      return res.status(400).json({ error: "Location coordinates must be numeric values." });
    }

    const floor = await Floor.findById(floor_id);
    if (!floor) {
      return res.status(404).json({ error: "Floor not found." });
    }

    if (floor.company_id.toString() !== req.user.company_id.toString()) {
      return res.status(403).json({
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

    // Send email notification to all users in the company
    try {
      const companyUsers = await User.find({ company_id: req.user.company_id });
      const userEmails = companyUsers.map(user => user.email_id);

      await axios.post('http://localhost:5001/send-bulk-notification', {
        emails: userEmails,
        subject: 'New Resource Added',
        text: `A new ${resource_type} has been added: ${name}`,
        html: `
          <h2>New Resource Added</h2>
          <p>A new resource has been added to your company with the following details:</p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Type:</strong> ${resource_type}</li>
            <li><strong>Capacity:</strong> ${capacity}</li>
            <li><strong>Floor:</strong> ${floor.name}</li>
            ${amenities?.length ? `<li><strong>Amenities:</strong> ${amenities.join(', ')}</li>` : ''}
          </ul>
        `
      });
    } catch (emailError) {
      console.error('Error sending resource notification:', emailError);
      // Continue with resource creation even if email fails
    }

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

    const floorsWithUrls = await Promise.all(
      floors.map(async (floor) => {
        const { s3Response: presignedUrl, error } =
          await createGetObjectPreSignedURL(floor.layout_url);
        return {
          ...floor.toObject(),
          layout_url: error ? null : presignedUrl,
        };
      })
    );

    res.json(floorsWithUrls);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching floor plans.");
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

    const { error } = await deleteObjectFromS3(floor.layout_url);
    if (error) {
      console.error("Error deleting from S3:", error);
    }

    const resources = await Resource.find({ floor_id: floor._id });
    await Resource.deleteMany({ floor_id: floor._id });
    await Reservation.deleteMany({
      resource_id: { $in: resources.map((r) => r._id) },
    });
    await Floor.deleteOne({ _id: floor._id });
    res.json({ message: "Floor plan deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting floor plan.");
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
    await Favourite.deleteMany({ resource_id: resource._id });
    res.json({ message: "Resource removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing resource.");
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

module.exports = exports;