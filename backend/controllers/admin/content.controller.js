const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");

// ========================================
// GET CONTENT STATS
// ========================================
const getContentStats = async (req, res) => {
  try {
    const [moviesCount, seriesCount] = await Promise.all([
      Movie.countDocuments(),
      Series.countDocuments()
    ]);

    return res.json({
      success: true,
      data: [
        { name: "Movies", value: moviesCount },
        { name: "Series", value: seriesCount }
      ],
      stats: {
        movies: moviesCount,
        series: seriesCount,
        total: moviesCount + seriesCount
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
    const page = Number(req.query.page) || 1;
    const hasLimit = req.query.limit !== undefined && req.query.limit !== "0" && req.query.limit !== "all";
    const limit = hasLimit ? Number(req.query.limit) : 0;
    const skip = hasLimit ? (page - 1) * limit : 0;

    const query = {};
    if (req.query.is18plus !== undefined) {
      query.is18plus = req.query.is18plus === "true";
    }
    if (req.query.q) {
      query.title = {
        $regex: req.query.q,
        $options: "i",
      };
    }

    // Get metadata (IDs and createdAt) for sorting and pagination in memory
    const [moviesMeta, seriesMeta] = await Promise.all([
      Movie.find(query, { _id: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
      Series.find(query, { _id: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean()
    ]);

    const formattedMovies = moviesMeta.map(m => ({ _id: m._id, createdAt: m.createdAt, type: "movie" }));
    const formattedSeries = seriesMeta.map(s => ({ _id: s._id, createdAt: s.createdAt, type: "series" }));

    // Combine and sort by createdAt descending
    const allMeta = [...formattedMovies, ...formattedSeries].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = allMeta.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    // Get the page slice
    const pageMeta = limit > 0 ? allMeta.slice(skip, skip + limit) : allMeta;

    // Group page elements by type to query details in bulk
    const movieIds = pageMeta.filter(item => item.type === "movie").map(item => item._id);
    const seriesIds = pageMeta.filter(item => item.type === "series").map(item => item._id);

    const [moviesDetails, seriesDetails] = await Promise.all([
      movieIds.length > 0 ? Movie.find({ _id: { $in: movieIds } }).lean() : [],
      seriesIds.length > 0 ? Series.find({ _id: { $in: seriesIds } }).lean() : []
    ]);

    // Create lookup maps
    const movieMap = new Map(moviesDetails.map(m => [m._id.toString(), { ...m, contentType: "movie" }]));
    const seriesMap = new Map(seriesDetails.map(s => [s._id.toString(), { ...s, contentType: "series" }]));

    // Construct the final ordered page content
    const pageContent = pageMeta.map(item => {
      const idStr = item._id.toString();
      if (item.type === "movie") {
        return movieMap.get(idStr);
      } else {
        return seriesMap.get(idStr);
      }
    }).filter(Boolean); // Filter out any nulls just in case

    return res.json({
      success: true,
      total,
      page,
      pages: totalPages,
      content: pageContent
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