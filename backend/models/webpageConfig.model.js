const mongoose = require("mongoose");

const webpageConfigSchema = new mongoose.Schema(
  {
    heroBanners: [
      {
        contentType: {
          type: String,
          enum: ["Movie", "Series"],
          required: true
        },
        contentId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "heroBanners.contentType",
          required: true
        }
      }
    ],
    sections: [
      {
        categorySlug: {
          type: String,
          required: true
        },
        title: {
          type: String,
          required: true
        },
        items: [
          {
            contentType: {
              type: String,
              enum: ["Movie", "Series"],
              required: true
            },
            contentId: {
              type: mongoose.Schema.Types.ObjectId,
              refPath: "sections.items.contentType",
              required: true
            }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("WebpageConfig", webpageConfigSchema);
