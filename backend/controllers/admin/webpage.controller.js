const WebpageConfig = require("../../models/webpageConfig.model");

// ========================================
// GET WEBPAGE CONFIG
// ========================================
const getWebpageConfig = async (req, res) => {
  try {
    let config = await WebpageConfig.findOne();
    if (!config) {
      config = await WebpageConfig.create({ heroBanners: [], sections: [] });
    }

    // Populate dynamic references
    config = await config.populate([
      {
        path: "heroBanners.contentId",
        select: "title poster banner isPremium isPublished isHide releaseDate priority rating is18plus"
      },
      {
        path: "sections.items.contentId",
        select: "title poster banner isPremium isPublished isHide releaseDate priority rating is18plus"
      }
    ]);

    return res.json({
      success: true,
      config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// UPDATE WEBPAGE CONFIG
// ========================================
const updateWebpageConfig = async (req, res) => {
  try {
    const { heroBanners, sections } = req.body;

    // Gather all contentIds to validate adult content
    const movieIds = [];
    const seriesIds = [];

    if (heroBanners && Array.isArray(heroBanners)) {
      for (const banner of heroBanners) {
        const id = banner.contentId;
        if (id) {
          if (banner.contentType === "Movie" || banner.contentType === "movie") {
            movieIds.push(id);
          } else if (banner.contentType === "Series" || banner.contentType === "series") {
            seriesIds.push(id);
          }
        }
      }
    }

    if (sections && Array.isArray(sections)) {
      for (const sec of sections) {
        if (sec.items && Array.isArray(sec.items)) {
          for (const item of sec.items) {
            const id = item.contentId;
            if (id) {
              if (item.contentType === "Movie" || item.contentType === "movie") {
                movieIds.push(id);
              } else if (item.contentType === "Series" || item.contentType === "series") {
                seriesIds.push(id);
              }
            }
          }
        }
      }
    }

    const Movie = require("../../models/movie.model");
    const Series = require("../../models/series.model");

    const [adultMovies, adultSeries] = await Promise.all([
      Movie.find({ _id: { $in: movieIds }, is18plus: true }).select("title"),
      Series.find({ _id: { $in: seriesIds }, is18plus: true }).select("title")
    ]);

    if (adultMovies.length > 0 || adultSeries.length > 0) {
      const adultTitles = [
        ...adultMovies.map(m => m.title),
        ...adultSeries.map(s => s.title)
      ];
      return res.status(400).json({
        success: false,
        message: `Adult content cannot be added to the webpage layout. Please remove: ${adultTitles.join(", ")}`
      });
    }

    let config = await WebpageConfig.findOne();
    if (!config) {
      config = new WebpageConfig();
    }

    config.heroBanners = heroBanners || [];
    config.sections = sections || [];

    await config.save();

    const populatedConfig = await config.populate([
      {
        path: "heroBanners.contentId",
        select: "title poster banner isPremium isPublished isHide releaseDate priority rating is18plus"
      },
      {
        path: "sections.items.contentId",
        select: "title poster banner isPremium isPublished isHide releaseDate priority rating is18plus"
      }
    ]);

    return res.json({
      success: true,
      message: "Webpage layout updated successfully",
      config: populatedConfig
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getWebpageConfig,
  updateWebpageConfig
};
