const multer = require("multer");
const path = require("path");
const fs = require("fs");


// ========================================
// CREATE UPLOAD FOLDER
// ========================================
const uploadPath = "uploads/movies";

const ensureDir = (dir) => {
  try {
    if (!fs.existsSync(dir)) {
      // On Vercel/Serverless, the filesystem is read-only.
      // We only attempt to create directories if not on Vercel.
      if (!process.env.VERCEL) {
        fs.mkdirSync(dir, { recursive: true });
      } else {
        console.warn(`⚠️ Skipping directory creation on Vercel: ${dir}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error creating directory ${dir}:`, err.message);
  }
};

ensureDir(uploadPath);


// ========================================
// DISK STORAGE
// ========================================
const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    let type = "movies"; // default
    if (req.originalUrl.includes("/series")) type = "series";
    if (req.originalUrl.includes("/episodes")) type = "episodes";
    if (req.originalUrl.includes("/user")) type = "profile";

    let subfolder = "others";
    if (file.fieldname === "poster" || file.fieldname === "thumbnail") subfolder = "posters";
    else if (file.fieldname === "banner") subfolder = "banners";
    else if (file.fieldname === "video") subfolder = "videos";
    else if (file.fieldname === "trailer") subfolder = "trailers";
    else if (file.fieldname.startsWith("castImage_")) subfolder = "cast";


    const folder = `uploads/${type}/${subfolder}`;
    ensureDir(folder);

    cb(null, folder);
  },

  filename: (req, file, cb) => {

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueName +
      path.extname(
        file.originalname
      )
    );
  },
});


// ========================================
// FILE FILTER
// ========================================
const fileFilter = (
  req,
  file,
  cb
) => {

  const allowedMimeTypes = [

    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",

    // Videos
    "video/mp4",
    "video/mkv",
    "video/webm",
    "video/quicktime",
  ];

  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true);
  }

  else {

    cb(
      new Error(
        "Invalid file type"
      ),
      false
    );
  }
};


// ========================================
// MULTER CONFIG
// ========================================
const upload = multer({

  storage,

  fileFilter,

  limits: {
    fileSize:
      500 * 1024 * 1024,
  },
});

module.exports = upload;