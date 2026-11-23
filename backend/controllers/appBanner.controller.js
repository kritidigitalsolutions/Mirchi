const AppBanner = require("../models/appBanner.model");
const WebpageConfig = require("../models/webpageConfig.model");

const CONTENT_SELECT =
  "title description poster banner contentType isPremium isPublished isHide is18plus releaseYear rating";

const isContentVisible = (c) => c && c.isPublished !== false && c.isHide !== true && c.is18plus !== true;

/**
 * GET /api/app-banners
 * Public. Everything the mobile app's sliding carousel should show, from
 * BOTH places admins manage banners:
 *
 *   1. source "home"   - hero banners picked in Admin > Webpage Layout
 *                        (each opens its movie/series, uses the title's banner image)
 *   2. source "custom" - banners from Admin > App Banners
 *                        (own image, optional link, on/off, schedule)
 *
 * Home banners come first, then custom banners, each in admin order.
 * A custom banner that links to a title already in the home banners
 * replaces that home banner (so the same title never shows twice).
 */
exports.getAppBanners = async (req, res) => {
  try {
    const now = new Date();
    const [config, customDocs] = await Promise.all([
      WebpageConfig.findOne()
        .populate({ path: "heroBanners.contentId", select: CONTENT_SELECT })
        .lean(),
      AppBanner.find({
        isActive: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
      })
        .sort({ order: 1, createdAt: -1 })
        .populate({ path: "contentId", select: CONTENT_SELECT })
        .lean(),
    ]);

    const custom = customDocs
      .filter((b) => b.linkType !== "content" || isContentVisible(b.contentId))
      .map((b) => ({
        _id: b._id,
        source: "custom",
        title: b.title,
        subtitle: b.subtitle || "",
        image: b.image,
        linkType: b.linkType,
        url: b.linkType === "url" ? b.url : "",
        contentType: b.linkType === "content" ? b.contentType : null,
        content: b.linkType === "content" ? b.contentId : null,
      }));

    const customContentIds = new Set(
      custom.filter((b) => b.content).map((b) => String(b.content._id))
    );

    const home = (config?.heroBanners || [])
      .filter((h) => isContentVisible(h.contentId) && !customContentIds.has(String(h.contentId._id)))
      .filter((h) => h.contentId.banner || h.contentId.poster)
      .map((h) => ({
        _id: h.contentId._id,
        source: "home",
        title: h.contentId.title,
        subtitle: h.contentId.description || "",
        image: h.contentId.banner || h.contentId.poster,
        linkType: "content",
        url: "",
        contentType: h.contentType,
        content: h.contentId,
      }));

    const banners = [...home, ...custom].map((b, i) => ({ ...b, order: i }));

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      success: true,
      count: banners.length,
      homeCount: home.length,
      customCount: custom.length,
      banners,
    });
  } catch (err) {
    console.error("getAppBanners:", err);
    res.status(500).json({ success: false, message: "Failed to load banners" });
  }
};
