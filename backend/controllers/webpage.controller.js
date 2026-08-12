const WebpageConfig = require("../models/webpageConfig.model");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");

// Shared populate config (full fields for website use)
const POPULATE = [
  {
    path: "heroBanners.contentId",
    select: "title description releaseYear duration language poster banner isComingSoon isPublished isHide releaseDate priority rating videoUrl trailerUrl isPremium contentType"
  },
  {
    path: "sections.items.contentId",
    select: "title description releaseYear duration language poster banner isComingSoon isPublished isHide releaseDate priority rating videoUrl trailerUrl isPremium contentType"
  }
];

const isVisible = item =>
  item && item.isPublished !== false && item.isHide !== true;

const formatBanner = b => ({
  ...(b.contentId.toObject ? b.contentId.toObject() : b.contentId),
  type: b.contentType.toLowerCase()
});

const formatItem = i => ({
  ...(i.contentId.toObject ? i.contentId.toObject() : i.contentId),
  type: i.contentType.toLowerCase()
});

const attachEpisodesToSeries = async (heroBanners, sections) => {
  const seriesIds = [];
  if (heroBanners) {
    for (const b of heroBanners) {
      if (b.type === "series" && b._id) {
        seriesIds.push(b._id.toString());
      }
    }
  }
  if (sections) {
    for (const sec of sections) {
      if (sec.items) {
        for (const item of sec.items) {
          if (item.type === "series" && item._id) {
            seriesIds.push(item._id.toString());
          }
        }
      }
    }
  }

  if (seriesIds.length === 0) return;

  const episodes = await Episode.find({ seriesId: { $in: seriesIds } })
    .sort({ seasonNumber: 1, episodeNumber: 1 })
    .lean();

  const grouped = {};
  for (const ep of episodes) {
    const sId = ep.seriesId.toString();
    if (!grouped[sId]) {
      grouped[sId] = {};
    }
    const sNum = ep.seasonNumber;
    if (!grouped[sId][sNum]) {
      grouped[sId][sNum] = [];
    }
    grouped[sId][sNum].push(ep);
  }

  const seriesSeasons = {};
  for (const sId of Object.keys(grouped)) {
    const seasons = [];
    const seasonsNums = Object.keys(grouped[sId]).map(Number).sort((a, b) => a - b);
    for (const num of seasonsNums) {
      seasons.push({
        seasonNumber: num,
        episodes: grouped[sId][num]
      });
    }
    seriesSeasons[sId] = seasons;
  }

  if (heroBanners) {
    for (const b of heroBanners) {
      if (b.type === "series" && b._id) {
        b.seasons = seriesSeasons[b._id.toString()] || [];
      }
    }
  }

  if (sections) {
    for (const sec of sections) {
      if (sec.items) {
        for (const item of sec.items) {
          if (item.type === "series" && item._id) {
            item.seasons = seriesSeasons[item._id.toString()] || [];
          }
        }
      }
    }
  }
};


