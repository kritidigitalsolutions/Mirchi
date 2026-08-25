const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("error", (err) => {
  console.error("Redis Error:", err.message);
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
