const express = require("express");

const router = express.Router();

const {
    isAuth,
} = require("../../middlewares/auth.middleware");

const {
    isAdmin,
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
    getAllUsers
);

// Get single user
router.get(
    "/:id",
    isAdmin,
    getSingleUser
);

// Delete user
router.delete(
    "/:id",
    isAdmin,
    deleteUser
);


module.exports = router;