const Category = require("../models/category.model");

// ========================================
// GET ACTIVE CATEGORIES (User-facing)
// ========================================
exports.getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("_id name slug")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error("GET ACTIVE CATEGORIES ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
