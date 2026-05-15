/**
 * Firebase Cloud Messaging Service
 * This is a stub for sending push notifications.
 * Integration with firebase-admin should be added here.
 */

const sendPushNotification = async ({ token, title, body, data }) => {
  try {
    if (!token) {
      return { success: false, error: "No token provided" };
    }

    console.log("-----------------------------------------");
    console.log("PUSH NOTIFICATION SENT");
    console.log("To:", token);
    console.log("Title:", title);
    console.log("Body:", body);
    console.log("Data:", data);
    console.log("-----------------------------------------");

    // In production, use admin.messaging().send()
    return { success: true, messageId: `mock-id-${Date.now()}` };
  } catch (error) {
    console.error("FCM Send Error:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPushNotification };
