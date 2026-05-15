const multer = require("multer");
const path = require("path");
const fs = require("fs");


// ========================================
// CREATE UPLOAD FOLDER
// ========================================
const uploadPath = "uploads/movies";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}


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

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

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