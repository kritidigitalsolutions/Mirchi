const express = require("express");
const router = express.Router();
const {
  getWebpageLayout,
  getHeroBanners,
  getSections,
  getSectionBySlug,
  getWebpageContentById
} = require("../../controllers/webpage.controller");

// All routes are public — no auth required

// GET /api/webpage/layout          → full layout (banners + sections)
router.get("/layout", getWebpageLayout);

// GET /api/webpage/banners         → hero slider banners only
router.get("/banners", getHeroBanners);

// GET /api/webpage/sections        → all carousel sections
router.get("/sections", getSections);

// GET /api/webpage/sections/:slug  → single section by category slug
router.get("/sections/:slug", getSectionBySlug);

// GET /api/webpage/content/:type/:id → single movie or series by id
//   :type  = "movie" | "series"
//   :id    = MongoDB ObjectId
router.get("/content/:type/:id", getWebpageContentById);

module.exports = router;
