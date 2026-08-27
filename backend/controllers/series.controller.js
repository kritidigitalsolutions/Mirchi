const Series = require("../models/series.model");
const Episode = require("../models/episode.model");
const Interaction = require("../models/interaction.model");

// ========================================
// GET ALL SERIES
// ========================================
const getAllSeries = async (req, res) => {
  try {
    const series = await Series.find({}).sort({ priority: 1, createdAt: -1 }).lean();

    // Fetch all episodes for these series
    const seriesIds = series.map(s => s._id);
    const allEpisodes = await Episode.find({ seriesId: { $in: seriesIds } }).sort({ seasonNumber: 1, episodeNumber: 1 }).lean();

    const formattedSeries = series.map(s => {
      const episodes = allEpisodes.filter(ep => ep.seriesId.toString() === s._id.toString());
      const seasons = [];
      episodes.forEach(ep => {
        let season = seasons.find(se => se.seasonNumber === ep.seasonNumber);
        if (!season) {
          season = { seasonNumber: ep.seasonNumber, episodes: [] };
          seasons.push(season);
        }
        season.episodes.push(ep);
      });

      const seriesObj = { ...s, seasons };
      return seriesObj;

    });

    return res.json({
      success: true,
      series: formattedSeries,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};

// ========================================
// GET SERIES BY SLUG
// ========================================
const getSeriesBySlug = async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug });

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const episodes = await Episode.find({ seriesId: series._id }).sort({ seasonNumber: 1, episodeNumber: 1 });

    const seasons = [];
    episodes.forEach(ep => {
      let season = seasons.find(s => s.seasonNumber === ep.seasonNumber);
      if (!season) {
        season = { seasonNumber: ep.seasonNumber, episodes: [] };
        seasons.push(season);
      }
      season.episodes.push(ep);
    });

    const seriesObj = series.toObject();

    return res.json({
      success: true,
      series: { ...seriesObj, seasons }
    });




  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};

// ========================================
// GET SERIES BY ID
// ========================================
const getSeriesById = async (req, res) => {
  try {
    const series = await Series.findOne({ _id: req.params.id });

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const episodes = await Episode.find({ seriesId: series._id }).sort({ seasonNumber: 1, episodeNumber: 1 });

    const seasons = [];
    episodes.forEach(ep => {
      let season = seasons.find(s => s.seasonNumber === ep.seasonNumber);
      if (!season) {
        season = { seasonNumber: ep.seasonNumber, episodes: [] };
        seasons.push(season);
      }
      season.episodes.push(ep);
    });

    const seriesObj = series.toObject();

    return res.json({
      success: true,
      series: { ...seriesObj, seasons }
    });




  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};


// ========================================
// GET EPISODES BY SERIES
// ========================================
const getEpisodesBySeries = async (req, res) => {
  try {
    const episodes = await Episode.find({ seriesId: req.params.seriesId })
      .sort({ seasonNumber: 1, episodeNumber: 1 });

    return res.json({
      success: true,
      episodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch episodes",
    });
  }
};

// ========================================
// TOGGLE SERIES LIKE
// ========================================

const toggleSeriesLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const series = await Series.findById(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const existing = await Interaction.findOne({ user: userId, contentId: series._id });
    let liked = false;

    if (existing && existing.type === "like") {
      // User is unliking
      await Interaction.deleteOne({ _id: existing._id });
      series.likes = Math.max((series.likes || 0) - 1, 0);
      liked = false;
    } else {
      // User is liking
      if (existing && existing.type === "dislike") {
        // Was disliked, change to like
        existing.type = "like";
        await existing.save();
        series.dislikes = Math.max((series.dislikes || 0) - 1, 0);
      } else {
        // New like
        await Interaction.create({ user: userId, contentId: series._id, contentType: "series", type: "like" });
      }
      series.likes = (series.likes || 0) + 1;
      liked = true;
    }

    await series.save();

    return res.status(200).json({
      success: true,
      message: !liked ? "Series unliked" : "Series liked",
      totalLikes: series.likes,
      totalDislikes: series.dislikes,
      liked: liked,
    });
  } catch (error) {
    console.error("Toggle Series Like Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// TOGGLE SERIES DISLIKE
// ========================================

const toggleSeriesDislike = async (req, res) => {
  try {
    const userId = req.user.id;
    const series = await Series.findById(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const existing = await Interaction.findOne({ user: userId, contentId: series._id });
    let disliked = false;

    if (existing && existing.type === "dislike") {
      // User is removing dislike
      await Interaction.deleteOne({ _id: existing._id });
      series.dislikes = Math.max((series.dislikes || 0) - 1, 0);
      disliked = false;
    } else {
      // User is disliking
      if (existing && existing.type === "like") {
        // Was liked, change to dislike
        existing.type = "dislike";
        await existing.save();
        series.likes = Math.max((series.likes || 0) - 1, 0);
      } else {
        // New dislike
        await Interaction.create({ user: userId, contentId: series._id, contentType: "series", type: "dislike" });
      }
      series.dislikes = (series.dislikes || 0) + 1;
      disliked = true;
    }

    await series.save();

    return res.status(200).json({
      success: true,
      message: !disliked ? "Series dislike removed" : "Series disliked",
      totalLikes: series.likes,
      totalDislikes: series.dislikes,
      disliked: disliked,
    });
  } catch (error) {
    console.error("Toggle Series Dislike Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAllSeries,
  getSeriesBySlug,
  getSeriesById,
  toggleSeriesLike,
  toggleSeriesDislike,
  getEpisodesBySeries,
};


