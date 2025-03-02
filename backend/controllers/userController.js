const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const Favourite = require("../models/Favourite");
const User = require("../models/User");

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
    });
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
    const favourites_1 = await Favourite.find({ user_id: req.user.id });
    console.log(favourites_1);

    const favourites = await Favourite.find({ user_id: req.user.id }).populate(
      "resource_id"
    );
    console.log(favourites);
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
    }).populate("resource_id");

    res.json(unexpiredReservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};