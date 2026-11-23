const mongoose = require("mongoose");
const WatchSession = require("../../models/watchSession.model");
const ShareEvent = require("../../models/shareEvent.model");
const Series = require("../../models/series.model");
const Episode = require("../../models/episode.model");
// registers the User model for populate("user")
require("../../models/user.model");
const Interaction = require("../../models/interaction.model");
const Watchlist = require("../../models/watchlist.model");
const { redis } = require("../../config/redis");
const {
  IST_TZ,
  getRange,
  getPreviousRange,
  buildBucketKeys,
} = require("../../utils/dateRange");

// ========================================
// SHARED AGGREGATION HELPERS
// ========================================

const dateMatch = (field, { start, end }) => ({
  [field]: start ? { $gte: start, $lt: end } : { $lt: end },
});

// $group accumulators shared by every report
const METRIC_GROUP = {
  sessions: { $sum: 1 },
  views: { $sum: { $cond: ["$counted", 1, 0] } },
  completions: { $sum: { $cond: ["$completed", 1, 0] } },
  watchSec: { $sum: "$watchedSec" },
  viewers: { $addToSet: { $cond: ["$counted", "$viewer", null] } },
  // average share of the episode reached (only when duration is known)
  avgReach: {
    $avg: {
      $cond: [
        { $gt: ["$durationSec", 0] },
        { $min: [{ $divide: ["$maxPositionSec", "$durationSec"] }, 1] },
        null,
      ],
    },
  },
};

// Replace the viewers array with its size so we don't ship big arrays
const METRIC_PROJECT = {
  sessions: 1,
  views: 1,
  completions: 1,
  watchSec: 1,
  avgReach: 1,
  uniqueViewers: { $size: { $setDifference: ["$viewers", [null]] } },
};

const round = (n, d = 1) => Math.round((n || 0) * 10 ** d) / 10 ** d;

const finalizeMetrics = (m = {}) => {
  const views = m.views || 0;
  const watchSec = m.watchSec || 0;
  return {
    plays: m.sessions || 0,
    views,
    uniqueViewers: m.uniqueViewers || 0,
    completions: m.completions || 0,
    watchSec,
    watchMinutes: Math.round(watchSec / 60),
    avgWatchSec: views ? Math.round(watchSec / views) : 0,
    completionRate: views ? round(((m.completions || 0) / views) * 100, 1) : 0,
    avgWatchedPct: m.avgReach != null ? round(m.avgReach * 100, 1) : null,
  };
};

const aggregateMetrics = async (match) => {
  const [row] = await WatchSession.aggregate([
    { $match: match },
    { $group: { _id: null, ...METRIC_GROUP } },
    { $project: METRIC_PROJECT },
  ]);
  return finalizeMetrics(row);
};

// Time series with empty buckets filled in
const aggregateTrend = async (match, range) => {
  const rows = await WatchSession.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: range.format, date: "$startedAt", timezone: IST_TZ } },
        ...METRIC_GROUP,
      },
    },
    { $project: METRIC_PROJECT },
    { $sort: { _id: 1 } },
  ]);
  const byKey = new Map(rows.map((r) => [r._id, r]));

  let start = range.start;
  if (!start) {
    // "all time": start the chart at the first recorded session
    if (!rows.length) return [];
    const first = await WatchSession.findOne(match).sort({ startedAt: 1 }).select("startedAt").lean();
    start = first?.startedAt || range.end;
  }
  const keys = buildBucketKeys(start, range.end, range.bucket);
  if (!keys.length && rows.length) keys.push(...rows.map((r) => r._id));

  return keys.map((key) => {
    const m = finalizeMetrics(byKey.get(key));
    return {
      key,
      views: m.views,
      plays: m.plays,
      uniqueViewers: m.uniqueViewers,
      watchMinutes: m.watchMinutes,
      completions: m.completions,
    };
  });
};

