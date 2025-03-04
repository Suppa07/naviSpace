const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const Favourite = require("../models/Favourite");
const User = require("../models/User");
const Floor = require("../models/Floor");

exports.bookResource = async (req, res) => {
  try {
    const { resourceId, startTime, endTime } = req.body;
    const resource = await Resource.findOne({ _id: resourceId });

    if (!resource) return res.status(404).json({ error: "Resource not found" });
    console.log(resource);

    const existingReservation = await Reservation.findOne({
      resource_id: resourceId,
      start_time: { $lte: endTime },
      end_time: { $gte: startTime },
    });

    if (existingReservation) {
      return res
        .status(400)
        .json({ error: "Resource is already booked for this time" });
    }

    const newReservation = new Reservation({
      resource_id: resourceId,
      resource_type: resource.resource_type,
      participants: [req.user.id],
      start_time: startTime,
      end_time: endTime,
    });

    await newReservation.save();

    res.json({ message: "Resource booked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAvailability = async (req, res) => {
  const { resourceType } = req.query;
  console.log(resourceType);
  try {
    const companyId = await User.findOne({ _id: req.user.id }, "company_id");
    const resources = await Resource.find({
      resource_type: resourceType,
      company_id: companyId.company_id,
    }).populate("floor_id", "name");
    
    const reservations = await Reservation.find({
      resource_id: { $in: resources.map((r) => r._id) },
      end_time: { $gt: new Date() },
    }).populate("resource_id");

    res.json({ resources, reservations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.markFavorite = async (req, res) => {
  const { resourceType, resourceId } = req.body;

  try {
    // Check if already favorited
    const existingFavorite = await Favourite.findOne({
      resource_id: resourceId,
      user_id: req.user.id
    });

    if (existingFavorite) {
      return res.json({ message: "Resource is already in favorites" });
    }

    const favorite = new Favourite({
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: req.user.id,
    });
    await favorite.save();

    res.json({ message: "Resource marked as favorite" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const favourites = await Favourite.find({ user_id: req.user.id }).populate({
      path: "resource_id",
      populate: {
        path: "floor_id",
        select: "name"
      }
    });
    
    res.json(favourites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUnexpiredReservations = async (req, res) => {
  try {
    const unexpiredReservations = await Reservation.find({
      participants: req.user.id,
      end_time: { $gt: new Date() },
    }).populate({
      path: "resource_id",
      populate: {
        path: "floor_id",
        select: "name"
      }
    });

    res.json(unexpiredReservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getResourceLocation = async (req, res) => {
  const { resourceId } = req.params;
  
  try {
    const resource = await Resource.findById(resourceId).populate("floor_id", "name layout_url");
    
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    
    // Check if user belongs to the same company as the resource
    const user = await User.findById(req.user.id);
    if (user.company_id.toString() !== resource.company_id.toString()) {
      return res.status(403).json({ error: "You don't have access to this resource" });
    }
    
    res.json({
      resource: {
        _id: resource._id,
        name: resource.name,
        type: resource.resource_type,
        location: resource.location,
        floor: resource.floor_id
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllFloorPlans = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const floors = await Floor.find({ company_id: user.company_id });
    res.json(floors);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching floor plans.");
  }
};