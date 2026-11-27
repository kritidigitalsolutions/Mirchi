const Subscription = require("../../models/subscription.model");
const User = require("../../models/user.model");
const { revenueSum } = require("../../utils/revenue");
const { resolveSubscriptionSource } = require("../../utils/subscriptionSource");
const {
  getIndiaDayBounds,
  parseIndiaDate,
  getRange,
  buildBucketKeys,
  IST_TZ,
} = require("../../utils/dateRange");

// =====================================================
// AUTO EXPIRE OLD SUBSCRIPTIONS
// =====================================================
const expireOldSubscriptions = async () => {
  await Subscription.updateMany(
    {
      status: "active",
      endDate: {
        $lt: new Date(),
      },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );
};

// =====================================================
// 💰 GET TOTAL REVENUE
// =====================================================
exports.getRevenue = async (req, res) => {
  try {
    // auto cleanup
    await expireOldSubscriptions();

    const [result] = await Subscription.aggregate([
      { $match: { createdAt: { $lt: new Date() } } },
      { $group: { _id: null, revenue: revenueSum } },
    ]);
    const totalRevenue = result?.revenue || 0;

    res.status(200).json({
      success: true,
      revenue: totalRevenue,
    });
  } catch (err) {
    console.error("Get Revenue Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// 📊 GET SUBSCRIPTION STATS
// =====================================================
exports.getSubscriptionStats = async (req, res) => {
  try {
    // auto cleanup
    await expireOldSubscriptions();

    const now = new Date();

    const [
      totalUsers,
      activeSubscriptionUsers,
      expiredSubscriptionUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.distinct("user", {
        status: "active",
        endDate: {
          $gte: now,
        },
      }),
      Subscription.distinct("user", {
        status: "expired",
      }),
    ]);

    const totalSubscribedUsers = activeSubscriptionUsers.length;
    const activeUserIds = new Set(activeSubscriptionUsers.map((id) => id.toString()));
    const expiredUserCount = expiredSubscriptionUsers.filter(
      (id) => !activeUserIds.has(id.toString())
    ).length;
    const totalNotSubscribedUsers = Math.max(
      totalUsers - totalSubscribedUsers,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalSubscribedUsers,
        totalNotSubscribedUsers,
        expirySubscriptionCount: expiredUserCount,
        churnRate: totalSubscribedUsers + expiredUserCount
          ? (expiredUserCount / (totalSubscribedUsers + expiredUserCount)) * 100
          : 0,
      },
    });
  } catch (err) {
    console.error("Subscription Stats Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// 💵 GET INCOME STATS (12 AM - 11:59 PM IST)
// =====================================================
exports.getIncomeStats = async (req, res) => {
  try {
    // auto cleanup
    await expireOldSubscriptions();

    const now = new Date();
    const fields = {
      todayIncome: "today",
      yesterdayIncome: "yesterday",
      weeklyIncome: "week",
      monthlyIncome: "month",
      yearlyIncome: "year",
      totalIncome: "all",
    };
    // One aggregation keeps every income card on the same data snapshot.
    const facets = Object.fromEntries(Object.entries(fields).map(([field, range]) => {
      const { start, end } = getRange(range, undefined, undefined, now);
      const createdAt = { $lt: end > now ? now : end };
      if (start) createdAt.$gte = start;
      return [field, [
        { $match: { createdAt } },
        { $group: { _id: null, total: revenueSum } },
      ]];
    }));
    const [result = {}] = await Subscription.aggregate([{ $facet: facets }]);
    const data = Object.fromEntries(Object.keys(fields).map(field => [field, result[field]?.[0]?.total || 0]));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Income Stats Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// 📋 GET ALL SUBSCRIPTIONS (WITH TODAY / YESTERDAY IST FILTER & STATS)
// =====================================================
exports.getAllSubscriptions = async (req, res) => {
  try {
    // auto cleanup
    await expireOldSubscriptions();

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const search = req.query.search?.trim();
    const status = req.query.status;
    const timeframe = (req.query.timeframe || req.query.dateFilter || "").trim().toLowerCase();
    const filter = {};

    // 12:00:00 AM to 11:59:59 PM IST bounds
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getIndiaDayBounds(now, 0);
    const { start: yesterdayStart, end: yesterdayEnd } = getIndiaDayBounds(now, -1);

    if (["active", "cancelled", "expired"].includes(status)) {
      filter.status = status;
    }

    // Claimed-date range filter (YYYY-MM-DD, inclusive, IST days)
    const claimedFrom = parseIndiaDate(req.query.from);
    const claimedTo = parseIndiaDate(req.query.to);
    if (claimedFrom || claimedTo) {
      filter.startDate = {};
      if (claimedFrom) filter.startDate.$gte = claimedFrom;
      if (claimedTo) filter.startDate.$lt = new Date(claimedTo.getTime() + 24 * 60 * 60 * 1000);
    }

    if (timeframe === "today") {
      filter.createdAt = { $gte: todayStart, $lt: todayEnd };
    } else if (timeframe === "yesterday") {
      filter.createdAt = { $gte: yesterdayStart, $lt: yesterdayEnd };
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
          { phone: { $regex: escapedSearch, $options: "i" } },
        ],
      }).select("_id");

      filter.user = { $in: matchingUsers.map((user) => user._id) };
    }

    // Parallel query for subscription items and Today / Yesterday summary statistics
    const [
      totalSubscriptions,
      todayStatsResult,
      yesterdayStatsResult,
      allSubsRevenueResult,
      allSubsCount,
    ] = await Promise.all([
      Subscription.countDocuments(filter),
      Subscription.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lt: now } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            distinctUsers: { $addToSet: "$user" },
            revenue: revenueSum,
          },
        },
      ]),
      Subscription.aggregate([
        { $match: { createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            distinctUsers: { $addToSet: "$user" },
            revenue: revenueSum,
          },
        },
      ]),
      Subscription.aggregate([
        { $match: { createdAt: { $lt: now } } },
        {
          $group: {
            _id: null,
            revenue: revenueSum,
          },
        },
      ]),
      Subscription.countDocuments({}),
    ]);

    const totalPages = Math.max(Math.ceil(totalSubscriptions / limit), 1);
    const currentPage = Math.min(page, totalPages);

    const subscriptionDocs = await Subscription.find(filter)
      .populate("user", "name email phone")
      .populate("plan")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .lean();

    const subscriptions = subscriptionDocs.map((sub) => ({
      ...sub,
      source: resolveSubscriptionSource(sub),
    }));

    const todayCount = todayStatsResult[0]?.count || 0;
    const todayUsers = todayStatsResult[0]?.distinctUsers?.length || 0;
    const todayRevenue = todayStatsResult[0]?.revenue || 0;

    const yesterdayCount = yesterdayStatsResult[0]?.count || 0;
    const yesterdayUsers = yesterdayStatsResult[0]?.distinctUsers?.length || 0;
    const yesterdayRevenue = yesterdayStatsResult[0]?.revenue || 0;

    const totalRevenue = allSubsRevenueResult[0]?.revenue || 0;

    res.status(200).json({
      success: true,
      subscriptions,
      pagination: {
        currentPage,
        totalPages,
        totalSubscriptions,
        limit,
      },
      stats: {
        todayCount,
        todayUsers,
        todayRevenue,
        yesterdayCount,
        yesterdayUsers,
        yesterdayRevenue,
        totalSubscriptions: allSubsCount,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Get All Subscriptions Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 📈 GET SUBSCRIBER GROWTH CHART DATA
// =====================================================
exports.getSubscriberGrowthChart = async (req, res) => {
  try {
    await expireOldSubscriptions();

    const now = new Date();
    const { range, start, end, bucket, format } = getRange(
      req.query.range,
      req.query.from,
      req.query.to,
      now
    );

    const matchStage = { createdAt: {} };
    if (start) matchStage.createdAt.$gte = start;
    if (end) matchStage.createdAt.$lt = end > now ? now : end;
    if (!start && !end) delete matchStage.createdAt;

    // Aggregate new subscribers and revenue per bucket
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
              timezone: IST_TZ,
            },
          },
          subscribers: { $sum: 1 },
          revenue: revenueSum,
          uniqueUsers: { $addToSet: "$user" },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const rawRows = await Subscription.aggregate(pipeline);

    // Build a map keyed by bucket string
    const dataMap = {};
    for (const row of rawRows) {
      dataMap[row._id] = {
        subscribers: row.subscribers,
        revenue: row.revenue,
        uniqueUsers: row.uniqueUsers.length,
      };
    }

    // Fill all keys so the chart has no gaps
    const allKeys = start ? buildBucketKeys(start, end, bucket) : rawRows.map((r) => r._id);

    const chartData = allKeys.map((key) => ({
      label: key,
      subscribers: dataMap[key]?.subscribers || 0,
      revenue: dataMap[key]?.revenue || 0,
      uniqueUsers: dataMap[key]?.uniqueUsers || 0,
    }));

    // Summary totals for the period
    const totalSubscribers = chartData.reduce((s, d) => s + d.subscribers, 0);
    const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);

    res.status(200).json({
      success: true,
      range,
      bucket,
      chartData,
      summary: {
        totalSubscribers,
        totalRevenue,
      },
    });
  } catch (err) {
    console.error("Subscriber Growth Chart Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// CANCEL SUBSCRIPTION (ADMIN)
// =====================================================
exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `This subscription is already ${subscription.status}`,
      });
    }

    subscription.status = "cancelled";
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      subscription,
    });
  } catch (error) {
    console.error("Admin Cancel Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
