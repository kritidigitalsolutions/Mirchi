const mongoose = require("mongoose");

// One document per playback session (one play of one episode).
// Created by POST /api/watch/start and updated by heartbeats from
// POST /api/watch/progress. All content analytics are computed from here.
const watchSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, trim: true },

    // Viewer identity: logged-in user, or a guest device
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deviceId: { type: String, default: "", trim: true },
    // Stable key for unique-viewer counts: user id, or "d:<deviceId>"
    viewer: { type: String, required: true },

    series: { type: mongoose.Schema.Types.ObjectId, ref: "Series", required: true },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: "Episode", required: true },
    seasonNumber: { type: Number, default: 1 },
    episodeNumber: { type: Number, default: 1 },

    platform: { type: String, enum: ["android", "ios", "web", "other"], default: "other" },
    isSubscriber: { type: Boolean, default: false },

    startedAt: { type: Date, required: true, default: Date.now },
    lastPingAt: { type: Date, required: true, default: Date.now },

    watchedSec: { type: Number, default: 0, min: 0 },
    maxPositionSec: { type: Number, default: 0, min: 0 },
    durationSec: { type: Number, default: 0, min: 0 },

    // A view counts once the viewer has watched >= VIEW_THRESHOLD_SEC
    counted: { type: Boolean, default: false },
    // Reached >= 90% of the episode
    completed: { type: Boolean, default: false },
  },
  { timestamps: false, versionKey: false }
);

watchSessionSchema.index({ episode: 1, startedAt: -1 });
watchSessionSchema.index({ series: 1, startedAt: -1 });
watchSessionSchema.index({ startedAt: -1 });
watchSessionSchema.index({ viewer: 1, startedAt: -1 });
watchSessionSchema.index({ user: 1, lastPingAt: -1 });

module.exports = mongoose.model("WatchSession", watchSessionSchema);
