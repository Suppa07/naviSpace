var express = require("express");
var router = express.Router();
const userController = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/google", userController.googleLogin);
router.post("/complete-profile", authenticateToken, userController.completeProfile);
router.get("/protected", authenticateToken, userController.getProtected);
router.post("/logout", userController.logout);
router.post("/verify-email", userController.verifyEmail);
router.post("/resend-verification", userController.resendVerification);
router.post("/request-password-reset", userController.requestPasswordReset);
router.post("/reset-password", userController.resetPassword);

module.exports = router;