const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOtp,
} = require("../../controllers/auth.controller");


// ========================================
// SEND OTP
// ========================================
router.post(
  "/send-otp",
  sendOTP
);


// ========================================
// VERIFY OTP
// ========================================
router.post(
  "/verify-otp",
  verifyOtp
);


module.exports = router;