const Subscription = require("../models/subscription.model");

// ========================================
// AUTO EXPIRE SUBSCRIPTION
// ========================================
const expireSubscriptionIfNeeded = async (
  subscription
) => {
  try {

    if (!subscription) {
      return null;
    }

    const now = new Date();

    // expire subscription automatically
    if (
      subscription.status === "active" &&
      subscription.endDate &&
      now > subscription.endDate
    ) {

      subscription.status = "expired";

      await subscription.save();
    }

    return subscription;

  } catch (error) {

    console.error(
      "Expire Subscription Error:",
      error
    );

    return subscription;
  }
};

// Bulk expire subscriptions whose endDate has passed
const autoExpireAllSubscriptions = async () => {
  try {
    const now = new Date();
    const result = await Subscription.updateMany(
      {
        status: "active",
        endDate: { $lt: now },
      },
      {
        $set: { status: "expired" },
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`[SUBSCRIPTION CRON] Auto-expired ${result.modifiedCount} subscription(s).`);
    }
    return result;
  } catch (error) {
    console.error("Auto Expire All Subscriptions Error:", error);
  }
};

module.exports = {
  expireSubscriptionIfNeeded,
  autoExpireAllSubscriptions,
};