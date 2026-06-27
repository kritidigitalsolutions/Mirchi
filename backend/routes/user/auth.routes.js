const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOtp,
  googleLogin,
  websiteSSOLogin,
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

// ========================================
// GOOGLE LOGIN
// ========================================
router.post(
  "/google-login",
  googleLogin
);

// ========================================
// WEBSITE SSO LOGIN
// ========================================
router.post(
  "/website-login",
  websiteSSOLogin
);


module.exports = router;