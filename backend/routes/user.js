const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticateToken = require("../middleware/authenticateToken");

router.post("/book", authenticateToken, userController.bookResource);
router.get("/availability", authenticateToken, userController.getAvailability);
router.post("/favorite", authenticateToken, userController.markFavorite);
router.get("/favorites", authenticateToken, userController.getFavorites);
router.get("/reservations", authenticateToken, userController.getUnexpiredReservations);
router.get("/resource-location/:resourceId", authenticateToken, userController.getResourceLocation);
router.get("/floorplans", authenticateToken, userController.getAllFloorPlans);


module.exports = router;