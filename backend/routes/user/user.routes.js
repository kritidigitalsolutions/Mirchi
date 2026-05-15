const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  getProfile,
  completeProfile,
  updateProfile,
} = require("../../controllers/user.controller");


// ========================================
// GET USER PROFILE
// ========================================
router.get(
  "/",
  isAuth,
  getProfile
);

router.get(
  "/profile",
  isAuth,
  getProfile
);


// ========================================
// COMPLETE PROFILE
// ========================================
router.post(
  "/complete-profile",
  isAuth,
  upload.single("profileImage"),
  completeProfile
);


// ========================================
// UPDATE PROFILE
// ========================================
router.patch(
  "/update-profile",
  isAuth,
  upload.single("profileImage"),
  updateProfile
);


module.exports = router;