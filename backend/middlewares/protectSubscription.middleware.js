const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");

const protectSubscription = async (req, res, next) => {
  try {
    // ✅ Use req.user.id from authMiddleware
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - User ID missing" });
    }

    const user = await User.findById(userId);

    if (!user || !user.subscriptions || user.subscriptions.length === 0) {
      return res.status(403).json({ 
        success: false,
        message: "Active subscription required to access this content" 
      });
    }

    const subscription = await Subscription.findById(
      user.subscriptions[user.subscriptions.length - 1]
    );

    if (
      !subscription ||
      subscription.status !== "active" ||
      new Date() > new Date(subscription.endDate)
    ) {
      return res.status(403).json({ 
        success: false,
        message: "Your subscription has expired or is inactive" 
      });
    }

    next();

  } catch (error) {
    console.error("Subscription Protection Error:", error);
    res.status(500).json({ success: false, message: "Internal server error during subscription check" });
  }
};

module.exports = protectSubscription;