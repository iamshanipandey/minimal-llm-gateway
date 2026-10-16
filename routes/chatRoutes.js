const express = require("express");
const router = express.Router();

const {chatController} = require("../controllers/chatController");

router.post("/chat/complete", chatController);

module.exports = router;