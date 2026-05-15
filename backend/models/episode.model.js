const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    title: String,
    description: String,

    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: true
    },

    seasonNumber: Number,
    episodeNumber: Number,

    videoUrl: String,
    thumbnail: String,
    duration: String

  },
  { timestamps: true }
);

module.exports = mongoose.model("Episode", episodeSchema);