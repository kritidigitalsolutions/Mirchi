const express = require("express");
const router = express.Router();

const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");

const {
  sendNotification,
  getNotifications,
  deleteNotification,
  deleteAllNotifications,
  markAsRead,
  getUnreadCount
} = require("../../controllers/admin/notification.controller");

router.use(isAdmin, hasPermission("notifications"));

router.post("/send", sendNotification);
router.get("/unread-count", getUnreadCount);
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.delete("/all", deleteAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;