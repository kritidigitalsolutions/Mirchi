const express = require("express");
const router = express.Router();

const { isAuth, optionalAuth } = require("../../middlewares/auth.middleware");
const {
  startSession,
  progressSession,
  shareContent,
  continueWatching,
} = require("../../controllers/watch.controller");

// Guests are tracked by deviceId; logged-in users by token
router.post("/start", optionalAuth, startSession);
router.post("/progress", optionalAuth, progressSession);
router.post("/share", optionalAuth, shareContent);

router.get("/continue", isAuth, continueWatching);

module.exports = router;
