const express = require("express");
const router = express.Router();
const { getActiveCategories } = require("../../controllers/category.controller");

// Public route – no auth required for fetching active categories
router.get("/", getActiveCategories);

module.exports = router;
