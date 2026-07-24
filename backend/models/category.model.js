const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },
    
    priority: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Auto-generate slug from name before saving
categorySchema.pre("save", async function () {
  if (this.isModified("name") || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

categorySchema.index({ isActive: 1 });

module.exports = mongoose.model("Category", categorySchema);
