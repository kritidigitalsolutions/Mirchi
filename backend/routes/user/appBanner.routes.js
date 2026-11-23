const express = require("express");
const router = express.Router();
const { getAppBanners } = require("../../controllers/appBanner.controller");

// Public: banners for the mobile app's sliding carousel
router.get("/", getAppBanners);

module.exports = router;
