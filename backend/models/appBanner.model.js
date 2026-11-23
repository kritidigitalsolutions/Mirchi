const mongoose = require("mongoose");

/**
 * A promotional banner shown in the mobile app's sliding banner carousel.
 * Managed from the admin panel "App Banners" page.
 *
 * linkType decides what happens when the user taps the banner:
 *   none    - nothing (image only)
 *   content - open a movie or series (contentType + contentId)
 *   url     - open an external / deep link (url)
 */
const appBannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 240, default: "" },
    image: { type: String, required: true },

    linkType: {
      type: String,
      enum: ["none", "content", "url"],
      default: "none",
    },
    contentType: {
      type: String,
      enum: ["Movie", "Series", null],
      default: null,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "contentType",
      default: null,
    },
    url: { type: String, trim: true, default: "" },

    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },

    // Optional schedule. A banner is live only between these dates (inclusive).
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppBanner", appBannerSchema);
