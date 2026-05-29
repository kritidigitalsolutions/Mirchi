const mongoose = require("mongoose");
const Episode = require("./episode.model");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: String,
  image: String
});

const seriesSchema = new mongoose.Schema(
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

    trailerUrl: String,

    isPremium: { type: Boolean, default: false },

    // Priority: higher = shown first (0 = default)
    priority: { type: Number, default: 0 },

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

    totalSeasons: { type: Number, default: 0 },
    totalEpisodes: { type: Number, default: 0 }




  },
  { timestamps: true }
);

// slug generator
seriesSchema.pre("save", function () {
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
});

seriesSchema.pre("findOneAndDelete", async function () {
  const series = await this.model.findOne(this.getFilter()).select("_id");

  if (series) {
    await Episode.deleteMany({
      seriesId: series._id
    });
  }
});

seriesSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await Episode.deleteMany({
      seriesId: this._id
    });
  }
);

module.exports = mongoose.model("Series", seriesSchema);
