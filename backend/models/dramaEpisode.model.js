const mongoose = require("mongoose");

const dramaEpisodeSchema =
  new mongoose.Schema(
    {
      shortDramaId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "ShortDrama",

        required: true,
      },

      episodeNumber: {
        type: Number,
        required: true,
      },

      title: String,

      description: String,

      videoUrl: String,

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

      thumbnail: String,

      duration: String,

      isLocked: {
        type: Boolean,
        default: false,
      },

      isVertical: {
        type: Boolean,
        default: true,
      },

      views: {
        type: Number,
        default: 0,
      },

      likes: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

const { parseBunnyStreamUrl } = require("../cdn/bunnyCDN");

dramaEpisodeSchema.pre("save", function () {
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

dramaEpisodeSchema.pre("findOneAndUpdate", function () {
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
  "DramaEpisode",
  dramaEpisodeSchema
);