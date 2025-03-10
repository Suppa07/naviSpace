const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const Favourite = require("../models/Favourite");
const User = require("../models/User");
const Floor = require("../models/Floor");
const PathFinding = require("pathfinding");

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

exports.getResourceLocation = async (req, res) => {
  const { resourceId } = req.params;

  try {
    const resource = await Resource.findById(resourceId).populate("floor_id");
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Check if user belongs to the same company as the resource
    const user = await User.findById(req.user.id);
    if (user.company_id.toString() !== resource.company_id.toString()) {
      return res
        .status(403)
        .json({ error: "You don't have access to this resource" });
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
          layout_url: resource.floor_id.layout_url,
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
    res.json(floors);
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

    // Check if user is a participant of the reservation
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
    // Get floor information
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

    // If same floor, use A* pathfinding
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
      // Multi-floor navigation
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

function createNavigationGrid(floor) {
  // Create a grid based on walkable paths
  const grid = new PathFinding.Grid(100, 100); // Using 100x100 grid for simplicity

  // Mark walkable paths
  floor.walkable_paths.forEach((path) => {
    const { start_point, end_point } = path;
    markPathAsWalkable(grid, start_point, end_point);
  });

  return grid;
}

function markPathAsWalkable(grid, start, end) {
  // Mark all points between start and end as walkable
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
  // Find nearby resources to use as landmarks
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

  // Find nearest transition point on start floor
  const startTransition = findNearestTransitionPoint(
    startPoint,
    startFloor,
    endFloor.floor_number
  );

  // Find nearest transition point on end floor
  const endTransition = findNearestTransitionPoint(
    endPoint,
    endFloor,
    startFloor.floor_number
  );

  // Calculate path on start floor
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

  // Calculate path on end floor
  const endFloorPath = calculateSingleFloorPath(
    endTransition.location,
    endPoint,
    endFloor
  );
  path.push(...endFloorPath);

  return { path, instructions };
}

function calculateEstimatedTime(path) {
  // Assume average walking speed of 1.4 meters per second
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