const aggregateSplit = async (match, field) => {
  const rows = await WatchSession.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, views: { $sum: { $cond: ["$counted", 1, 0] } }, watchSec: { $sum: "$watchedSec" } } },
    { $sort: { views: -1 } },
  ]);
  return rows.map((r) => ({ name: r._id, views: r.views, watchMinutes: Math.round(r.watchSec / 60) }));
};

const pctChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return round(((current - previous) / previous) * 100, 1);
};

const compareMetrics = (current, previous) => {
  if (!previous) return null;
  const keys = ["views", "uniqueViewers", "watchMinutes", "completionRate", "avgWatchSec"];
  return Object.fromEntries(keys.map((k) => [k, pctChange(current[k], previous[k])]));
};

const rangeInfo = (range) => ({
  range: range.range,
  start: range.start,
  end: range.end,
  bucket: range.bucket,
});

const parsePaging = (query, defaultLimit = 20, maxLimit = 100) => ({
  page: Math.max(parseInt(query.page, 10) || 1, 1),
  limit: Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit),
});

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const countByContent = async (Model, match, groupField, extraGroup = {}) => {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: `$${groupField}`, count: { $sum: 1 }, ...extraGroup } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
};

const handleError = (res, label, error) => {
  console.error(`${label} Error:`, error);
  res.status(500).json({ success: false, message: "Server error" });
};

// ========================================
// GET /api/admin/analytics/overview?range=&from=&to=
// ========================================
exports.getOverview = async (req, res) => {
  try {
    const range = getRange(req.query.range, req.query.from, req.query.to);
    const match = dateMatch("startedAt", range);
    const prevRange = getPreviousRange(range);

    const [kpis, prevKpis, trend, topSeriesRows, topEpisodeRows, platforms, audience, shares, likes, watchlistAdds] =
      await Promise.all([
        aggregateMetrics(match),
        prevRange ? aggregateMetrics(dateMatch("startedAt", prevRange)) : null,
        aggregateTrend(match, range),
        WatchSession.aggregate([
          { $match: match },
          { $group: { _id: "$series", ...METRIC_GROUP } },
          { $project: METRIC_PROJECT },
          { $sort: { views: -1, watchSec: -1 } },
          { $limit: 10 },
          { $lookup: { from: Series.collection.name, localField: "_id", foreignField: "_id", as: "series" } },
          { $unwind: { path: "$series", preserveNullAndEmptyArrays: true } },
        ]),
        WatchSession.aggregate([
          { $match: match },
          { $group: { _id: "$episode", ...METRIC_GROUP } },
          { $project: METRIC_PROJECT },
          { $sort: { views: -1, watchSec: -1 } },
          { $limit: 10 },
          { $lookup: { from: Episode.collection.name, localField: "_id", foreignField: "_id", as: "episode" } },
          { $unwind: { path: "$episode", preserveNullAndEmptyArrays: true } },
          { $lookup: { from: Series.collection.name, localField: "episode.seriesId", foreignField: "_id", as: "series" } },
          { $unwind: { path: "$series", preserveNullAndEmptyArrays: true } },
        ]),
        aggregateSplit(match, "platform"),
        aggregateSplit(match, "isSubscriber"),
        ShareEvent.countDocuments(dateMatch("createdAt", range)),
        Interaction.countDocuments({ contentType: "series", type: "like", ...dateMatch("createdAt", range) }),
        Watchlist.countDocuments({ itemModel: "Series", ...dateMatch("createdAt", range) }),
      ]);

    // New vs returning viewers (returning = watched anything before this range)
    let newViewers = null;
    let returningViewers = null;
    if (range.start) {
      const viewers = await WatchSession.distinct("viewer", { ...match, counted: true });
      if (viewers.length <= 50000) {
        const returning = await WatchSession.distinct("viewer", {
          viewer: { $in: viewers },
          startedAt: { $lt: range.start },
        });
        returningViewers = returning.length;
        newViewers = viewers.length - returning.length;
      }
    }

    res.status(200).json({
      success: true,
      ...rangeInfo(range),
      kpis: { ...kpis, shares, likes, watchlistAdds, newViewers, returningViewers },
      change: compareMetrics(kpis, prevKpis),
      trend,
      topSeries: topSeriesRows.map((r) => ({
        _id: r._id,
        title: r.series?.title || "Deleted series",
        poster: r.series?.poster || "",
        ...finalizeMetrics(r),
      })),
      topEpisodes: topEpisodeRows.map((r) => ({
        _id: r._id,
        title: r.episode?.title || "Deleted episode",
        seriesId: r.series?._id || null,
        seriesTitle: r.series?.title || "—",
        seasonNumber: r.episode?.seasonNumber,
        episodeNumber: r.episode?.episodeNumber,
        ...finalizeMetrics(r),
      })),
      platforms,
      audience: audience.map((a) => ({ ...a, name: a.name ? "Subscribers" : "Free / guests" })),
    });
  } catch (error) {
    handleError(res, "Analytics Overview", error);
  }
};

