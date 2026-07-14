const express = require("express");
const router = express.Router();

const {
  getRevenue,
  getSubscriptionStats,
  getIncomeStats,
  getAllSubscriptions,
  cancelSubscription,
} = require("../../controllers/admin/subscription.controller"); 
const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");

router.use(isAdmin, hasPermission("pricing"));

router.get("/revenue", isAdmin, getRevenue);
router.get("/stats", isAdmin, getSubscriptionStats);
router.get("/income-stats", isAdmin, getIncomeStats);
router.get("/all", isAdmin, getAllSubscriptions);
router.patch("/:id/cancel", isAdmin, cancelSubscription);

module.exports = router;
