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

// ── Razorpay (existing) ──
router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);

// ── SabPaisa (new) ──
router.post("/sabpaisa/create", isAuth, createSabPaisaPayment);
router.post("/sabpaisa/verify", isAuth, verifySabPaisaPayment);
router.post("/webhook", sabPaisaWebhook);      // NO isAuth — SabPaisa calls this
router.get("/return", sabPaisaReturn);          // NO isAuth — browser redirect

module.exports = router;