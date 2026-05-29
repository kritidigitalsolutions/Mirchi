const mongoose = require("mongoose");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: String,
  image: String
});

//  Main Schema
const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    slug: {
      type: String,
      unique: true,
      index: true
    },

    description: String,
    genre: [String],

    releaseYear: Number,
    duration: String,
    language: String,

    poster: String,
    banner: String,
    isComingSoon: { type: Boolean, default: false },
    releaseDate: { type: Date },

    // Priority: higher = shown first (0 = default)
    priority: { type: Number, default: 0 },

    videoUrl: String,

    trailerUrl: String,

    isPremium: { type: Boolean, default: false },

    rating: Number,

    cast: [castSchema],

    category: [
      {
        type: String,
        enum: ["trending", "top10", "recommended"]
        // enum: ["trending", "top10", "recommended", "new releases", "bollywood", "hollywood", "action", "comedy"]
      }
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

  },
  { timestamps: true }
);

//  Auto-generate slug
movieSchema.pre(
  "save",
  function () {

    if (this.title) {

      this.slug =
        this.title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "") +
        "-" +
        Date.now();
    }
  }
);

module.exports = mongoose.model("Movie", movieSchema);