const express = require("express");

const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const protectSubscription = require("../../middlewares/protectSubscription.middleware");

const {
  getDramaEpisodes,
  searchDramaEpisodes,
} = require(
  "../../controllers/dramaEpisode.controller"
);

// ========================================
// GET ALL EPISODES (Protected by Auth & Subscription)
// ========================================
router.get("/:shortDramaId", isAuth, protectSubscription, getDramaEpisodes);


// ========================================
// SEARCH EPISODES (Protected by Auth & Subscription)
// ========================================
router.get("/search", isAuth, protectSubscription, searchDramaEpisodes);


module.exports = router;