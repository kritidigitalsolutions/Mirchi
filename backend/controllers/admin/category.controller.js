const mongoose = require("mongoose");
const Category = require("../../models/category.model");
const { invalidateHomeCache } = require("../../config/redis");

// ========================================
// CREATE CATEGORY
// ========================================
exports.createCategory = async (req, res) => {
  try {
    const { name, priority, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Category with this name already exists" });
    }

    let newPriority = parseInt(priority, 10);
    if (isNaN(newPriority) || newPriority < 0) {
      const maxCat = await Category.findOne().sort({ priority: -1 });
      newPriority = (maxCat && maxCat.priority ? maxCat.priority : 0) + 1;
    }

    const categoryData = { name, priority: newPriority };
    if (isActive !== undefined) categoryData.isActive = isActive === true || isActive === "true";
    
    const category = await Category.create(categoryData);
    invalidateHomeCache();

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        priority: category.priority,
        isActive: category.isActive,
        createdAt: category.createdAt
      }
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// GET ALL CATEGORIES (Admin)
// ========================================
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().select("_id name slug priority isActive createdAt curatedContent").sort({ priority: 1, name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error("GET ALL CATEGORIES ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// UPDATE CATEGORY
// ========================================
exports.updateCategory = async (req, res) => {
  try {
    const { name, isActive, priority } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (name) category.name = name;
    if (isActive !== undefined) category.isActive = isActive === true || isActive === "true";

    if (priority !== undefined) {
      let newPriority = parseInt(priority, 10);
      if (!isNaN(newPriority) && newPriority >= 0) {
        category.priority = newPriority;
      }
    }
    if (isActive !== undefined) category.isActive = isActive === true || isActive === "true";

    await category.save();
    invalidateHomeCache();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        priority: category.priority,
        isActive: category.isActive,
        createdAt: category.createdAt
      }
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// DELETE CATEGORY
// ========================================
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const deletedPriority = category.priority;
    await Category.findByIdAndDelete(req.params.id);

    if (deletedPriority) {
      await Category.updateMany(
        { priority: { $gt: deletedPriority } },
        { $inc: { priority: -1 } }
      );
    }
    invalidateHomeCache();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// SAVE CURATED CONTENT FOR CATEGORY
// ========================================
exports.saveCuratedContent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "items must be an array" });
    }

    const validCurated = [];
    items.forEach((i, index) => {
      const rawId = i.contentId?._id || i.contentId;
      if (rawId && mongoose.Types.ObjectId.isValid(String(rawId))) {
        const type = (i.contentType || "").toString().toLowerCase() === "movie" ? "Movie" : "Series";
        const pos = i.position !== undefined && i.position !== null && !isNaN(parseInt(i.position, 10))
          ? parseInt(i.position, 10)
          : (index + 1);
        validCurated.push({
          contentType: type,
          contentId: new mongoose.Types.ObjectId(String(rawId)),
          position: pos
        });
      }
    });

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: { curatedContent: validCurated } },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    invalidateHomeCache();

    return res.status(200).json({
      success: true,
      message: "Curated content saved successfully",
      count: category.curatedContent.length,
      data: category.curatedContent
    });
  } catch (error) {
    console.error("SAVE CURATED CONTENT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
