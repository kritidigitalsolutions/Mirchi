const Notification = require("../../models/notification.model");
const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");
const { sendPushNotification, sendMulticastNotification } = require("../../utils/fcm.service");

// ── Admin-level "read" tracking uses a separate readByAdmin flag ──────────

exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      sendTo,
      targetUser,
      actionUrl,
      contentType,
      contentId,
      planId,
      imageUrl
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }

    const targetContentId = contentId || planId;
    const targetContentType = contentType || (planId ? "plan" : undefined);

    let finalActionUrl = actionUrl || "";
    let finalImageUrl = imageUrl || "";

    if (targetContentType && targetContentId) {
      try {
        if (targetContentType === "movie") {
          const Movie = require("../../models/movie.model");
          const movie = await Movie.findById(targetContentId);
          if (movie) {
            finalImageUrl = imageUrl || movie.poster || movie.thumbnailUrl || "";
            finalActionUrl = actionUrl || `mirchiapp://movies/id/${movie._id}`;
          }
        } else if (targetContentType === "series") {
          const Series = require("../../models/series.model");
          const series = await Series.findById(targetContentId);
          if (series) {
            finalImageUrl = imageUrl || series.poster || series.thumbnailUrl || "";
            finalActionUrl = actionUrl || `mirchiapp://series/id/${series._id}`;
          }
        } else if (targetContentType === "plan") {
          const Plan = require("../../models/plan.model");
          const plan = await Plan.findById(targetContentId);
          if (plan) {
            finalImageUrl = imageUrl || "";
            finalActionUrl = actionUrl || `mirchiapp://plans/id/${plan._id}`;
          }
        }
      } catch (contentErr) {
        console.warn("Could not populate content metadata:", contentErr.message);
      }
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      type: type || "GENERAL",
      imageUrl: finalImageUrl,
      actionUrl: finalActionUrl,
      metadata: {
        actionUrl: finalActionUrl,
        contentType: targetContentType,
        contentId: targetContentId,
        planId: planId || (targetContentType === "plan" ? targetContentId : undefined),
        imageUrl: finalImageUrl
      },
      createdBy: req.user?.id,
      sentAt: new Date()
    };

    let tokens = [];

    if (sendTo === "SPECIFIC_USER") {
      payload.targetUser = targetUser;

      const user = await User.findById(targetUser).select("fcmToken").lean();
      if (user && user.fcmToken && typeof user.fcmToken === "string") {
        tokens = [user.fcmToken];
      }
    } else if (sendTo === "SUBSCRIBERS") {
      payload.targetUser = null;
      payload.targetUserType = "SUBSCRIBERS";

      const subscribedUserIds = await Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: new Date() }
      });

      tokens = await User.distinct("fcmToken", {
        _id: { $in: subscribedUserIds },
        fcmToken: { $type: "string", $ne: "" }
      });
    } else {
      payload.targetUser = null;
      payload.targetUserType = "ALL";

      tokens = await User.distinct("fcmToken", {
        fcmToken: { $type: "string", $ne: "" }
      });
    }

    // Save notification to database first
    const notification = await Notification.create(payload);

    const fcmData = {
      notificationId: notification._id.toString(),
      type: type || "GENERAL",
      actionUrl: finalActionUrl || "",
      contentType: contentType || "",
      contentId: contentId || ""
    };

    // If sending to a specific user, handle single push with a fast timeout
    if (sendTo === "SPECIFIC_USER") {
      let sent = 0;
      let failed = 0;

      if (tokens.length > 0) {
        try {
          const pushRes = await Promise.race([
            sendPushNotification({
              token: tokens[0],
              title: title.trim(),
              body: message.trim(),
              imageUrl: finalImageUrl,
              data: fcmData
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Push timeout")), 4000))
          ]);

          if (pushRes && pushRes.success) {
            sent = 1;
          } else {
            failed = 1;
          }
        } catch (pushErr) {
          console.warn("Specific user push error:", pushErr.message);
          failed = 1;
        }
      }

      return res.status(201).json({
        success: true,
        message: "Notification sent successfully",
        data: notification,
        pushReport: {
          totalUsers: tokens.length,
          sent,
          failed
        }
      });
    }

    // For broadcast / subscribers: Respond immediately to admin panel to prevent gateway timeout
    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
      pushReport: {
        totalUsers: tokens.length,
        status: "queued"
      }
    });

    // Deliver push notifications asynchronously in background using high-performance multicast
    setImmediate(async () => {
      try {
        const report = await sendMulticastNotification({
          tokens,
          title: title.trim(),
          body: message.trim(),
          imageUrl: finalImageUrl,
          data: fcmData
        });

        // Prune any dead/unregistered tokens reported by FCM in background
        if (report && report.invalidTokens && report.invalidTokens.length > 0) {
          User.updateMany(
            { fcmToken: { $in: report.invalidTokens } },
            { $unset: { fcmToken: "", fcmTokenUpdatedAt: "" } }
          ).catch((err) => console.warn("Failed to prune invalid tokens:", err.message));
        }
      } catch (bgError) {
        console.error("Background FCM multicast error:", bgError);
      }
    });

  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    const total = await Notification.countDocuments(query);

    const data = await Notification.find(query)
      .populate("targetUser", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    let notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
    }

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({});
    await Notification.updateMany({}, { isActive: false });

    res.status(200).json({
      success: true,
      message: "All notifications deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ── Mark a single notification as read (adds admin to readBy) ─────────────
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        readAt: new Date(),
        $addToSet: {
          readBy: { user: req.user.id, readAt: new Date() }
        }
      },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Count unread notifications (isRead: false) ────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false, isActive: true });
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
