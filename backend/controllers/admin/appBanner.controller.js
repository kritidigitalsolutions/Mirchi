const mongoose = require("mongoose");
const AppBanner = require("../../models/appBanner.model");
const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");

const CONTENT_SELECT = "title poster banner contentType isPublished isHide is18plus";

/* ---------- helpers ---------- */

const parseBool = (v, fallback) => {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  return String(v).toLowerCase() === "true";
};

const parseDate = (v) => {
  if (!v || v === "null") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Builds and validates the editable fields from a request body.
 * Returns { data } or { error }.
 */
const buildFields = (body, existing = {}) => {
  const data = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.subtitle !== undefined) data.subtitle = String(body.subtitle).trim();
  if (body.isActive !== undefined) data.isActive = parseBool(body.isActive, true);
  if (body.order !== undefined && body.order !== "") {
    const n = Number(body.order);
    if (!Number.isFinite(n)) return { error: "Order must be a number" };
    data.order = n;
  }

  if (body.startDate !== undefined) {
    const d = parseDate(body.startDate);
    if (d === undefined) return { error: "Invalid start date" };
    data.startDate = d;
  }
  if (body.endDate !== undefined) {
    const d = parseDate(body.endDate);
    if (d === undefined) return { error: "Invalid end date" };
    data.endDate = d;
  }
  const start = data.startDate !== undefined ? data.startDate : existing.startDate;
  const end = data.endDate !== undefined ? data.endDate : existing.endDate;
  if (start && end && start > end) return { error: "End date must be after start date" };

  const linkType = body.linkType !== undefined ? body.linkType : existing.linkType || "none";
  if (!["none", "content", "url"].includes(linkType)) return { error: "Invalid link type" };
  data.linkType = linkType;

  if (linkType === "content") {
    const contentType = body.contentType ?? existing.contentType;
    const contentId = body.contentId ?? existing.contentId;
    if (!["Movie", "Series"].includes(contentType)) return { error: "Choose a movie or series to link" };
    if (!contentId || !mongoose.Types.ObjectId.isValid(String(contentId)))
      return { error: "Choose a movie or series to link" };
    data.contentType = contentType;
    data.contentId = contentId;
    data.url = "";
  } else if (linkType === "url") {
    const url = String(body.url ?? existing.url ?? "").trim();
    if (!url) return { error: "Enter a link URL" };
    data.url = url;
    data.contentType = null;
    data.contentId = null;
  } else {
    data.url = "";
    data.contentType = null;
    data.contentId = null;
  }

  return { data };
};

/* ---------- controllers ---------- */

// GET /api/admin/app-banners
exports.listBanners = async (req, res) => {
  try {
    const banners = await AppBanner.find()
      .sort({ order: 1, createdAt: -1 })
      .populate({ path: "contentId", select: CONTENT_SELECT })
      .lean();
    res.json({ success: true, banners });
  } catch (err) {
    console.error("listBanners:", err);
    res.status(500).json({ success: false, message: "Failed to load banners" });
  }
};

// POST /api/admin/app-banners   (multipart: banner = image file)
exports.createBanner = async (req, res) => {
  try {
    const image = getMediaUrl(req.file, req.body.image);
    if (!image) return res.status(400).json({ success: false, message: "Banner image is required" });
    if (!req.body.title || !String(req.body.title).trim())
      return res.status(400).json({ success: false, message: "Title is required" });

    const { data, error } = buildFields(req.body);
    if (error) {
      if (req.file) await deleteMedia(image).catch(() => {});
      return res.status(400).json({ success: false, message: error });
    }

    if (data.order === undefined) {
      const last = await AppBanner.findOne().sort({ order: -1 }).select("order").lean();
      data.order = last ? last.order + 1 : 0;
    }

    const banner = await AppBanner.create({ ...data, image });
    await banner.populate({ path: "contentId", select: CONTENT_SELECT });
    res.status(201).json({ success: true, banner });
  } catch (err) {
    console.error("createBanner:", err);
    res.status(500).json({ success: false, message: "Failed to create banner" });
  }
};

// PATCH /api/admin/app-banners/:id   (multipart, image optional)
exports.updateBanner = async (req, res) => {
  try {
    const banner = await AppBanner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });

    if (req.body.title !== undefined && !String(req.body.title).trim())
      return res.status(400).json({ success: false, message: "Title is required" });

    const { data, error } = buildFields(req.body, banner.toObject());
    if (error) {
      if (req.file) await deleteMedia(getMediaUrl(req.file)).catch(() => {});
      return res.status(400).json({ success: false, message: error });
    }

    const oldImage = banner.image;
    if (req.file) data.image = getMediaUrl(req.file);

    banner.set(data);
    await banner.save();

    if (req.file && oldImage && oldImage !== banner.image) {
      deleteMedia(oldImage).catch((e) => console.error("delete old banner image:", e.message));
    }

    await banner.populate({ path: "contentId", select: CONTENT_SELECT });
    res.json({ success: true, banner });
  } catch (err) {
    console.error("updateBanner:", err);
    res.status(500).json({ success: false, message: "Failed to update banner" });
  }
};

