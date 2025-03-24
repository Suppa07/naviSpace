const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const chatbotController = require("../controllers/chatbotController");

router.post("/", authenticateToken, chatbotController.handleChatbotRequest);

module.exports = router;