// ========================================
// GET /api/admin/analytics/series?range=&from=&to=&search=&sort=&order=&page=&limit=
// Every series with its metrics for the range (zero rows included).
// ========================================
const SERIES_SORTS = ["views", "uniqueViewers", "watchMinutes", "completionRate", "avgWatchSec", "likes", "shares", "watchlistAdds", "title", "createdAt"];

exports.getSeriesList = async (req, res) => {
  try {
    const range = getRange(req.query.range, req.query.from, req.query.to);
    const { page, limit } = parsePaging(req.query, 20, 200);
    const sort = SERIES_SORTS.includes(req.query.sort) ? req.query.sort : "views";
    const order = req.query.order === "asc" ? 1 : -1;
    const search = req.query.search?.trim();

    const seriesFilter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      seriesFilter.title = { $regex: escaped, $options: "i" };
    }

    const [seriesDocs, metricRows, likeRows, shareMap, watchlistMap, episodeCountMap] = await Promise.all([
      Series.find(seriesFilter).select("title poster isPremium isPublished isHide totalEpisodes createdAt").lean(),
      WatchSession.aggregate([
        { $match: dateMatch("startedAt", range) },
        { $group: { _id: "$series", ...METRIC_GROUP } },
        { $project: METRIC_PROJECT },
      ]),
      Interaction.aggregate([
        { $match: { contentType: "series", type: "like", ...dateMatch("createdAt", range) } },
        { $group: { _id: "$contentId", likes: { $sum: 1 } } },
      ]),
      countByContent(ShareEvent, dateMatch("createdAt", range), "series"),
      countByContent(Watchlist, { itemModel: "Series", ...dateMatch("createdAt", range) }, "item"),
      countByContent(Episode, {}, "seriesId"),
    ]);

    const metricMap = new Map(metricRows.map((r) => [String(r._id), r]));
    const likeMap = new Map(likeRows.map((r) => [String(r._id), r]));

    const rows = seriesDocs.map((s) => {
      const id = String(s._id);
      return {
        _id: s._id,
        title: s.title,
        poster: s.poster || "",
        isPremium: Boolean(s.isPremium),
        isPublished: s.isPublished !== false && !s.isHide,
        totalEpisodes: episodeCountMap.get(id)?.count || 0,
        createdAt: s.createdAt,
        ...finalizeMetrics(metricMap.get(id)),
        likes: likeMap.get(id)?.likes || 0,
        shares: shareMap.get(id)?.count || 0,
        watchlistAdds: watchlistMap.get(id)?.count || 0,
      };
    });

    rows.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (sort === "title") return order * String(av || "").localeCompare(String(bv || ""));
      if (sort === "createdAt") return order * (new Date(av) - new Date(bv));
      return order * ((av || 0) - (bv || 0)) || String(a.title).localeCompare(String(b.title));
    });

    const total = rows.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const currentPage = Math.min(page, totalPages);

    res.status(200).json({
      success: true,
      ...rangeInfo(range),
      series: rows.slice((currentPage - 1) * limit, currentPage * limit),
      pagination: { currentPage, totalPages, total, limit },
    });
  } catch (error) {
    handleError(res, "Analytics Series List", error);
  }
};

