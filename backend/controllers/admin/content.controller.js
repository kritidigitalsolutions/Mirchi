const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const ShortDrama = require("../../models/shortdrama.model");

// ========================================
// GET CONTENT STATS
// ========================================
const getContentStats = async (req, res) => {
  try {
    const [moviesCount, seriesCount, shortDramasCount] = await Promise.all([
      Movie.countDocuments(),
      Series.countDocuments(),
      ShortDrama.countDocuments()
    ]);

    return res.json({
      success: true,
      data: [
        { name: "Movies", value: moviesCount },
        { name: "Series", value: seriesCount },
        { name: "Short Dramas", value: shortDramasCount }
      ],
      stats: {
        movies: moviesCount,
        series: seriesCount,
        shortDramas: shortDramasCount,
        total: moviesCount + seriesCount + shortDramasCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// GET ALL CONTENT (COMBINED)
// ========================================
const getAllContent = async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 }).lean();
    const series = await Series.find().sort({ createdAt: -1 }).lean();

    const formattedMovies = movies.map(m => ({ ...m, contentType: "movie" }));
    const formattedSeries = series.map(s => ({ ...s, contentType: "series" }));

    const allContent = [...formattedMovies, ...formattedSeries].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({
      success: true,
      content: allContent
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// TOGGLE 18+ CONTENT FOR ALL
// ========================================
const toggle18PlusContent = async (req, res) => {
  try {
    const { is18plus } = req.body;

    if (typeof is18plus !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is18plus must be a boolean value"
      });
    }

    // Bulk update all models
    await Movie.updateMany({}, { $set: { is18plus: is18plus } });
    await Series.updateMany({}, { $set: { is18plus: is18plus } });
    await ShortDrama.updateMany({}, { $set: { is18plus: is18plus } });

    return res.json({
      success: true,
      message: `Successfully updated 18+ status of all content to ${is18plus}`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// TOGGLE HIDE STATUS OF 18+ CONTENT FOR ALL
// ========================================
const toggleHide18PlusContent = async (req, res) => {
  try {
    const { isHide } = req.body;

    if (typeof isHide !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isHide must be a boolean value"
      });
    }

    // Bulk update all models where is18plus is true
    await Movie.updateMany({ is18plus: true }, { $set: { isHide: isHide, is18plus: true, allAges: false } });
    await Series.updateMany({ is18plus: true }, { $set: { isHide: isHide, is18plus: true, allAges: false } });
    await ShortDrama.updateMany({ is18plus: true }, { $set: { isHide: isHide, is18plus: true, allAges: false } });

    return res.json({
      success: true,
      message: `Successfully updated visibility status (hide=${isHide}) of all 18+ content`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getContentStats,
  getAllContent,
  toggle18PlusContent,
  toggleHide18PlusContent
};