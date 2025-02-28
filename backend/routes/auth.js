var express = require("express");
var router = express.Router();
const userController = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.get("/protected", authenticateToken, userController.getProtected);
router.post("/logout", userController.logout);

module.exports = router;
