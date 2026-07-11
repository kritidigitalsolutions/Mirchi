const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: true
    },

    seasonNumber: {
      type: Number,
      required: true,
      min: 1
    },

    episodeNumber: {
      type: Number,
      required: true,
      min: 1
    },

    videoUrl: {
      type: String,
      required: true
    },

    videoSource: {
      type: String,
      default: ""
    },

    storageType: {
      type: String,
      default: ""
    },

    videoId: {
      type: String,
      default: ""
    },

    streamUrl: {
      type: String,
      default: ""
    },

    playlistUrl: {
      type: String,
      default: ""
    },

    playbackUrl: {
      type: String,
      default: ""
    },

    thumbnailUrl: {
      type: String,
      default: ""
    },

    encodingStatus: {
      type: String,
      default: ""
    },

    thumbnail: {
      type: String,
      default: ""
    },

    duration: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

episodeSchema.index({
  createdAt: -1
});

episodeSchema.index(
  {
    seriesId: 1,
    seasonNumber: 1,
    episodeNumber: 1
  },
  {
    unique: true,
    name: "unique_episode_per_season"
  }
);

const { parseBunnyStreamUrl } = require("../cdn/bunnyCDN");

episodeSchema.pre("save", function () {
  if (this.videoUrl) {
    const streamData = parseBunnyStreamUrl(this.videoUrl);
    if (streamData) {
      this.videoUrl = streamData.videoUrl;
      this.videoSource = streamData.videoSource;
      this.storageType = streamData.storageType;
      this.videoId = streamData.videoId;
      this.streamUrl = streamData.streamUrl;
      this.playlistUrl = streamData.playlistUrl;
      this.playbackUrl = streamData.playbackUrl;
      this.thumbnailUrl = streamData.thumbnailUrl;
      this.encodingStatus = streamData.encodingStatus;
    }
  }
});

episodeSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (update) {
    if (update.videoUrl) {
      const streamData = parseBunnyStreamUrl(update.videoUrl);
      if (streamData) {
        Object.assign(update, streamData);
      }
    }
    if (update.$set && update.$set.videoUrl) {
      const streamData = parseBunnyStreamUrl(update.$set.videoUrl);
      if (streamData) {
        Object.assign(update.$set, streamData);
      }
    }
  }
});

module.exports = mongoose.model(
  "Episode",
  episodeSchema
);