// const express = require("express");
// const router = express.Router();

// const { isAuth } = require("../../middlewares/auth.middleware");
// const {
//   createOrder,
//   verifyPayment
// } = require("../../controllers/payment.controller");

// router.post("/create-order", isAuth, createOrder);
// router.post("/verify", isAuth, verifyPayment);

// module.exports = router;

const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");

const {
  createOrder,
  verifyPayment,
  createSabPaisaPayment,
  verifySabPaisaPayment,
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

// ── Razorpay (existing) ──
router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);

// ── SabPaisa (new) ──
router.post("/sabpaisa/create", isAuth, createSabPaisaPayment);
router.post("/sabpaisa/verify", isAuth, verifySabPaisaPayment);
router.post("/webhook", sabPaisaWebhook);      // NO isAuth — SabPaisa calls this
router.get("/return", sabPaisaReturn);          // NO isAuth — browser redirect

module.exports = router;
