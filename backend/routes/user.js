const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticateToken = require("../middleware/authenticateToken");

router.post("/book", authenticateToken, userController.bookResource);
router.get("/availability", authenticateToken, userController.getAvailability);
router.post("/favorite", authenticateToken, userController.markFavorite);
router.get("/favorites", authenticateToken, userController.getFavorites);


module.exports = router;