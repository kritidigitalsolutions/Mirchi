const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isAdmin } = require("../../middlewares/admin.middleware");
const { uploadChunk } = require("../../controllers/admin/upload.controller");

const os = require("os");
const isVercel = Boolean(process.env.VERCEL);

// Ensure temp directory exists
const tempDir = isVercel
  ? path.join(os.tmpdir(), "uploads", "temp")
  : path.join(__dirname, "../../uploads/temp");

try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
} catch (err) {
  console.error("Temp directory creation error:", err.message);
}

// Lightweight local disk storage for incoming chunks
const upload = multer({ dest: tempDir });

router.post("/chunk", isAdmin, upload.single("chunk"), uploadChunk);

module.exports = router;
