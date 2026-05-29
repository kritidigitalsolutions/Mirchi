const Episode = require("../../models/episode.model");
const Series = require("../../models/series.model");
const fs = require("fs");
const path = require("path");
const { deleteFromBunny } = require("../../cdn/bunnyCDN");

// Helper to delete physical files
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

const getFilePath = (file, localPrefix, fallback = "") => {
  return file ? file.cdnUrl || file.path || `${localPrefix}/${file.filename}` : fallback;
};

// Helper to update totalSeasons and totalEpisodes in Series
const updateSeriesStats = async (seriesId) => {
  const seasons = await Episode.distinct("seasonNumber", { seriesId });
  const episodeCount = await Episode.countDocuments({ seriesId });
  await Series.findByIdAndUpdate(seriesId, { 
    totalSeasons: seasons.length,
    totalEpisodes: episodeCount
  });
};




// ========================================
// ADD EPISODE
// ========================================
const addEpisode = async (req, res) => {
  try {
    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    const episodeData = {
      title: req.body.title,
      description: req.body.description,
      seriesId: req.body.seriesId,
      seasonNumber: Number(req.body.seasonNumber),
      episodeNumber: Number(req.body.episodeNumber),
      duration: req.body.duration,
      videoUrl: getFilePath(video, "/uploads/episodes/videos", req.body.videoUrl || ""),
      thumbnail: getFilePath(thumbnail, "/uploads/episodes/posters", req.body.thumbnailUrl || "")
    };

    const episode = await Episode.create(episodeData);

    // Update totalSeasons
    await updateSeriesStats(req.body.seriesId);


    return res.status(201).json({ success: true, message: "Episode added successfully", episode });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to add episode", error: error.message });
  }
};

const updateEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    const episode = await Episode.findById(id);
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      seasonNumber: Number(req.body.seasonNumber),
      episodeNumber: Number(req.body.episodeNumber),
      duration: req.body.duration,
    };


    if (video) {
      deleteFile(episode.videoUrl);
      updateData.videoUrl = getFilePath(video, "/uploads/episodes/videos");
    } else if (req.body.videoUrl) {
      updateData.videoUrl = req.body.videoUrl;
    }

    if (thumbnail) {
      deleteFile(episode.thumbnail);
      updateData.thumbnail = getFilePath(thumbnail, "/uploads/episodes/posters");
    } else if (req.body.thumbnailUrl) {
      updateData.thumbnail = req.body.thumbnailUrl;
    }

    const updatedEpisode = await Episode.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedEpisode) return res.status(404).json({ success: false, message: "Episode not found" });

    // Update totalSeasons in case seasonNumber changed
    await updateSeriesStats(updatedEpisode.seriesId);

    return res.json({ success: true, message: "Episode updated successfully", episode: updatedEpisode });


  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to update episode" });
  }
};

const getEpisodes = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.query;
    const query = { seriesId };
    if (seasonNumber) query.seasonNumber = seasonNumber;

    const episodes = await Episode.find(query).sort({ seasonNumber: 1, episodeNumber: 1 });
    return res.json({ success: true, episodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch episodes" });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });

    // Delete files
    deleteFile(episode.videoUrl);
    deleteFile(episode.thumbnail);

    await Episode.findByIdAndDelete(req.params.id);

    // Update totalSeasons
    await updateSeriesStats(episode.seriesId);

    return res.json({ success: true, message: "Episode deleted successfully" });


  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete episode" });
  }
};

const deleteSeason = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.params;
    
    // Find all episodes in this season to delete their files
    const episodes = await Episode.find({ seriesId, seasonNumber });
    episodes.forEach(ep => {
      deleteFile(ep.videoUrl);
      deleteFile(ep.thumbnail);
    });

    await Episode.deleteMany({ seriesId, seasonNumber });

    // Update totalSeasons
    await updateSeriesStats(seriesId);

    return res.json({ success: true, message: `Season ${seasonNumber} episodes deleted successfully` });


  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete season episodes" });
  }
};

const searchEpisodes = async (req, res) => {
  try {
    const { q, seriesId } = req.query;
    const query = { title: { $regex: q, $options: "i" } };
    if (seriesId) query.seriesId = seriesId;

    const episodes = await Episode.find(query).sort({ seasonNumber: 1, episodeNumber: 1 });
    return res.json({ success: true, results: episodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};


module.exports = {
  addEpisode,
  getEpisodes,
  updateEpisode,
  deleteEpisode,
  deleteSeason,
  searchEpisodes,
};


