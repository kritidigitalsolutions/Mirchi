const Series = require("../../models/series.model");
const Episode = require("../../models/episode.model");
const fs = require("fs");
const path = require("path");

// ========================================
// HELPERS
// ========================================

const deleteFile = (filePath) => {
  if (!filePath || filePath.startsWith("http")) return;
  try {
    const fullPath = path.join(__dirname, "../../public", filePath);
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
  return file ? `${path}/${file.filename}` : fallback;
};




// ========================================
// ADD SERIES
// ========================================
const addSeries = async (req, res) => {

  try {
    const genre = parseJSON(req.body.genre);
    const category = parseJSON(req.body.category);
    const cast = parseJSON(req.body.cast);

    if (!req.body.title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const poster = req.files?.poster?.[0];
    const banner = req.files?.banner?.[0];
    const trailer = req.files?.trailer?.[0];

    const castFiles = Object.keys(req.files || {}).filter((key) => key.startsWith("castImage_"));
    castFiles.forEach((key) => {
      const index = key.split("_")[1];
      const file = req.files[key][0];
      if (cast[index]) cast[index].image = `/uploads/series/cast/${file.filename}`;
    });

    const series = await Series.create({
      title: req.body.title,
      description: req.body.description || "",
      genre,
      releaseYear: req.body.releaseYear || null,
      duration: req.body.duration || "",
      language: req.body.language || "",
      poster: getFilePath(poster, "/uploads/series/posters", req.body.poster),
      banner: getFilePath(banner, "/uploads/series/banners", req.body.banner),
      trailerUrl: getFilePath(trailer, "/uploads/series/trailers", req.body.trailerUrl),
      isComingSoon: req.body.isComingSoon === "true",
      releaseDate: req.body.releaseDate || null,
      isPremium: req.body.isPremium === "true",
      rating: req.body.rating || 0,
      cast,
      category,
    });

    return res.status(201).json({
      success: true,
      message: "Series added successfully",
      series,
    });
  } catch (error) {
    console.error("ADD SERIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to add series", error: error.message });
  }
};


// ========================================
// GET ALL SERIES
// ========================================
const getAllSeries = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const series = await Series.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Series.countDocuments();

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      series,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch series" });
  }
};


// ========================================
// SEARCH SERIES
// ========================================
const searchSeries = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Query is required" });

    const series = await Series.find({
      title: { $regex: q, $options: "i" }
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      results: series
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};



// ========================================
// GET SERIES BY ID
// ========================================
const getSeriesById = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }
    return res.json({ success: true, series });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch series" });
  }
};

// ========================================
// UPDATE SERIES
// ========================================
const updateSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const series = await Series.findById(id);
    if (!series) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }

    const genre = parseJSON(req.body.genre, series.genre);
    const category = parseJSON(req.body.category, series.category);
    const cast = parseJSON(req.body.cast, series.cast);

    if (req.body.title) series.title = req.body.title;
    if (req.body.description) series.description = req.body.description;
    series.genre = genre;
    if (req.body.releaseYear) series.releaseYear = req.body.releaseYear;
    if (req.body.duration) series.duration = req.body.duration;
    if (req.body.language) series.language = req.body.language;
    if (req.body.releaseDate) series.releaseDate = req.body.releaseDate;
    if (req.body.rating) series.rating = req.body.rating;
    series.isComingSoon = req.body.isComingSoon === "true";
    series.isPremium = req.body.isPremium === "true";
    series.category = category;

    if (req.files?.poster?.[0]) {
      deleteFile(series.poster);
      series.poster = `/uploads/series/posters/${req.files.poster[0].filename}`;
    } else if (req.body.posterUrl !== undefined) {
      series.poster = req.body.posterUrl;
    } else if (req.body.poster !== undefined) {
      series.poster = req.body.poster;
    }

    if (req.files?.banner?.[0]) {
      deleteFile(series.banner);
      series.banner = `/uploads/series/banners/${req.files.banner[0].filename}`;
    } else if (req.body.bannerUrl !== undefined) {
      series.banner = req.body.bannerUrl;
    } else if (req.body.banner !== undefined) {
      series.banner = req.body.banner;
    }

    if (req.files?.trailer?.[0]) {
      deleteFile(series.trailerUrl);
      series.trailerUrl = `/uploads/series/trailers/${req.files.trailer[0].filename}`;
    } else if (req.body.trailerUrl !== undefined) {
      series.trailerUrl = req.body.trailerUrl;
    }


    const castFiles = Object.keys(req.files || {}).filter((key) => key.startsWith("castImage_"));
    castFiles.forEach((key) => {
      const index = key.split("_")[1];
      const file = req.files[key][0];
      if (cast[index]) {
        if (cast[index].image && cast[index].image !== `/uploads/series/cast/${file.filename}`) {
          deleteFile(cast[index].image);
        }
        cast[index].image = `/uploads/series/cast/${file.filename}`;
      }
    });

    series.cast = cast;

    await series.save();

    return res.json({ success: true, message: "Series updated successfully", series });
  } catch (error) {
    console.error("UPDATE SERIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update series", error: error.message });
  }
};


// ========================================
// DELETE SERIES
// ========================================
const deleteSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const series = await Series.findById(id);
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    // Delete series files
    deleteFile(series.poster);
    deleteFile(series.banner);
    deleteFile(series.trailerUrl);
    series.cast.forEach(c => deleteFile(c.image));

    // Cascading delete episodes and their files
    const episodes = await Episode.find({ seriesId: id });
    episodes.forEach(ep => {
      deleteFile(ep.videoUrl);
      deleteFile(ep.thumbnail);
    });
    await Episode.deleteMany({ seriesId: id });

    await Series.findByIdAndDelete(id);

    return res.json({ success: true, message: "Series and all its episodes deleted successfully" });
  } catch (error) {
    console.error("DELETE SERIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete series" });
  }
};



module.exports = {
  addSeries,
  getAllSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  searchSeries,
};

