const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");

// MongoDB stores timestamps in UTC. Dashboard registration reporting is based
// on the India calendar day, regardless of where the API process is hosted.
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


// ========================================
// GET ALL USERS
// ========================================
exports.getAllUsers = async (
    req,
    res
) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 10000);
        const search = req.query.search?.trim();
        const status = req.query.status?.trim()?.toLowerCase();
        
        const searchFilter = {};

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            searchFilter.$or = [
                { name: { $regex: escapedSearch, $options: "i" } },
                { email: { $regex: escapedSearch, $options: "i" } },
                { phone: { $regex: escapedSearch, $options: "i" } },
            ];
        }

        const filter = { ...searchFilter };
        if (status === "active") {
            filter.isBlocked = { $ne: true };
        } else if (status === "blocked") {
            filter.isBlocked = true;
        }

        const totalUsers = await User.countDocuments(filter);
        const totalPages = Math.max(Math.ceil(totalUsers / limit), 1);
        const currentPage = Math.min(page, totalPages);

        const [users, activeUsers, blockedUsers] = await Promise.all([
            User.find(filter)
                .select("-__v")
                .sort({ createdAt: -1 })
                .skip((currentPage - 1) * limit)
                .limit(limit),
            User.countDocuments({ ...searchFilter, isBlocked: { $ne: true } }),
            User.countDocuments({ ...searchFilter, isBlocked: true }),
        ]);

        res.status(200).json({
            success: true,
            count: totalUsers,
            users,
            pagination: {
                currentPage,
                totalPages,
                totalUsers,
                limit,
            },
            stats: {
                activeUsers,
                blockedUsers,
            },
        });

    } catch (error) {
        console.error(
            "Get Users Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ========================================
// GET SINGLE USER
// ========================================
exports.getSingleUser = async (
    req,
    res
) => {
    try {
        const user = await User.findById(
            req.params.id
        ).select("-__v");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {
        console.error(
            "Get Single User Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ========================================
// DELETE USER
// ========================================
exports.deleteUser = async (
    req,
    res
) => {
    try {
        const user = await User.findById(
            req.params.id
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        await Promise.all([
            Subscription.deleteMany({ user: user._id }),
            User.findByIdAndDelete(req.params.id),
        ]);

        res.status(200).json({
            success: true,
            message:
                "User deleted successfully",
        });

    } catch (error) {
        console.error(
            "Delete User Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ========================================
// TOGGLE BLOCK USER
// ========================================
exports.toggleBlockUser = async (
    req,
    res
) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
            user,
        });

    } catch (error) {
        console.error(
            "Toggle Block User Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getRegistrationStats = async (req, res) => {
    try {
        const { start: today, end: tomorrow } = getIndiaDayBounds();
        const { start: yesterday } = getIndiaDayBounds(new Date(), -1);

        const [todayCount, yesterdayCount, totalCount] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
            User.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
            User.countDocuments({}),
        ]);

        res.status(200).json({
            success: true,
            data: {
                todayRegistration: todayCount,
                yesterdayRegistration: yesterdayCount,
                totalRegistration: totalCount,
            },
        });
    } catch (error) {
        console.error("Get Registration Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getUserGrowth = async (req, res) => {
    try {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const growthData = [];

        const now = new Date();
        const indiaNow = new Date(now.getTime() + INDIA_TIMEZONE_OFFSET_MS);
        const dayOfWeek = indiaNow.getUTCDay();
        const { start: currentWeekStart } = getIndiaDayBounds(now, -dayOfWeek);
        const { start: previousWeekStart } = getIndiaDayBounds(now, -dayOfWeek - 7);

        const [currentWeekResult, previousWeekResult] = await Promise.all([
            User.aggregate([
            {
                $match: {
                    createdAt: { $gte: currentWeekStart, $lte: now },
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" }
                    },
                    count: { $sum: 1 }
                }
            }
            ]),
            User.countDocuments({ createdAt: { $gte: previousWeekStart, $lt: currentWeekStart } }),
        ]);

        const countsByDay = {};
        currentWeekResult.forEach(item => {
            countsByDay[item._id] = item.count;
        });

        for (let i = 0; i < 7; i++) {
            const { start: dayStart } = getIndiaDayBounds(currentWeekStart, i);
            const indiaDay = new Date(dayStart.getTime() + INDIA_TIMEZONE_OFFSET_MS);
            const dayIndex = indiaDay.getUTCDay();
            const dateKey = `${indiaDay.getUTCFullYear()}-${String(indiaDay.getUTCMonth() + 1).padStart(2, "0")}-${String(indiaDay.getUTCDate()).padStart(2, "0")}`;

            growthData.push({
                day: daysOfWeek[dayIndex],
                users: countsByDay[dateKey] || 0,
            });
        }

        res.status(200).json({
            success: true,
            data: growthData,
            currentWeekUsers: growthData.reduce((sum, item) => sum + item.users, 0),
            previousWeekUsers: previousWeekResult,
        });
    } catch (error) {
        console.error("Get User Growth Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
