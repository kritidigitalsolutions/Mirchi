const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isAdmin } = require("../../middlewares/admin.middleware");
const { uploadChunk } = require("../../controllers/admin/upload.controller");

// Ensure temp directory exists
const tempDir = path.join(__dirname, "../../uploads/temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Lightweight local disk storage for incoming chunks
const upload = multer({ dest: tempDir });

router.post("/chunk", isAdmin, upload.single("chunk"), uploadChunk);

module.exports = router;
