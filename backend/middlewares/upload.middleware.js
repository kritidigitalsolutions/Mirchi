const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const {
  uploadBufferToBunny,
} = require("../cdn/bunnyCDN");

const isVercel = Boolean(process.env.VERCEL);
const uploadRoot = isVercel
  ? path.join(os.tmpdir(), "uploads")
  : path.join(process.cwd(), "uploads");

const ensureDir = (dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error(`Error creating directory ${dir}:`, err.message);
  }
};

ensureDir(uploadRoot);

const getUploadInfo = (req, file) => {
  let type = "movies";

  if (req.originalUrl.includes("/series")) type = "series";
  if (req.originalUrl.includes("/episodes")) type = "episodes";
  if (req.originalUrl.includes("/drama-episodes")) type = "dramaepisodes";
  if (req.originalUrl.includes("/shortdramas")) type = "shortdramas";
  if (req.originalUrl.includes("/user")) type = "profile";

  let subfolder = "others";

  if (file.fieldname === "poster" || file.fieldname === "thumbnail") {
    subfolder = "posters";
  } else if (file.fieldname === "banner") {
    subfolder = "banners";
  } else if (file.fieldname === "video") {
    subfolder = "videos";
  } else if (file.fieldname === "trailer") {
    subfolder = "trailers";
  } else if (file.fieldname.startsWith("castImage_")) {
    subfolder = "cast";
  }

  return {
    type,
    subfolder,
    localFolder: path.join(uploadRoot, type, subfolder),
    remoteFolder: `${type}/${subfolder}`,
  };
};

const storage = {
  _handleFile: (req, file, cb) => {
    const uploadInfo = getUploadInfo(req, file);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = uniqueName + path.extname(file.originalname);
    const chunks = [];
    let size = 0;

    file.stream.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
    });

    file.stream.on("error", cb);

    file.stream.on("end", async () => {
      try {
        const result = await uploadBufferToBunny({
          buffer: Buffer.concat(chunks),
          remotePath: `${uploadInfo.remoteFolder}/${filename}`,
          contentType: file.mimetype,
        });

        cb(null, {
          filename,
          destination: uploadInfo.remoteFolder,
          path: result.url,
          cdnUrl: result.url,
          remotePath: result.path,
          size,
        });
      } catch (error) {
        cb(error);
      }
    });
  },

  _removeFile: (req, file, cb) => {
    cb(null);
  },
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/mkv",
    "video/webm",
    "video/quicktime",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

module.exports = upload;
module.exports.uploadRoot = uploadRoot;
