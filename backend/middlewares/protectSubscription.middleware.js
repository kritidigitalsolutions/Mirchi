const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");

const protectSubscription = async (
  req,
  res,
  next
) => {
  try {

    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Find latest active subscription for the user
    let subscription = await Subscription.findOne({
      user: userId,
      status: "active",
    }).sort({ createdAt: -1 });

    // Fallback: check user.subscriptions array if active query returned nothing
    if (!subscription) {
      const user = await User.findById(userId);
      if (user && user.subscriptions && user.subscriptions.length > 0) {
        const lastSubId = user.subscriptions[user.subscriptions.length - 1];
        subscription = await Subscription.findById(lastSubId);
      }
    }

    // no subscription
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: "Active subscription required",
      });
    }

    // auto expire if endDate has passed
    subscription = await expireSubscriptionIfNeeded(subscription);

    // after expiry check
    if (!subscription || subscription.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Subscription expired",
      });
    }

    req.subscription = subscription;

    next();

  } catch (error) {

    console.error(
      "Subscription Protection Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = protectSubscription;