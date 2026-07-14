const express = require("express");
const router = express.Router();
const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory
} = require("../../controllers/admin/category.controller");

router.use(isAdmin, hasPermission("content", "categories"));

router.post("/", createCategory);
router.get("/", getAllCategories);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
