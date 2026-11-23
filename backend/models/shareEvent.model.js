const mongoose = require("mongoose");

// One document per share tap, so shares can be filtered by date.
const shareEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deviceId: { type: String, default: "", trim: true },
    series: { type: mongoose.Schema.Types.ObjectId, ref: "Series", required: true },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: "Episode", default: null },
    platform: { type: String, enum: ["android", "ios", "web", "other"], default: "other" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

shareEventSchema.index({ series: 1, createdAt: -1 });
shareEventSchema.index({ episode: 1, createdAt: -1 });
shareEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ShareEvent", shareEventSchema);
