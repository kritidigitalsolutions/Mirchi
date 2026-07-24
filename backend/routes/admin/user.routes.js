const express = require("express");

const router = express.Router();

const {
    isAuth,
} = require("../../middlewares/auth.middleware");

const {
    isAdmin,
    hasPermission,
} = require("../../middlewares/admin.middleware");

const upload = require(
    "../../middlewares/upload.middleware"
);

const {
    getProfile,
    completeProfile,
    updateProfile,
} = require("../../controllers/user.controller");

const {
    getAllUsers,
    getSingleUser,
    deleteUser,
    getRegistrationStats,
    getUserGrowth,
    toggleBlockUser,
} = require("../../controllers/admin/user.controller");


// ========================================
// USER ROUTES
// ========================================

// Get own profile
router.get(
    "/profile",
    isAuth,
    getProfile
);

// Complete profile
router.post(
    "/complete-profile",
    isAuth,
    upload.any(),
    completeProfile
);

// Update profile
router.patch(
    "/update-profile",
    isAuth,
    upload.any(),
    updateProfile
);


// ========================================
// ADMIN USER MANAGEMENT
// ========================================

// Get all users
router.get(
    "/",
    isAdmin,
    hasPermission("users"),
    getAllUsers
);

// Get user registration stats
router.get(
    "/registration-stats",
    isAdmin,
    hasPermission("users"),
    getRegistrationStats
);

// Get user growth stats
router.get(
    "/growth",
    isAdmin,
    hasPermission("users"),
    getUserGrowth
);

// Get single user
router.get(
    "/:id",
    isAdmin,
    hasPermission("users"),
    getSingleUser
);

// Delete user
router.delete(
    "/:id",
    isAdmin,
    hasPermission("users"),
    deleteUser
);

// Toggle block user
router.patch(
    "/:id/block",
    isAdmin,
    hasPermission("users"),
    toggleBlockUser
);


module.exports = router;