// ========================================
// GET FULL WEBPAGE LAYOUT
// GET /api/webpage/layout
// Returns hero banners + all carousel sections
// ========================================
const getWebpageLayout = async (req, res) => {
  try {
    const config = await WebpageConfig.findOne().populate(POPULATE);

    if (!config || (config.heroBanners?.length === 0 && config.sections?.length === 0)) {
      return res.json({
        success: true,
        isCustomLayout: false,
        heroBanners: [],
        sections: [],
        movieCount: 0,
        seriesCount: 0,
        message: "No curated layout configured yet."
      });
    }

    const heroBanners = config.heroBanners
      .filter(b => isVisible(b.contentId))
      .map(formatBanner);

    const sections = config.sections
      .map(sec => ({
        categorySlug: sec.categorySlug,
        title: sec.title,
        items: sec.items
          .filter(i => isVisible(i.contentId))
          .map(formatItem)
      }))
      .filter(sec => sec.items.length > 0);

    await attachEpisodesToSeries(heroBanners, sections);

    let movieCount = 0;
    let seriesCount = 0;

    heroBanners.forEach(b => {
      if (b.type === "movie") movieCount++;
      else if (b.type === "series") seriesCount++;
    });

    sections.forEach(sec => {
      sec.items.forEach(item => {
        if (item.type === "movie") movieCount++;
        else if (item.type === "series") seriesCount++;
      });
    });

    return res.json({
      success: true,
      isCustomLayout: true,
      movieCount,
      seriesCount,
      bannersCount: heroBanners.length,
      sectionsCount: sections.length,
      heroBanners,
      sections
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ========================================
// GET HERO BANNERS ONLY
// GET /api/webpage/banners
// Returns only the hero slider banners
// ========================================
const getHeroBanners = async (req, res) => {
  try {
    const config = await WebpageConfig.findOne().populate([
      {
        path: "heroBanners.contentId",
        select: "title description releaseYear duration language poster banner isComingSoon isPublished isHide releaseDate rating videoUrl trailerUrl isPremium"
      }
    ]);

    if (!config || !config.heroBanners?.length) {
      return res.json({ success: true, heroBanners: [], movieCount: 0, seriesCount: 0 });
    }

    const heroBanners = config.heroBanners
      .filter(b => isVisible(b.contentId))
      .map(formatBanner);

    await attachEpisodesToSeries(heroBanners, null);

    let movieCount = 0;
    let seriesCount = 0;

    heroBanners.forEach(b => {
      if (b.type === "movie") movieCount++;
      else if (b.type === "series") seriesCount++;
    });

    return res.json({
      success: true,
      movieCount,
      seriesCount,
      bannersCount: heroBanners.length,
      heroBanners
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ========================================
// GET ALL CAROUSEL SECTIONS
// GET /api/webpage/sections
// Returns all carousel rows with their items
// ========================================
const getSections = async (req, res) => {
  try {
    const config = await WebpageConfig.findOne().populate([
      {
        path: "sections.items.contentId",
        select: "title description releaseYear duration language poster banner isComingSoon isPublished isHide releaseDate rating videoUrl trailerUrl isPremium"
      }
    ]);

    if (!config || !config.sections?.length) {
      return res.json({ success: true, sections: [], movieCount: 0, seriesCount: 0 });
    }

    const sections = config.sections
      .map(sec => ({
        categorySlug: sec.categorySlug,
        title: sec.title,
        items: sec.items
          .filter(i => isVisible(i.contentId))
          .map(formatItem)
      }))
      .filter(sec => sec.items.length > 0);

    await attachEpisodesToSeries(null, sections);

    let movieCount = 0;
    let seriesCount = 0;

    sections.forEach(sec => {
      sec.items.forEach(item => {
        if (item.type === "movie") movieCount++;
        else if (item.type === "series") seriesCount++;
      });
    });

    return res.json({
      success: true,
      movieCount,
      seriesCount,
      sectionsCount: sections.length,
      sections
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ========================================
// GET SINGLE SECTION BY SLUG
// GET /api/webpage/sections/:slug
// Returns one carousel section by categorySlug
// ========================================
const getSectionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const config = await WebpageConfig.findOne().populate([
      {
        path: "sections.items.contentId",
        select: "title description releaseYear duration language poster banner isComingSoon isPublished isHide releaseDate rating videoUrl trailerUrl isPremium"
      }
    ]);

    if (!config) {
      return res.status(404).json({ success: false, message: "No layout configured." });
    }

    const sec = config.sections.find(s => s.categorySlug === slug);
    if (!sec) {
      return res.status(404).json({ success: false, message: `Section '${slug}' not found.` });
    }

    const items = sec.items
      .filter(i => isVisible(i.contentId))
      .map(formatItem);

    const section = {
      categorySlug: sec.categorySlug,
      title: sec.title,
      items
    };

    await attachEpisodesToSeries(null, [section]);

    let movieCount = 0;
    let seriesCount = 0;

    items.forEach(item => {
      if (item.type === "movie") movieCount++;
      else if (item.type === "series") seriesCount++;
    });

    return res.json({
      success: true,
      movieCount,
      seriesCount,
      section
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ========================================
// GET SINGLE CONTENT ITEM BY ID + TYPE
// GET /api/webpage/content/:type/:id
// type: "movie" | "series"
// Returns full details for one item
// ========================================
const getWebpageContentById = async (req, res) => {
  try {
    const { type, id } = req.params;

    let item;
    if (type === "movie") {
      item = await Movie.findById(id).lean();
    } else if (type === "series") {
      item = await Series.findById(id).lean();
    } else {
      return res.status(400).json({ success: false, message: "Type must be 'movie' or 'series'." });
    }

    if (!item) {
      return res.status(404).json({ success: false, message: "Content not found." });
    }

    if (item.isPublished === false || item.isHide === true) {
      return res.status(403).json({ success: false, message: "Content is not available." });
    }

    return res.json({ success: true, content: { ...item, type } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  getWebpageLayout,
  getHeroBanners,
  getSections,
  getSectionBySlug,
  getWebpageContentById
};
