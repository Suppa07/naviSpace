const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authenticateAdmin = require("../middleware/authenticateAdmin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Floor management routes
  router.post("/floor/base-location", authenticateAdmin, adminController.setBaseLocation);
router.post("/floor-plan", authenticateAdmin, upload.single("floorPlan"), adminController.uploadFloorPlan);
router.get("/floorplans", authenticateAdmin, adminController.getAllFloorPlans);
router.delete("/floorplan/:floor_id", authenticateAdmin, adminController.deleteFloorPlan);

// User management routes
router.get("/users", authenticateAdmin, adminController.getAllUsers);
router.delete("/users/:user_id", authenticateAdmin, adminController.removeUser);

// Resource management routes
router.get("/resources", authenticateAdmin, adminController.getAllResources);
router.post("/resources", authenticateAdmin, adminController.addResource);
router.delete("/resource/:resource_id", authenticateAdmin, adminController.deleteResource);

// Reservation management routes
router.get("/reservations", authenticateAdmin, adminController.getAllReservations);
router.post("/reserve", authenticateAdmin, adminController.reserveResource);
router.delete("/reservation/:reservation_id", authenticateAdmin, adminController.deleteReservation);

module.exports = router;