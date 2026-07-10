const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");

const {
  createOrder,
  verifyPayment,
  sabPaisaWebhook,
  sabPaisaReturn,
} = require("../../controllers/payment.controller");

// Logs every request that actually reaches the backend payment routes. Secrets
// such as Authorization and clientSecret are deliberately never printed.
router.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`[PAYMENT] ${new Date().toISOString()} ROUTE_HIT`, { method: req.method, path: req.originalUrl });
  res.on("finish", () => {
    console.log(`[PAYMENT] ${new Date().toISOString()} ROUTE_RESPONSE`, { method: req.method, path: req.originalUrl, statusCode: res.statusCode, durationMs: Date.now() - startedAt });
  });
  next();
});

// SabPaisa payment APIs
router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);

// These are called by SabPaisa, not by an authenticated app user.
router.post("/webhook", sabPaisaWebhook);
router.get("/return", sabPaisaReturn);

module.exports = router;
