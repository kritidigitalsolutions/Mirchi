const Movie = require("../../models/movie.model");
const fs = require("fs");
const path = require("path");
const { deleteFromBunny } = require("../../cdn/bunnyCDN");

// ========================================
// HELPERS
// ========================================

const deleteFile = async (filePath) => {
  if (!filePath) return;
  if (filePath.startsWith("http")) {
    try {
      await deleteFromBunny(filePath);
    } catch (err) {
      console.error("BunnyCDN delete error:", err);
    }
    return;
  }
  try {
    const fullPath = path.join(__dirname, "../../", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error("File deletion error:", err);
  }
};


// ========================================
// HELPERS
// ========================================

const parseJSON = (value, defaultValue = []) => {
  try {
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const getFilePath = (file, path, fallback = "") => {
  return file ? file.cdnUrl || file.path || `${path}/${file.filename}` : fallback;
};


// ========================================
// ADD MOVIE
// ========================================

const addMovie = async (req, res) => {
  try {

    const genre = parseJSON(req.body.genre);

    const category = parseJSON(req.body.category);

    const cast = parseJSON(req.body.cast);

    // ========================================
    // VALIDATION
    // ========================================

    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // ========================================
    // FILES
    // ========================================

    const poster = req.files?.poster?.[0];

    const banner = req.files?.banner?.[0];

    const trailer = req.files?.trailer?.[0];

    const video = req.files?.video?.[0];

    // ========================================
    // CAST IMAGES
    // ========================================

    const castFiles = Object.keys(req.files || {})
      .filter((key) => key.startsWith("castImage_"));

    castFiles.forEach((key) => {

      const index = key.split("_")[1];

      const file = req.files[key][0];

      if (cast[index]) {
        cast[index].image =
          `/uploads/movies/cast/${file.filename}`;
      }
    });

    // ========================================
    // CREATE MOVIE
    // ========================================

    const movie = await Movie.create({

      title: req.body.title,

      description: req.body.description || "",

      genre,

      releaseYear: req.body.releaseYear || null,

      duration: req.body.duration || "",

      language: req.body.language || "",

      poster: getFilePath(
        poster,
        "/uploads/movies/posters",
        req.body.poster
      ),

      banner: getFilePath(
        banner,
        "/uploads/movies/banners",
        req.body.banner
      ),

      trailerUrl: getFilePath(
        trailer,
        "/uploads/movies/trailers",
        req.body.trailerUrl
      ),

      videoUrl: getFilePath(
        video,
        "/uploads/movies/videos",
        req.body.videoUrl
      ),


      isComingSoon:
        req.body.isComingSoon === "true",

      releaseDate:
        req.body.releaseDate || null,

      isPremium:
        req.body.isPremium === "true",

      rating: req.body.rating || 0,

      cast,

      category,
    });

    return res.status(201).json({
      success: true,
      message: "Movie added successfully",
      movie,
    });

  } catch (error) {

    console.error("ADD MOVIE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add movie",
      error: error.message,
    });
  }
};

// ========================================
// GET ALL MOVIES
// ========================================

const getAllMovies = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const movies = await Movie.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Movie.countDocuments();

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
// SEARCH MOVIES
// ========================================

const searchMovies = async (req, res) => {
  try {

    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    const movies = await Movie.find({
      title: {
        $regex: q,
        $options: "i",
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      results: movies,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

// ========================================
// GET MOVIE BY ID
// ========================================

const getMovieById = async (req, res) => {
  try {

    const movie = await Movie.findById(
      req.params.id
    ).lean();

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
// UPDATE MOVIE
// ========================================

const updateMovie = async (req, res) => {
  try {

    const { id } = req.params;

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const genre = parseJSON(
      req.body.genre,
      movie.genre
    );

    const category = parseJSON(
      req.body.category,
      movie.category
    );

    const cast = parseJSON(
      req.body.cast,
      movie.cast
    );

    // ========================================
    // UPDATE FIELDS
    // ========================================

    if (req.body.title)
      movie.title = req.body.title;

    if (req.body.description)
      movie.description =
        req.body.description;

    movie.genre = genre;

    if (req.body.releaseYear)
      movie.releaseYear =
        req.body.releaseYear;

    if (req.body.duration)
      movie.duration =
        req.body.duration;

    if (req.body.language)
      movie.language =
        req.body.language;

    if (
  req.body.releaseDate !== undefined &&
  req.body.releaseDate !== "null" &&
  req.body.releaseDate !== ""
) {
  movie.releaseDate = req.body.releaseDate;
}

    if (req.body.rating)
      movie.rating =
        req.body.rating;

    movie.isComingSoon =
      req.body.isComingSoon === "true";

    movie.isPremium =
      req.body.isPremium === "true";

    movie.category = category;

    // ========================================
    // FILES
    // ========================================

    if (req.files?.poster?.[0]) {
      deleteFile(movie.poster);
      movie.poster = `/uploads/movies/posters/${req.files.poster[0].filename}`;
    } else if (req.body.posterUrl !== undefined) {
      movie.poster = req.body.posterUrl;
    } else if (req.body.poster !== undefined) {
      movie.poster = req.body.poster;
    }

    if (req.files?.banner?.[0]) {
      deleteFile(movie.banner);
      movie.banner = `/uploads/movies/banners/${req.files.banner[0].filename}`;
    } else if (req.body.bannerUrl !== undefined) {
      movie.banner = req.body.bannerUrl;
    } else if (req.body.banner !== undefined) {
      movie.banner = req.body.banner;
    }

    if (req.files?.trailer?.[0]) {
      deleteFile(movie.trailerUrl);
      movie.trailerUrl = `/uploads/movies/trailers/${req.files.trailer[0].filename}`;
    } else if (req.body.trailerUrl !== undefined) {
      movie.trailerUrl = req.body.trailerUrl;
    }

    if (req.files?.video?.[0]) {
      deleteFile(movie.videoUrl);
      movie.videoUrl = `/uploads/movies/videos/${req.files.video[0].filename}`;
    } else if (req.body.videoUrl !== undefined) {
      movie.videoUrl = req.body.videoUrl;
    }


    // ========================================
    // CAST IMAGES
    // ========================================

    const castFiles =
      Object.keys(req.files || {})
        .filter((key) =>
          key.startsWith("castImage_")
        );

    castFiles.forEach((key) => {

      const index = key.split("_")[1];

      const file = req.files[key][0];

      if (cast[index]) {
        cast[index].image =
          `/uploads/movies/cast/${file.filename}`;
      }
    });

    movie.cast = cast;

    await movie.save();

    return res.json({
      success: true,
      message: "Movie updated successfully",
      movie,
    });

  } catch (error) {
    console.error("UPDATE MOVIE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update movie", error: error.message });
  }
};

// ========================================
// DELETE MOVIE
// ========================================

const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    // Delete files
    deleteFile(movie.poster);
    deleteFile(movie.banner);
    deleteFile(movie.trailerUrl);
    deleteFile(movie.videoUrl);
    movie.cast.forEach(c => deleteFile(c.image));

    await Movie.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: "Movie deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete movie" });
  }
};


module.exports = {
  addMovie,
  getAllMovies,
  searchMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
};