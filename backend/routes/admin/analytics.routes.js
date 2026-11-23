const express = require("express");
const router = express.Router();

const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");
const {
  getOverview,
  getSeriesList,
  getSeriesDetail,
  getEpisodeDetail,
  getBunnyStats,
} = require("../../controllers/admin/analytics.controller");

router.use(isAdmin, hasPermission("analytics"));

router.get("/overview", getOverview);
router.get("/series", getSeriesList);
router.get("/series/:id", getSeriesDetail);
router.get("/episodes/:id", getEpisodeDetail);
router.get("/bunny/:episodeId", getBunnyStats);

module.exports = router;
