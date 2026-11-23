const express = require("express");
const router = express.Router();
const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");
const upload = require("../../middlewares/upload.middleware");
const validateFileSizes = require("../../middlewares/validateFileSizes");
const ctrl = require("../../controllers/admin/appBanner.controller");

// App banners are managed by admins with content permission
router.use(isAdmin, hasPermission("content"));

const bannerUpload = upload.single("banner");

router.get("/", ctrl.listBanners);
router.post("/", bannerUpload, validateFileSizes, ctrl.createBanner);
router.put("/reorder", ctrl.reorderBanners);
router.get("/content", ctrl.listContentBanners);
router.patch("/content/:type/:id", bannerUpload, validateFileSizes, ctrl.replaceContentBanner);
router.delete("/content/:type/:id", ctrl.removeContentBanner);
router.patch("/:id", bannerUpload, validateFileSizes, ctrl.updateBanner);
router.patch("/:id/toggle", ctrl.toggleBanner);
router.delete("/:id", ctrl.deleteBanner);

module.exports = router;
