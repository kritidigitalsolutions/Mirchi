const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOtp,
  googleLogin,
  appleLogin,
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
// APPLE LOGIN
// ========================================
router.post(
  "/apple-login",
  appleLogin
);

// ========================================
// WEBSITE SSO LOGIN
// ========================================
router.post(
  "/website-login",
  websiteSSOLogin
);


module.exports = router;