// ========================================
// GET /api/admin/analytics/series/:id?range=&from=&to=
// ========================================
exports.getSeriesDetail = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid series id" });
    }
    const seriesId = toObjectId(req.params.id);
    const series = await Series.findById(seriesId)
      .select("title poster banner isPremium genre language stats createdAt")
      .lean();
    if (!series) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }

    const range = getRange(req.query.range, req.query.from, req.query.to);
    const match = { series: seriesId, ...dateMatch("startedAt", range) };
    const prevRange = getPreviousRange(range);

    const [kpis, prevKpis, trend, episodeRows, episodes, platforms, audience, shares, likes, watchlistAdds] =
      await Promise.all([
        aggregateMetrics(match),
        prevRange ? aggregateMetrics({ series: seriesId, ...dateMatch("startedAt", prevRange) }) : null,
        aggregateTrend(match, range),
        WatchSession.aggregate([
          { $match: match },
          { $group: { _id: "$episode", ...METRIC_GROUP } },
          { $project: METRIC_PROJECT },
        ]),
        Episode.find({ seriesId })
          .select("title seasonNumber episodeNumber durationSec duration stats")
          .sort({ seasonNumber: 1, episodeNumber: 1 })
          .lean(),
        aggregateSplit(match, "platform"),
        aggregateSplit(match, "isSubscriber"),
        ShareEvent.countDocuments({ series: seriesId, ...dateMatch("createdAt", range) }),
        Interaction.countDocuments({ contentId: seriesId, type: "like", ...dateMatch("createdAt", range) }),
        Watchlist.countDocuments({ item: seriesId, ...dateMatch("createdAt", range) }),
      ]);

    const byEpisode = new Map(episodeRows.map((r) => [String(r._id), r]));

    // Per-episode table + funnel: how many viewers each episode keeps
    let firstViewers = null;
    let prevViewers = null;
    const episodeTable = episodes.map((ep) => {
      const m = finalizeMetrics(byEpisode.get(String(ep._id)));
      if (firstViewers === null) firstViewers = m.uniqueViewers;
      const row = {
        _id: ep._id,
        title: ep.title,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        durationSec: ep.durationSec || 0,
        duration: ep.duration || "",
        ...m,
        // % of episode-1 viewers who reached this episode
        reachPct: firstViewers ? round((m.uniqueViewers / firstViewers) * 100, 1) : 0,
        // % of the previous episode's viewers who watched this one
        keptFromPrevPct: prevViewers ? round((m.uniqueViewers / prevViewers) * 100, 1) : null,
        allTime: ep.stats || { views: 0, watchTimeSec: 0, completions: 0, shares: 0 },
      };
      prevViewers = m.uniqueViewers;
      return row;
    });

    res.status(200).json({
      success: true,
      ...rangeInfo(range),
      series: {
        _id: series._id,
        title: series.title,
        poster: series.poster,
        banner: series.banner,
        isPremium: series.isPremium,
        genre: series.genre,
        language: series.language,
        // counted from the Episode collection (the stored counter can be stale)
        totalEpisodes: episodes.length,
        totalSeasons: new Set(episodes.map((e) => e.seasonNumber)).size,
        createdAt: series.createdAt,
        allTime: series.stats || { views: 0, watchTimeSec: 0, completions: 0, shares: 0 },
      },
      kpis: {
        ...kpis,
        shares,
        likes,
        watchlistAdds,
      },
      change: compareMetrics(kpis, prevKpis),
      trend,
      episodes: episodeTable,
      platforms,
      audience: audience.map((a) => ({ ...a, name: a.name ? "Subscribers" : "Free / guests" })),
    });
  } catch (error) {
    handleError(res, "Analytics Series Detail", error);
  }
};

