const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    // Stop retrying after 3 attempts to prevent infinite terminal spam if Redis is not running
    if (times > 3) return null;
    return Math.min(times * 50, 2000);
  },
});

let errorLogged = false;
redis.on("error", (err) => {
  if (!errorLogged) {
    console.error("Redis Error:", err.message, "(further connection errors will be suppressed)");
    errorLogged = true;
  }
});

const HOME_CACHE_KEY = "home_content_cache";

const invalidateHomeCache = async () => {
  try {
    await redis.del(HOME_CACHE_KEY);
  } catch (err) {
    console.error("Redis invalidate error:", err.message);
  }
};

module.exports = { redis, HOME_CACHE_KEY, invalidateHomeCache };
