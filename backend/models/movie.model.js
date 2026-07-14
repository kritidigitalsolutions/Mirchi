const mongoose = require("mongoose");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  image: {
    type: String,
    default: ""
  }
});

// Main Schema
const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      index: true
    },

    description: {
      type: String,
      default: ""
    },

    genre: [{
  type: String,
  trim: true
}],

    releaseYear: Number,

    duration: String,

    language: String,

    poster: String,

    banner: String,

    isComingSoon: {
      type: Boolean,
      default: false
    },

    releaseDate: {
      type: Date
    },

    // Higher priority appears first
    priority: {
      type: Number,
      default: 0
    },

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

    trailerUrl: String,

    isPremium: {
      type: Boolean,
      default: false
    },

    is18plus: {
      type: Boolean,
      default: false
    },
    allAges: {
      type: Boolean,
      default: false
    },
    isHide: {
      type: Boolean,
      default: false
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },

    cast: [castSchema],

    category: [
      {
        type: String,
        trim: true
      }
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

// Auto-generate slug only once
movieSchema.pre("save", function () {

  if (!this.slug && this.title) {

    this.slug =
      this.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "") +
      "-" +
      Date.now();
  }
});

// Indexes
movieSchema.index({
  priority: -1,
  createdAt: -1
});

movieSchema.index({
  title: "text",
  description: "text"
});

const { parseBunnyStreamUrl } = require("../cdn/bunnyCDN");

movieSchema.pre("save", function () {
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

movieSchema.pre("findOneAndUpdate", function () {
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
  "Movie",
  movieSchema
);