// ========================================
// GET /api/admin/analytics/episodes/:id?range=&from=&to=&page=&limit=
// ========================================
exports.getEpisodeDetail = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid episode id" });
    }
    const episodeId = toObjectId(req.params.id);
    const episode = await Episode.findById(episodeId)
      .select("title seriesId seasonNumber episodeNumber durationSec duration thumbnail thumbnailUrl videoId stats createdAt")
      .lean();
    if (!episode) {
      return res.status(404).json({ success: false, message: "Episode not found" });
    }

    const range = getRange(req.query.range, req.query.from, req.query.to);
    const match = { episode: episodeId, ...dateMatch("startedAt", range) };
    const { page, limit } = parsePaging(req.query, 20, 100);

    const [series, kpis, trend, retentionRows, platforms, audience, shares, viewerCount, recentSessions] =
      await Promise.all([
        Series.findById(episode.seriesId).select("title poster").lean(),
        aggregateMetrics(match),
        aggregateTrend(match, range),
        // Retention: highest 10% bucket each session reached
        WatchSession.aggregate([
          { $match: { ...match, durationSec: { $gt: 0 } } },
          {
            $group: {
              _id: {
                $min: [10, { $floor: { $multiply: [{ $divide: ["$maxPositionSec", "$durationSec"] }, 10] } }],
              },
              count: { $sum: 1 },
            },
          },
        ]),
        aggregateSplit(match, "platform"),
        aggregateSplit(match, "isSubscriber"),
        ShareEvent.countDocuments({ episode: episodeId, ...dateMatch("createdAt", range) }),
        WatchSession.countDocuments(match),
        WatchSession.find(match)
          .sort({ startedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("user", "name phone email")
          .select("user deviceId platform isSubscriber startedAt lastPingAt watchedSec maxPositionSec durationSec counted completed")
          .lean(),
      ]);

    // Turn bucket counts into "% of plays that reached X%"
    const bucketCounts = Array(11).fill(0);
    retentionRows.forEach((r) => { bucketCounts[Math.max(0, Math.min(10, r._id))] = r.count; });
    const totalWithDuration = bucketCounts.reduce((a, b) => a + b, 0);
    const retention = [];
    let reached = totalWithDuration;
    for (let i = 0; i <= 10; i += 1) {
      retention.push({
        position: `${i * 10}%`,
        pct: totalWithDuration ? round((reached / totalWithDuration) * 100, 1) : 0,
      });
      reached -= bucketCounts[i];
    }

    const totalPages = Math.max(Math.ceil(viewerCount / limit), 1);

    res.status(200).json({
      success: true,
      ...rangeInfo(range),
      episode: {
        _id: episode._id,
        title: episode.title,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        durationSec: episode.durationSec || 0,
        duration: episode.duration || "",
        thumbnail: episode.thumbnail || episode.thumbnailUrl || "",
        hasBunnyVideo: Boolean(episode.videoId),
        createdAt: episode.createdAt,
        allTime: episode.stats || { views: 0, watchTimeSec: 0, completions: 0, shares: 0 },
      },
      series: series ? { _id: series._id, title: series.title, poster: series.poster } : null,
      kpis: { ...kpis, shares },
      trend,
      retention,
      platforms,
      audience: audience.map((a) => ({ ...a, name: a.name ? "Subscribers" : "Free / guests" })),
      viewers: recentSessions.map((s) => ({
        _id: s._id,
        user: s.user ? { _id: s.user._id, name: s.user.name, phone: s.user.phone, email: s.user.email } : null,
        guest: !s.user,
        platform: s.platform,
        isSubscriber: s.isSubscriber,
        startedAt: s.startedAt,
        lastPingAt: s.lastPingAt,
        watchedSec: s.watchedSec,
        watchedPct: s.durationSec ? round(Math.min(s.maxPositionSec / s.durationSec, 1) * 100, 0) : null,
        counted: s.counted,
        completed: s.completed,
      })),
      viewersPagination: { currentPage: page, totalPages, total: viewerCount, limit },
    });
  } catch (error) {
    handleError(res, "Analytics Episode Detail", error);
  }
};

