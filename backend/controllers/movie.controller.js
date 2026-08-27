const Movie = require("../models/movie.model");
const Interaction = require("../models/interaction.model");

// ========================================
// GET ALL MOVIES
// ========================================

const getAllMovies = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const movies = await Movie.find({})
      .sort({ priority: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Movie.countDocuments({});

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      movies,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
};

// ========================================
// GET MOVIE BY SLUG
// ========================================

const getMovieBySlug = async (req, res) => {
  try {

    const movie = await Movie.findOne({
      slug: req.params.slug
    }).lean();

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      movie,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movie",
    });
  }
};

// ========================================
// GET MOVIE BY ID
// ========================================

const getMovieById = async (req, res) => {
  try {

    const movie = await Movie.findOne({
      _id: req.params.id
    }).lean();

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      movie,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movie",
    });
  }
};


// ========================================
// TOGGLE MOVIE LIKE
// ========================================
const toggleMovieLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const existing = await Interaction.findOne({ user: userId, contentId: movie._id });
    let liked = false;

    if (existing && existing.type === "like") {
      // User is unliking
      await Interaction.deleteOne({ _id: existing._id });
      movie.likes = Math.max((movie.likes || 0) - 1, 0);
      liked = false;
    } else {
      // User is liking
      if (existing && existing.type === "dislike") {
        // Was disliked, change to like
        existing.type = "like";
        await existing.save();
        movie.dislikes = Math.max((movie.dislikes || 0) - 1, 0);
      } else {
        // New like
        await Interaction.create({ user: userId, contentId: movie._id, contentType: "movie", type: "like" });
      }
      movie.likes = (movie.likes || 0) + 1;
      liked = true;
    }

    await movie.save();

    res.status(200).json({
      success: true,
      message: !liked ? "Movie unliked" : "Movie liked",
      totalLikes: movie.likes,
      totalDislikes: movie.dislikes,
      liked: liked,
    });

  } catch (error) {
    console.error("Toggle Movie Like Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// TOGGLE MOVIE DISLIKE
// ========================================
const toggleMovieDislike = async (req, res) => {
  try {
    const userId = req.user.id;
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const existing = await Interaction.findOne({ user: userId, contentId: movie._id });
    let disliked = false;

    if (existing && existing.type === "dislike") {
      // User is removing dislike
      await Interaction.deleteOne({ _id: existing._id });
      movie.dislikes = Math.max((movie.dislikes || 0) - 1, 0);
      disliked = false;
    } else {
      // User is disliking
      if (existing && existing.type === "like") {
        // Was liked, change to dislike
        existing.type = "dislike";
        await existing.save();
        movie.likes = Math.max((movie.likes || 0) - 1, 0);
      } else {
        // New dislike
        await Interaction.create({ user: userId, contentId: movie._id, contentType: "movie", type: "dislike" });
      }
      movie.dislikes = (movie.dislikes || 0) + 1;
      disliked = true;
    }

    await movie.save();

    res.status(200).json({
      success: true,
      message: !disliked ? "Movie dislike removed" : "Movie disliked",
      totalLikes: movie.likes,
      totalDislikes: movie.dislikes,
      disliked: disliked,
    });

  } catch (error) {
    console.error("Toggle Movie Dislike Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAllMovies,
  getMovieBySlug,
  getMovieById,
  toggleMovieLike,
  toggleMovieDislike,
};
