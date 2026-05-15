const express = require("express");

const router = express.Router();

const {
  adminLogin,
} = require("../../controllers/admin_auth/admin.auth.controller");


// Admin Login
router.post(
  "/login",
  adminLogin
);



module.exports = router;