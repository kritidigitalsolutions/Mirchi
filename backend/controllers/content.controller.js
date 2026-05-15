const Movie = require("../models/movie.model");
const Series = require("../models/series.model");


// ========================================
// GET HOME CONTENT (COMBINED)
// ========================================
const getHomeContent = async (req, res) => {
  try {
    // Fetch active movies and series
    const movies = await Movie.find().sort({ createdAt: -1 }).limit(20).lean();
    const series = await Series.find().sort({ createdAt: -1 }).limit(20).lean();

    const moviesCount = await Movie.countDocuments();
    const seriesCount = await Series.countDocuments();
    const seriesData = await Series.find({}, "totalEpisodes");
    const episodesCount = seriesData.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);

    // Format and add flags
    const formattedMovies = movies.map((m) => ({
      ...m,
      type: "movie",
      isTrending: m.category?.includes("trending") || false
    }));

    const formattedSeries = series.map((s) => ({
      ...s,
      type: "series",
      isTrending: s.category?.includes("trending") || false
    }));

    // Combine and sort by date
    const content = [...formattedMovies, ...formattedSeries].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({
      success: true,
      moviesCount,
      seriesCount,
      episodesCount,
      content
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




// ========================================
// SEARCH CONTENT
// ========================================
const searchContent = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, message: "Search query is required" });

    const movies = await Movie.find({
      title: { $regex: query, $options: "i" },
    }).lean();

    const series = await Series.find({
      title: { $regex: query, $options: "i" },
    }).lean();

    const results = [
      ...movies.map(m => ({ ...m, type: "movie" })),
      ...series.map(s => ({ ...s, type: "series" }))
    ];



    return res.json({
      success: true,
      results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getHomeContent,
  searchContent
};
