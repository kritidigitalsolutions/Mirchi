const express = require("express");
const router = express.Router();
const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");
const { getWebpageConfig, updateWebpageConfig } = require("../../controllers/admin/webpage.controller");

// Webpage config routes are admin-only and require content permission
router.use(isAdmin, hasPermission("content"));

router.get("/", getWebpageConfig);
router.post("/", updateWebpageConfig);

module.exports = router;