// ========================================
// GET /api/admin/analytics/bunny/:episodeId?from=&to=
// Bunny Stream's own statistics for the episode's video. Covers the period
// before in-app tracking went live (no per-user detail).
// ========================================
const BUNNY_CACHE_TTL_SEC = 15 * 60;

const bunnyDate = (value, fallback) => {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : null;
  return match || fallback.toISOString().slice(0, 10);
};

exports.getBunnyStats = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.episodeId)) {
      return res.status(400).json({ success: false, message: "Invalid episode id" });
    }
    const episode = await Episode.findById(req.params.episodeId).select("videoId").lean();
    if (!episode) {
      return res.status(404).json({ success: false, message: "Episode not found" });
    }
    if (!episode.videoId) {
      return res.status(200).json({ success: true, available: false, message: "This episode is not hosted on Bunny Stream" });
    }

    const libraryId = String(process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
    const apiKey = String(process.env.BUNNY_STREAM_API_KEY || "").trim();
    if (!libraryId || !apiKey) {
      return res.status(200).json({ success: true, available: false, message: "Bunny Stream credentials are not configured" });
    }

    const now = new Date();
    const dateTo = bunnyDate(req.query.to, now);
    const dateFrom = bunnyDate(req.query.from, new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    const cacheKey = `analytics:bunny:${episode.videoId}:${dateFrom}:${dateTo}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));
    } catch {
      // cache unavailable: continue without it
    }

    const params = new URLSearchParams({ videoGuid: episode.videoId, dateFrom, dateTo, hourly: "false" });
    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/statistics?${params}`, {
      headers: { AccessKey: apiKey, Accept: "application/json" },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Bunny statistics error:", response.status, text);
      return res.status(502).json({ success: false, message: `Bunny Stream returned ${response.status}` });
    }
    const data = await response.json();

    const toSeries = (chart = {}) =>
      Object.entries(chart || {})
        .map(([date, value]) => ({ date: String(date).slice(0, 10), value: Number(value) || 0 }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const views = toSeries(data.viewsChart);
    const watchTime = toSeries(data.watchTimeChart);
    const watchMap = new Map(watchTime.map((w) => [w.date, w.value]));
    const dates = [...new Set([...views.map((v) => v.date), ...watchTime.map((w) => w.date)])].sort();
    const viewMap = new Map(views.map((v) => [v.date, v.value]));

    const payload = {
      success: true,
      available: true,
      dateFrom,
      dateTo,
      totals: {
        views: views.reduce((a, v) => a + v.value, 0),
        // Bunny reports watch time in seconds
        watchMinutes: Math.round(watchTime.reduce((a, v) => a + v.value, 0) / 60),
      },
      chart: dates.map((date) => ({
        key: date,
        views: viewMap.get(date) || 0,
        watchMinutes: Math.round((watchMap.get(date) || 0) / 60),
      })),
      countries: Object.entries(data.countryViewCounts || {})
        .map(([country, viewsCount]) => ({ country, views: Number(viewsCount) || 0 }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      engagementScore: data.engagementScore ?? null,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(payload), "EX", BUNNY_CACHE_TTL_SEC);
    } catch {
      // ignore cache write errors
    }

    res.status(200).json(payload);
  } catch (error) {
    handleError(res, "Analytics Bunny Stats", error);
  }
};
