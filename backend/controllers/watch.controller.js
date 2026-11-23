const mongoose = require("mongoose");
const WatchSession = require("../models/watchSession.model");
const ShareEvent = require("../models/shareEvent.model");
const Episode = require("../models/episode.model");
const Series = require("../models/series.model");
const Subscription = require("../models/subscription.model");

// A play counts as a "view" once this many seconds have been watched
const VIEW_THRESHOLD_SEC = 10;
// Watched >= this share of the episode = completed
const COMPLETION_RATIO = 0.9;
// Max seconds one heartbeat can add (app sends one every ~30s)
const MAX_DELTA_SEC = 60;

const PLATFORMS = ["android", "ios", "web"];

const normalizePlatform = (value) => {
  const platform = String(value || "").trim().toLowerCase();
  return PLATFORMS.includes(platform) ? platform : "other";
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isValidSessionId = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(value);

const viewerKey = (user, deviceId) =>
  user ? String(user._id) : deviceId ? `d:${deviceId}` : null;

const incContentStats = (session, inc) => {
  if (!Object.keys(inc).length) return Promise.resolve();
  const $inc = {};
  for (const [key, value] of Object.entries(inc)) $inc[`stats.${key}`] = value;
  return Promise.all([
    Episode.updateOne({ _id: session.episode }, { $inc }),
    Series.updateOne({ _id: session.series }, { $inc }),
  ]);
};

// ========================================
// POST /api/watch/start
// body: { episodeId, sessionId, platform, deviceId?, durationSec? }
// ========================================
exports.startSession = async (req, res) => {
  try {
    const { episodeId, sessionId } = req.body;
    const deviceId = String(req.body.deviceId || "").trim().slice(0, 200);

    if (!mongoose.isValidObjectId(episodeId)) {
      return res.status(400).json({ success: false, message: "Valid episodeId is required" });
    }
    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ success: false, message: "sessionId must be 8-100 chars (letters, numbers, - or _)" });
    }

    const viewer = viewerKey(req.user, deviceId);
    if (!viewer) {
      return res.status(400).json({ success: false, message: "Login or deviceId is required" });
    }

    const episode = await Episode.findById(episodeId)
      .select("seriesId seasonNumber episodeNumber durationSec")
      .lean();
    if (!episode) {
      return res.status(404).json({ success: false, message: "Episode not found" });
    }

    // Use the player's reported duration when we don't know it yet
    const reportedDuration = Math.round(toNumber(req.body.durationSec));
    let durationSec = episode.durationSec || 0;
    if (!durationSec && reportedDuration) {
      durationSec = reportedDuration;
      await Episode.updateOne({ _id: episode._id, durationSec: { $in: [0, null] } }, { $set: { durationSec } });
    }

    const isSubscriber = req.user
      ? Boolean(
          await Subscription.exists({
            user: req.user._id,
            status: "active",
            endDate: { $gt: new Date() },
          })
        )
      : false;

    const now = new Date();
    // Idempotent: retrying /start with the same sessionId is harmless
    const session = await WatchSession.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: {
          sessionId,
          user: req.user?._id || null,
          deviceId,
          viewer,
          series: episode.seriesId,
          episode: episode._id,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          platform: normalizePlatform(req.body.platform),
          isSubscriber,
          startedAt: now,
          lastPingAt: now,
          durationSec,
        },
      },
      { upsert: true, returnDocument: "after" }
    ).lean();

    if (String(session.episode) !== String(episode._id)) {
      return res.status(409).json({ success: false, message: "sessionId already used for another episode" });
    }

    res.status(200).json({ success: true, sessionId: session.sessionId });
  } catch (error) {
    console.error("Watch Start Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// POST /api/watch/progress
// body: { sessionId, positionSec, deltaSec }
// Send every ~30s while playing, and on pause / background / exit.
// ========================================
exports.progressSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ success: false, message: "Valid sessionId is required" });
    }

    const existing = await WatchSession.findOne({ sessionId })
      .select("user lastPingAt durationSec")
      .lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Session not found. Call /start first" });
    }
    if (existing.user && req.user && String(existing.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Session belongs to another user" });
    }

    const now = new Date();
    // Anti-inflation: cap each heartbeat, and never count more time than has
    // actually passed since the previous heartbeat (+5s for network jitter)
    const elapsedSec = (now.getTime() - new Date(existing.lastPingAt).getTime()) / 1000 + 5;
    const deltaSec = Math.round(Math.min(toNumber(req.body.deltaSec), MAX_DELTA_SEC, Math.max(elapsedSec, 0)));

    let positionSec = toNumber(req.body.positionSec);
    if (existing.durationSec) positionSec = Math.min(positionSec, existing.durationSec);
    positionSec = Math.round(positionSec);

    const session = await WatchSession.findOneAndUpdate(
      { sessionId },
      {
        $inc: { watchedSec: deltaSec },
        $max: { maxPositionSec: positionSec },
        $set: { lastPingAt: now },
      },
      { returnDocument: "after" }
    ).lean();

    const inc = {};
    if (deltaSec > 0) inc.watchTimeSec = deltaSec;

    // Count the view exactly once (atomic flip of `counted`)
    if (!session.counted && session.watchedSec >= VIEW_THRESHOLD_SEC) {
      const flipped = await WatchSession.updateOne({ _id: session._id, counted: false }, { $set: { counted: true } });
      if (flipped.modifiedCount === 1) inc.views = 1;
    }

    // Count completion exactly once
    if (
      !session.completed &&
      session.durationSec > 0 &&
      session.maxPositionSec >= session.durationSec * COMPLETION_RATIO
    ) {
      const flipped = await WatchSession.updateOne({ _id: session._id, completed: false }, { $set: { completed: true } });
      if (flipped.modifiedCount === 1) inc.completions = 1;
    }

    await incContentStats(session, inc);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Watch Progress Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// POST /api/watch/share
// body: { seriesId, episodeId?, platform?, deviceId? }
// ========================================
exports.shareContent = async (req, res) => {
  try {
    const { seriesId, episodeId } = req.body;
    if (!mongoose.isValidObjectId(seriesId)) {
      return res.status(400).json({ success: false, message: "Valid seriesId is required" });
    }
    if (episodeId && !mongoose.isValidObjectId(episodeId)) {
      return res.status(400).json({ success: false, message: "Invalid episodeId" });
    }

    const seriesExists = await Series.exists({ _id: seriesId });
    if (!seriesExists) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }

    await ShareEvent.create({
      user: req.user?._id || null,
      deviceId: String(req.body.deviceId || "").trim().slice(0, 200),
      series: seriesId,
      episode: episodeId || null,
      platform: normalizePlatform(req.body.platform),
    });

    await Promise.all([
      Series.updateOne({ _id: seriesId }, { $inc: { "stats.shares": 1 } }),
      episodeId ? Episode.updateOne({ _id: episodeId }, { $inc: { "stats.shares": 1 } }) : null,
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Watch Share Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// GET /api/watch/continue  (logged-in users)
// Latest unfinished episode per series, newest first.
// ========================================
exports.continueWatching = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const rows = await WatchSession.aggregate([
      { $match: { user: req.user._id } },
      { $sort: { lastPingAt: -1 } },
      { $group: { _id: "$series", session: { $first: "$$ROOT" } } },
      { $match: { "session.completed": false } },
      { $sort: { "session.lastPingAt": -1 } },
      { $limit: limit },
      { $lookup: { from: Series.collection.name, localField: "_id", foreignField: "_id", as: "series" } },
      { $lookup: { from: Episode.collection.name, localField: "session.episode", foreignField: "_id", as: "episode" } },
      { $unwind: "$series" },
      { $unwind: "$episode" },
      { $match: { "series.isHide": { $ne: true } } },
    ]);

    const items = rows.map(({ series, episode, session }) => ({
      series: { _id: series._id, title: series.title, slug: series.slug, poster: series.poster, banner: series.banner },
      episode: {
        _id: episode._id,
        title: episode.title,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        thumbnail: episode.thumbnail || episode.thumbnailUrl,
      },
      positionSec: session.maxPositionSec,
      durationSec: session.durationSec,
      progress: session.durationSec ? Math.min(session.maxPositionSec / session.durationSec, 1) : 0,
      lastWatchedAt: session.lastPingAt,
    }));

    res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Continue Watching Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