// PATCH /api/admin/app-banners/:id/toggle
exports.toggleBanner = async (req, res) => {
  try {
    const banner = await AppBanner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });
    banner.isActive = !banner.isActive;
    await banner.save();
    res.json({ success: true, isActive: banner.isActive });
  } catch (err) {
    console.error("toggleBanner:", err);
    res.status(500).json({ success: false, message: "Failed to update banner" });
  }
};

// PUT /api/admin/app-banners/reorder   body: { ids: [id1, id2, ...] }
exports.reorderBanners = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.some((id) => !mongoose.Types.ObjectId.isValid(String(id))))
      return res.status(400).json({ success: false, message: "ids must be an array of banner ids" });

    await AppBanner.bulkWrite(
      ids.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
      }))
    );
    res.json({ success: true });
  } catch (err) {
    console.error("reorderBanners:", err);
    res.status(500).json({ success: false, message: "Failed to reorder banners" });
  }
};

// DELETE /api/admin/app-banners/:id
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await AppBanner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });
    deleteMedia(banner.image).catch((e) => console.error("delete banner image:", e.message));
    res.json({ success: true });
  } catch (err) {
    console.error("deleteBanner:", err);
    res.status(500).json({ success: false, message: "Failed to delete banner" });
  }
};


/* ======================================================
   CONTENT BANNERS
   The banner image uploaded on each movie / series
   (Add Content > Media Assets > Banner), managed from here too.
   ====================================================== */

const getContentModel = (type) => {
  if (type === "movie") return require("../../models/movie.model");
  if (type === "series") return require("../../models/series.model");
  return null;
};

const CONTENT_BANNER_SELECT = "title banner poster isPublished isHide is18plus releaseYear updatedAt";

// GET /api/admin/app-banners/content
exports.listContentBanners = async (req, res) => {
  try {
    const [movies, series] = await Promise.all([
      getContentModel("movie").find().select(CONTENT_BANNER_SELECT).lean(),
      getContentModel("series").find().select(CONTENT_BANNER_SELECT).lean(),
    ]);
    const items = [
      ...movies.map((m) => ({ ...m, contentType: "movie" })),
      ...series.map((s) => ({ ...s, contentType: "series" })),
    ].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    res.json({ success: true, items });
  } catch (err) {
    console.error("listContentBanners:", err);
    res.status(500).json({ success: false, message: "Failed to load content banners" });
  }
};

// PATCH /api/admin/app-banners/content/:type/:id   (multipart: banner = image)
exports.replaceContentBanner = async (req, res) => {
  try {
    const Model = getContentModel(req.params.type);
    if (!Model) return res.status(400).json({ success: false, message: "Type must be movie or series" });
    if (!req.file) return res.status(400).json({ success: false, message: "Banner image is required" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const doc = await Model.findById(req.params.id).select("banner").lean();
    if (!doc) {
      await deleteMedia(getMediaUrl(req.file)).catch(() => {});
      return res.status(404).json({ success: false, message: "Content not found" });
    }

    const banner = getMediaUrl(req.file);
    // updateOne: change only the banner, skip the model's save hooks
    await Model.updateOne({ _id: req.params.id }, { $set: { banner } });
    if (doc.banner && doc.banner !== banner) {
      deleteMedia(doc.banner).catch((e) => console.error("delete old content banner:", e.message));
    }
    res.json({ success: true, banner });
  } catch (err) {
    console.error("replaceContentBanner:", err);
    res.status(500).json({ success: false, message: "Failed to update banner" });
  }
};

// DELETE /api/admin/app-banners/content/:type/:id
exports.removeContentBanner = async (req, res) => {
  try {
    const Model = getContentModel(req.params.type);
    if (!Model) return res.status(400).json({ success: false, message: "Type must be movie or series" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const doc = await Model.findById(req.params.id).select("banner").lean();
    if (!doc) return res.status(404).json({ success: false, message: "Content not found" });

    await Model.updateOne({ _id: req.params.id }, { $set: { banner: "" } });
    if (doc.banner) deleteMedia(doc.banner).catch((e) => console.error("delete content banner:", e.message));
    res.json({ success: true });
  } catch (err) {
    console.error("removeContentBanner:", err);
    res.status(500).json({ success: false, message: "Failed to remove banner" });
  }
};
