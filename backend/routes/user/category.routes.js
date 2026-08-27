const express = require("express");
const router = express.Router();
const { getActiveCategories, getCategoryContent } = require("../../controllers/category.controller");

// Public route – no auth required for fetching active categories
router.get("/", getActiveCategories);
router.get("/:slug", getCategoryContent);

module.exports = router;
