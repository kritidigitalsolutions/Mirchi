const express = require("express");
const router = express.Router();
const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");
const { getContentStats, getAllContent, toggle18PlusContent, toggleHide18PlusContent } = require("../../controllers/admin/content.controller");

// All content routes are admin-only and require content permission
router.use(isAdmin, hasPermission("content"));

router.get("/stats", getContentStats);
router.get("/all", getAllContent);
router.put("/toggle-18", toggle18PlusContent);
router.put("/toggle-hide-18", toggleHide18PlusContent);

module.exports = router;
