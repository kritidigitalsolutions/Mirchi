const express = require("express");

const router = express.Router();

const upload = require(
  "../../middlewares/upload.middleware"
);

const {
  isAdmin
} = require("../../middlewares/admin.middleware");

const {
  addSeries,
  getAllSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  searchSeries,

} = require(
  "../../controllers/admin/series.controller"
);


// ========================================
// MULTER FIELDS
// ========================================
const seriesUpload =
  upload.fields([
    {
      name: "poster",
      maxCount: 1,
    },
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "trailer",
      maxCount: 1,
    },

    {
      name: "castImage_0",
      maxCount: 1,
    },
    {
      name: "castImage_1",
      maxCount: 1,
    },
    {
      name: "castImage_2",
      maxCount: 1,
    },
  ]);


// ========================================
// ROUTES (Protected)
// ========================================
router.post(
  "/add",
  isAdmin,
  seriesUpload,
  addSeries
);

router.get(
  "/",
  getAllSeries
);

router.get(
  "/search",
  searchSeries
);


router.get(
  "/:id",
  getSeriesById
);

router.patch(
  "/:id",

  isAdmin,
  seriesUpload,
  updateSeries
);

router.delete(
  "/:id",
  isAdmin,
  deleteSeries
);



module.exports = router;