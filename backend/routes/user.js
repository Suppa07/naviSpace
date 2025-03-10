const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticateToken = require("../middleware/authenticateToken");

router.post("/book", authenticateToken, userController.bookResource);
router.get("/availability", authenticateToken, userController.getAvailability);
router.post("/favorite", authenticateToken, userController.markFavorite);
router.get("/favorites", authenticateToken, userController.getFavorites);
router.get("/reservations", authenticateToken, userController.getUnexpiredReservations);
router.get("/past-reservations", authenticateToken, userController.getPastReservations);
router.get("/resource-location/:resourceId", authenticateToken, userController.getResourceLocation);
router.get("/floorplans", authenticateToken, userController.getAllFloorPlans);  
router.delete("/reservation/:reservationId", authenticateToken, userController.deleteReservation);
router.get("/search-reservations", authenticateToken, userController.searchUserReservations);


module.exports = router;