const express = require("express");

const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  loginAdmin,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  getAdminProfile,
} = require("../../controllers/admin_auth/admin.auth.controller");

const {
  sendPasswordOtp,
  changePassword,
  sendEmailOtp,
  changeEmail,
} = require("../../controllers/admin_auth/admin.settings.controller");


// Admin Login
router.post(
  "/login",
  loginAdmin
);

// Get own profile
router.get(
  "/profile",
  isAdmin,
  getAdminProfile
);

// Get Bunny CDN credentials for client-side uploads
router.get(
  "/bunny-config",
  isAdmin,
  (req, res) => {
    try {
      res.json({
        success: true,
        storageZone: process.env.BUNNY_STORAGE_ZONE,
        accessKey: process.env.BUNNY_ACCESS_KEY,
        storageHost: (() => {
          const region = (process.env.BUNNY_REGION || "").trim().toLowerCase();
          const defaultHost = region && region !== "us"
            ? `${region}.storage.bunnycdn.com`
            : "storage.bunnycdn.com";
          return process.env.BUNNY_STORAGE_HOST || defaultHost;
        })(),
        cdnUrl: process.env.BUNNY_CDN_URL,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

//OTP
router.post(
  "/send-otp",
  sendForgotPasswordOtp
);

router.post(
  "/verify-otp",
  verifyForgotPasswordOtp
);

router.post(
  "/reset-password",
  resetForgotPassword
);

// --- CHANGE PASSWORD FLOW (Authenticated) ---
router.post(
  "/change-password/send-otp",
  isAdmin,
  sendPasswordOtp
);

router.post(
  "/change-password",
  isAdmin,
  changePassword
);

// --- CHANGE EMAIL FLOW (Authenticated) ---
router.post(
  "/change-email/send-otp",
  isAdmin,
  sendEmailOtp
);

router.post(
  "/change-email",
  isAdmin,
  changeEmail
);



module.exports = router;