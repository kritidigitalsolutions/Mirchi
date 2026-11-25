const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// A user is considered online if they have had activity within the last 5 minutes.
const ONLINE_WINDOW_MS = Number(process.env.ONLINE_WINDOW_MS) || 5 * 60 * 1000;
// Throttle database writes for passive request tracking to at most once every 30 seconds per user.
const ACTIVITY_WRITE_THROTTLE_MS = 30 * 1000;

const lastWrittenByUser = new Map();

const getOnlineCutoff = (now = Date.now()) => new Date(now - ONLINE_WINDOW_MS);

const getUserLastActiveTimestamp = (user) => {
  if (!user) return 0;
  const candidates = [
    user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0,
    user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0,
    user.fcmTokenUpdatedAt ? new Date(user.fcmTokenUpdatedAt).getTime() : 0,
  ];
  return Math.max(...candidates.filter(Number.isFinite));
};

const isUserOnline = (user, now = Date.now(), activeWatcherSet = null) => {
  if (!user || user.isBlocked) return false;
  if (activeWatcherSet && activeWatcherSet.has(String(user._id))) {
    return true;
  }
  const lastTs = getUserLastActiveTimestamp(user);
  return Number.isFinite(lastTs) && lastTs >= now - ONLINE_WINDOW_MS;
};

const touchUserActivityById = (userId) => {
  if (!userId) return;
  const key = String(userId);
  const now = Date.now();
  const lastTs = lastWrittenByUser.get(key) || 0;
  if (now - lastTs < ACTIVITY_WRITE_THROTTLE_MS) return;

  if (lastWrittenByUser.size > 10000) {
    lastWrittenByUser.clear();
  }
  lastWrittenByUser.set(key, now);

  const nowDate = new Date(now);
  User.updateOne({ _id: userId }, { $set: { lastActiveAt: nowDate } }).catch((err) => {
    console.error("Touch user activity error:", err.message);
  });
};

const touchUserActivity = (user) => {
  if (!user?._id) return;
  const now = Date.now();
  const lastTs = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  if (now - lastTs < ACTIVITY_WRITE_THROTTLE_MS) return;

  const nowDate = new Date(now);
  user.lastActiveAt = nowDate;
  lastWrittenByUser.set(String(user._id), now);
  User.updateOne({ _id: user._id }, { $set: { lastActiveAt: nowDate } }).catch((err) => {
    console.error("Touch user activity error:", err.message);
  });
};

const extractUserIdentity = (req) => {
  // 1. Look for JWT in all common locations
  let token = null;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === "string" && authHeader.trim()) {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith("bearer ")) {
      token = trimmed.slice(7).trim();
    } else {
      token = trimmed;
    }
  }

  if (!token) {
    const alt =
      req.headers?.["x-auth-token"] ||
      req.headers?.["token"] ||
      req.headers?.["auth-token"] ||
      req.query?.token ||
      (typeof req.body?.token === "string" ? req.body.token : null);
    if (typeof alt === "string" && alt.trim()) {
      token = alt.trim();
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded?.id || decoded?.userId || decoded?._id;
      if (userId && (!decoded.role || decoded.role === "USER")) {
        return String(userId);
      }
    } catch {
      // Ignore token decode failures
    }
  }

  // 2. Check explicit userId passed by client
  const explicit =
    req.headers?.["x-user-id"] ||
    req.headers?.["user-id"] ||
    req.query?.userId ||
    (typeof req.body?.userId === "string" ? req.body.userId : null);

  if (explicit && /^[a-fA-F0-9]{24}$/.test(String(explicit))) {
    return String(explicit);
  }

  return null;
};

// Global middleware running on all /api routes to silently track user activity
const trackUserPresence = (req, _res, next) => {
  try {
    const userId = extractUserIdentity(req);
    if (userId) {
      touchUserActivityById(userId);
    }
  } catch {
    // Fail-safe: presence tracking must never crash request flow
  }
  next();
};

const markUserOnline = async (userId) => {
  const now = new Date();
  lastWrittenByUser.set(String(userId), now.getTime());
  await User.updateOne({ _id: userId }, { $set: { lastActiveAt: now } });
  return now;
};

const clearUserActivity = async (userId) => {
  lastWrittenByUser.delete(String(userId));
  await User.updateOne({ _id: userId }, { $set: { lastActiveAt: null } });
};

const getOnlineUserCount = async (extraFilter = {}) => {
  const cutoff = getOnlineCutoff();
  return User.countDocuments({
    ...extraFilter,
    isBlocked: { $ne: true },
    $or: [
      { lastActiveAt: { $gte: cutoff } },
      { lastLoginAt: { $gte: cutoff } },
      { fcmTokenUpdatedAt: { $gte: cutoff } },
    ],
  });
};

module.exports = {
  ONLINE_WINDOW_MS,
  getOnlineCutoff,
  getUserLastActiveTimestamp,
  isUserOnline,
  touchUserActivity,
  touchUserActivityById,
  extractUserIdentity,
  trackUserPresence,
  markUserOnline,
  clearUserActivity,
  getOnlineUserCount,
};
