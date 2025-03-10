const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const Favourite = require("../models/Favourite");
const User = require("../models/User");
const Floor = require("../models/Floor");
const PathFinding = require("pathfinding");
const { createGetObjectPreSignedURL } = require("./s3");

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

    const session = await Reservation.startSession();
    try {
      await session.withTransaction(async () => {
        const newReservation = new Reservation({
          resource_id: resourceId,
          resource_type: resource.resource_type,
          participants: [req.user.id],
          start_time: startTime,
          end_time: endTime,
        });

        await newReservation.save({ session });
      });
      await session.commitTransaction();
      res.json({ message: "Resource booked successfully" });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAvailability = async (req, res) => {
  const { resourceType, page = 1, limit = 9, search = '' } = req.query;
  const skip = (page - 1) * limit;

  try {
    const companyId = await User.findOne({ _id: req.user.id }, "company_id");
    
    // Build search query
    let searchQuery = {
      resource_type: resourceType,
      company_id: companyId.company_id
    };

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'amenities': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalResources = await Resource.countDocuments(searchQuery);

    // Get paginated resources
    const resources = await Resource.find(searchQuery)
      .populate("floor_id", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ name: 1 });

    // Get reservations for these resources
    const reservations = await Reservation.find({
      resource_id: { $in: resources.map((r) => r._id) },
      end_time: { $gt: new Date() },
    }).populate("resource_id");

    res.json({
      resources,
      reservations,
      pagination: {
        total: totalResources,
        pages: Math.ceil(totalResources / limit),
        currentPage: parseInt(page),
        hasMore: skip + resources.length < totalResources
      }
    });
  } catch (err) {
    console.error("Error fetching resources:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.markFavorite = async (req, res) => {
  const { resourceType, resourceId } = req.body;

  try {
    const existingFavorite = await Favourite.findOne({
      resource_id: resourceId,
      user_id: req.user.id,
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
        select: "name",
      },
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
        select: "name",
      },
    });

    res.json(unexpiredReservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getPastReservations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of reservations per page
    const skipAmount = (page - 1) * limit;

    // Calculate the date for one week ago from the current page
    const weeksToGoBack = page - 1;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (7 * weeksToGoBack));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const pastReservations = await Reservation.find({
      participants: req.user.id,
      end_time: { 
        $lte: endDate,
        $gte: startDate
      }
    })
    .sort({ end_time: -1 })
    .skip(skipAmount)
    .limit(limit)
    .populate({
      path: "resource_id",
      populate: {
        path: "floor_id",
        select: "name",
      },
    });

    // Check if there are more reservations
    const hasMore = await Reservation.exists({
      participants: req.user.id,
      end_time: { $lt: startDate }
    });

    res.json({
      reservations: pastReservations,
      hasMore: !!hasMore,
      currentPage: page
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getResourceLocation = async (req, res) => {
  const { resourceId } = req.params;

  try {
    const resource = await Resource.findById(resourceId).populate("floor_id");
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const user = await User.findById(req.user.id);
    if (user.company_id.toString() !== resource.company_id.toString()) {
      return res
        .status(403)
        .json({ error: "You don't have access to this resource" });
    }

    // Get presigned URL for the floor plan
    const { s3Response: presignedUrl, error } =
      await createGetObjectPreSignedURL(resource.floor_id.layout_url);
    if (error) {
      throw new Error("Failed to generate floor plan URL");
    }

    res.json({
      resource: {
        _id: resource._id,
        name: resource.name,
        type: resource.resource_type,
        location: resource.location,
        floor: {
          _id: resource.floor_id._id,
          name: resource.floor_id.name,
          floor_number: resource.floor_id.floor_number,
          layout_url: presignedUrl,
          walkable_paths: resource.floor_id.walkable_paths,
          base_location: resource.floor_id.base_location,
          realx: resource.floor_id.realx,
          realy: resource.floor_id.realy,
        },
      },
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

    // Generate presigned URLs for each floor plan
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

exports.deleteReservation = async (req, res) => {
  const { reservationId } = req.params;

  try {
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (!reservation.participants.includes(req.user.id)) {
      return res
        .status(403)
        .json({ error: "You don't have access to this reservation" });
    }

    await Reservation.findByIdAndDelete(reservationId);

    res.json({ message: "Reservation deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.findPath = async (req, res) => {
  const { start_point, end_point, start_floor, end_floor } = req.body;

  try {
    const startFloor = await Floor.findOne({
      company_id: req.user.company_id,
      floor_number: start_floor,
    });

    const endFloor = await Floor.findOne({
      company_id: req.user.company_id,
      floor_number: end_floor,
    });

    if (!startFloor || !endFloor) {
      return res.status(404).json({ error: "Floor not found" });
    }

    let path = [];
    let instructions = [];

    if (start_floor === end_floor) {
      const grid = createNavigationGrid(startFloor);
      const finder = new PathFinding.AStarFinder({
        allowDiagonal: true,
        dontCrossCorners: true,
      });

      path = finder.findPath(
        Math.round(start_point[0]),
        Math.round(start_point[1]),
        Math.round(end_point[0]),
        Math.round(end_point[1]),
        grid.clone()
      );

      instructions = generateInstructions(path, startFloor);
    } else {
      const { path: multiFloorPath, instructions: multiFloorInstructions } =
        await calculateMultiFloorPath(
          start_point,
          end_point,
          startFloor,
          endFloor
        );

      path = multiFloorPath;
      instructions = multiFloorInstructions;
    }

    res.json({
      path,
      instructions,
      estimated_time: calculateEstimatedTime(path),
      distance: calculateTotalDistance(path),
    });
  } catch (error) {
    console.error("Error finding path:", error);
    res.status(500).json({ error: "Failed to calculate path" });
  }
};

exports.searchDestination = async (req, res) => {
  const { query, type } = req.query;

  try {
    let searchQuery = {
      company_id: req.user.company_id,
    };

    if (type) {
      searchQuery.resource_type = type;
    }

    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ];
    }

    const resources = await Resource.find(searchQuery).populate(
      "floor_id",
      "name floor_number"
    );

    res.json(resources);
  } catch (error) {
    console.error("Error searching destinations:", error);
    res.status(500).json({ error: "Failed to search destinations" });
  }
};

exports.searchUserReservations = async (req, res) => {
  const { query } = req.query;
  const companyId = await User.findOne({ _id: req.user.id }, "company_id");
  console.log(companyId);
  try {
    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email_id: { $regex: query, $options: "i" } },
      ],
      company_id: companyId.company_id, // Only search within same company
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find current active reservation
    const now = new Date();
    const reservation = await Reservation.findOne({
      participants: user._id,
      start_time: { $lte: now },
      end_time: { $gt: now },
    });

    if (!reservation) {
      return res.json({ user, reservation: null });
    }

    // Get resource details
    const resource = await Resource.findById(reservation.resource_id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Get floor details
    const floor = await Floor.findById(resource.floor_id);
    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }

    // Get presigned URL for the floor plan
    const { s3Response: floorPlanUrl, error } =
      await createGetObjectPreSignedURL(floor.layout_url);
    if (error) {
      console.error("Error generating floor plan URL:", error);
    }

    // Return all relevant information
    res.json({
      user,
      reservation,
      resource,
      floor: {
        ...floor.toObject(),
        layout_url: error ? null : floorPlanUrl,
      },
    });
  } catch (error) {
    console.error("Error searching user reservations:", error);
    res.status(500).json({ error: "Failed to search for user reservations" });
  }
};

function createNavigationGrid(floor) {
  const grid = new PathFinding.Grid(100, 100);

  floor.walkable_paths.forEach((path) => {
    const { start_point, end_point } = path;
    markPathAsWalkable(grid, start_point, end_point);
  });

  return grid;
}

function markPathAsWalkable(grid, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  for (let i = 0; i <= steps; i++) {
    const x = Math.round(start[0] + (dx * i) / steps);
    const y = Math.round(start[1] + (dy * i) / steps);
    grid.setWalkableAt(x, y, true);
  }
}

function generateInstructions(path, floor) {
  const instructions = [];
  let currentDirection = null;
  let steps = 0;

  for (let i = 1; i < path.length; i++) {
    const [prevX, prevY] = path[i - 1];
    const [currX, currY] = path[i];

    const dx = currX - prevX;
    const dy = currY - prevY;

    let newDirection;
    if (dx > 0) newDirection = "right";
    else if (dx < 0) newDirection = "left";
    else if (dy > 0) newDirection = "forward";
    else if (dy < 0) newDirection = "backward";

    if (newDirection !== currentDirection) {
      if (currentDirection) {
        instructions.push({
          action: "move",
          direction: currentDirection,
          distance: steps,
        });
      }
      currentDirection = newDirection;
      steps = 1;
    } else {
      steps++;
    }
  }

  if (currentDirection) {
    instructions.push({
      action: "move",
      direction: currentDirection,
      distance: steps,
    });
  }

  return addLandmarks(instructions, path, floor);
}

function addLandmarks(instructions, path, floor) {
  return instructions.map((instruction) => {
    const nearbyResources = findNearbyResources(path, floor);
    if (nearbyResources.length > 0) {
      instruction.landmark = nearbyResources[0];
    }
    return instruction;
  });
}

async function calculateMultiFloorPath(
  startPoint,
  endPoint,
  startFloor,
  endFloor
) {
  const path = [];
  const instructions = [];

  const startTransition = findNearestTransitionPoint(
    startPoint,
    startFloor,
    endFloor.floor_number
  );

  const endTransition = findNearestTransitionPoint(
    endPoint,
    endFloor,
    startFloor.floor_number
  );

  const startFloorPath = calculateSingleFloorPath(
    startPoint,
    startTransition.location,
    startFloor
  );
  path.push(...startFloorPath);

  instructions.push({
    action: "transition",
    type: startTransition.type,
    from_floor: startFloor.floor_number,
    to_floor: endFloor.floor_number,
  });

  const endFloorPath = calculateSingleFloorPath(
    endTransition.location,
    endPoint,
    endFloor
  );
  path.push(...endFloorPath);

  return { path, instructions };
}

function calculateEstimatedTime(path) {
  const walkingSpeed = 1.4;
  const distance = calculateTotalDistance(path);
  return Math.round(distance / walkingSpeed);
}

function calculateTotalDistance(path) {
  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    const [x1, y1] = path[i - 1];
    const [x2, y2] = path[i];
    distance += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  return distance;
}

module.exports = exports;