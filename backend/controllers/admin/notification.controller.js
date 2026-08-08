const Notification = require("../../models/notification.model");
const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");
const { sendPushNotification } = require("../../utils/fcm.service");

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
      contentId
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }

    let finalActionUrl = actionUrl || "";
    let finalImageUrl = "";

    if (contentType && contentId) {
      if (contentType === "movie") {
        const Movie = require("../../models/movie.model");
        const movie = await Movie.findById(contentId);
        if (movie) {
          finalImageUrl = movie.poster || movie.thumbnailUrl || "";
          finalActionUrl = `mirchiapp://movies/id/${movie._id}`;
        }
      } else if (contentType === "series") {
        const Series = require("../../models/series.model");
        const series = await Series.findById(contentId);
        if (series) {
          finalImageUrl = series.poster || series.thumbnailUrl || "";
          finalActionUrl = `mirchiapp://series/id/${series._id}`;
        }
      } else if (contentType === "plan") {
        const Plan = require("../../models/plan.model");
        const plan = await Plan.findById(contentId);
        if (plan) {
          // Plans don't have images in the schema, you can set a default or leave empty
          finalImageUrl = ""; 
          finalActionUrl = `mirchiapp://plans/id/${plan._id}`;
        }
      }
    }

    const payload = {
      title,
      message,
      type: type || "GENERAL",
      metadata: { actionUrl: finalActionUrl, contentType, contentId, imageUrl: finalImageUrl },
      createdBy: req.user.id,
      sentAt: new Date()
    };

    let users = [];

    if (sendTo === "SPECIFIC_USER") {
      payload.targetUser = targetUser;

      users = await User.find({
        _id: targetUser,
        fcmToken: { $type: "string", $ne: "" }
      });

    } else if (sendTo === "SUBSCRIBERS") {
      payload.targetUser = null;
      payload.targetUserType = "SUBSCRIBERS";

      const subscribedUserIds = await Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: new Date() }
      });

      users = await User.find({
        _id: { $in: subscribedUserIds },
        fcmToken: { $type: "string", $ne: "" }
      });

    } else {
      payload.targetUser = null;
      payload.targetUserType = "ALL";

      users = await User.find({
        fcmToken: { $type: "string", $ne: "" }
      });
    }

    const notification = await Notification.create(payload);

    let sent = 0;
    let failed = 0;

    // Send in parallel batches to prevent gateway timeouts
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const chunk = users.slice(i, i + batchSize);
      await Promise.all(
        chunk.map((user) =>
          sendPushNotification({
            token: user.fcmToken,
            title,
            body: message,
            imageUrl: finalImageUrl,
            data: {
              notificationId: notification._id.toString(),
              type: type || "GENERAL",
              actionUrl: finalActionUrl || "",
              contentType: contentType || "",
              contentId: contentId || ""
            }
          }).then((res) => {
            console.log("Push to:", user._id, res);
            if (res.success) sent++;
            else failed++;
          }).catch((err) => {
            console.log("Push Error to user:", user._id, err.message);
            failed++;
          })
        )
      );
    }

    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
      pushReport: {
        totalUsers: users.length,
        sent,
        failed
      }
    });

  } catch (error) {
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
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification archived successfully"
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
    await Notification.updateMany({ isActive: true }, { isActive: false });

    res.status(200).json({
      success: true,
      message: "All notifications archived successfully"
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
