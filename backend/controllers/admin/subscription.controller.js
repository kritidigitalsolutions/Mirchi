const Subscription = require("../../models/subscription.model");
const User = require("../../models/user.model");

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

    const subscriptions = await Subscription.find();

    // count paid subscriptions only
    const validSubs = subscriptions.filter(
      (sub) => (sub.amount || 0) > 0
    );

    const totalRevenue = validSubs.reduce(
      (sum, sub) => sum + (sub.amount || 0),
      0
    );

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
      expiredSubscriptionCount,
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.distinct("user", {
        status: "active",
        endDate: {
          $gte: now,
        },
      }),
      Subscription.countDocuments({
        status: "expired",
      }),
    ]);

    const totalSubscribedUsers = activeSubscriptionUsers.length;
    const totalNotSubscribedUsers = Math.max(
      totalUsers - totalSubscribedUsers,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalSubscribedUsers,
        totalNotSubscribedUsers,
        expirySubscriptionCount: expiredSubscriptionCount,
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

// India timezone offset for 12:00 AM - 11:59:59 PM IST calculations
const INDIA_TIMEZONE_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const getIndiaDayBounds = (date = new Date(), daysOffset = 0) => {
  const indiaNow = new Date(date.getTime() + INDIA_TIMEZONE_OFFSET_MS);
  const startOfIndiaDayAsUtc = Date.UTC(
    indiaNow.getUTCFullYear(),
    indiaNow.getUTCMonth(),
    indiaNow.getUTCDate() + daysOffset
  );

  const start = new Date(startOfIndiaDayAsUtc - INDIA_TIMEZONE_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
};

// =====================================================
// 💵 GET INCOME STATS (12 AM - 11:59 PM IST)
// =====================================================
exports.getIncomeStats = async (req, res) => {
  try {
    // auto cleanup
    await expireOldSubscriptions();

    const { start: startOfToday, end: startOfTomorrow } = getIndiaDayBounds(new Date(), 0);
    const { start: startOfYesterday } = getIndiaDayBounds(new Date(), -1);

    const indiaNow = new Date(Date.now() + INDIA_TIMEZONE_OFFSET_MS);
    const dayOfWeek = indiaNow.getUTCDay();

    // Start of current IST week (Sunday 00:00:00 IST)
    const { start: startOfWeek } = getIndiaDayBounds(new Date(), -dayOfWeek);

    // Start of current IST month (1st of month 00:00:00 IST)
    const startOfIndiaMonthAsUtc = Date.UTC(
      indiaNow.getUTCFullYear(),
      indiaNow.getUTCMonth(),
      1
    );
    const startOfMonth = new Date(startOfIndiaMonthAsUtc - INDIA_TIMEZONE_OFFSET_MS);

    // Start of current IST year (Jan 1st 00:00:00 IST)
    const startOfIndiaYearAsUtc = Date.UTC(
      indiaNow.getUTCFullYear(),
      0,
      1
    );
    const startOfYear = new Date(startOfIndiaYearAsUtc - INDIA_TIMEZONE_OFFSET_MS);

    const sumAmount = async (match) => {
      const result = await Subscription.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ["$amount", 0],
              },
            },
          },
        },
      ]);

      return result[0]?.total || 0;
    };

    const baseMatch = {
      amount: { $gt: 0 },
    };

    const [
      todayIncome,
      yesterdayIncome,
      weeklyIncome,
      monthlyIncome,
      yearlyIncome,
      totalIncome,
    ] = await Promise.all([
      sumAmount({
        ...baseMatch,
        createdAt: {
          $gte: startOfToday,
          $lt: startOfTomorrow,
        },
      }),
      sumAmount({
        ...baseMatch,
        createdAt: {
          $gte: startOfYesterday,
          $lt: startOfToday,
        },
      }),
      sumAmount({
        ...baseMatch,
        createdAt: {
          $gte: startOfWeek,
          $lt: startOfTomorrow,
        },
      }),
      sumAmount({
        ...baseMatch,
        createdAt: {
          $gte: startOfMonth,
          $lt: startOfTomorrow,
        },
      }),
      sumAmount({
        ...baseMatch,
        createdAt: {
          $gte: startOfYear,
          $lt: startOfTomorrow,
        },
      }),
      sumAmount(baseMatch),
    ]);

    res.status(200).json({
      success: true,
      data: {
        todayIncome,
        yesterdayIncome,
        weeklyIncome,
        monthlyIncome,
        yearlyIncome,
        totalIncome,
      },
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
    const { start: todayStart, end: todayEnd } = getIndiaDayBounds(new Date(), 0);
    const { start: yesterdayStart, end: yesterdayEnd } = getIndiaDayBounds(new Date(), -1);

    if (["active", "cancelled", "expired"].includes(status)) {
      filter.status = status;
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
        { $match: { createdAt: { $gte: todayStart, $lt: todayEnd } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            distinctUsers: { $addToSet: "$user" },
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
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
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]),
      Subscription.aggregate([
        {
          $group: {
            _id: null,
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]),
      Subscription.countDocuments({}),
    ]);

    const totalPages = Math.max(Math.ceil(totalSubscriptions / limit), 1);
    const currentPage = Math.min(page, totalPages);

    const subscriptions = await Subscription.find(filter)
      .populate("user", "name email phone")
      .populate("plan")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit);

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
