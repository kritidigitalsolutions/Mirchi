const {
  admin,
  firebaseInitialized,
} = require("../config/firebase");

/**
 * Normalizes and stringifies metadata for FCM payloads (FCM data values must be strings).
 * Includes title and body in data payload so background custom notification handlers
 * (Flutter, React Native, Native Android) can always access them even if app is in background.
 *
 * @param {Object} [data]
 * @param {string} [imageUrl]
 * @param {string} [title]
 * @param {string} [body]
 * @returns {Object}
 */
const prepareFcmData = (data, imageUrl, title, body) => {
  const stringifiedData = {};
  if (title) stringifiedData.title = String(title);
  if (body) stringifiedData.body = String(body);
  if (imageUrl) {
    stringifiedData.imageUrl = String(imageUrl);
    stringifiedData.image = String(imageUrl);
  }
  if (data && typeof data === "object") {
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        stringifiedData[key] = String(data[key]);
      }
    });
  }
  return stringifiedData;
};

/**
 * Sends a real or mock push notification to a single device token.
 * @param {Object} params
 * @param {string} params.token - Target FCM token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body content
 * @param {string} [params.imageUrl] - Optional image URL
 * @param {Object} [params.data] - Optional metadata (converted to key-value strings)
 */
const sendPushNotification = async ({ token, title, body, imageUrl, data }) => {
  try {
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return { success: false, error: "No valid token provided" };
    }

    const cleanToken = token.trim();
    const stringifiedData = prepareFcmData(data, imageUrl, title, body);

    if (!firebaseInitialized) {
      console.log("-----------------------------------------");
      console.log("PUSH NOTIFICATION SENT (MOCK/STUB MODE)");
      console.log("To:", cleanToken);
      console.log("Title:", title);
      console.log("Body:", body);
      console.log("ImageUrl:", imageUrl);
      console.log("Data:", stringifiedData);
      console.log("-----------------------------------------");
      return { success: true, messageId: `mock-id-${Date.now()}` };
    }

    const message = {
      token: cleanToken,
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            contentAvailable: true,
          },
        },
      },
    };

    if (imageUrl) {
      message.notification.imageUrl = imageUrl;
      message.android.notification.imageUrl = imageUrl;
      message.apns.fcmOptions = { imageUrl };
    }

    const response = await admin.messaging().send(message);
    console.log("Successfully sent FCM notification:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("FCM Send Error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends multicast push notifications to multiple FCM tokens in batches of up to 500.
 * Uses Firebase Admin SDK's sendEachForMulticast for maximum performance.
 *
 * @param {Object} params
 * @param {string[]} params.tokens - Target FCM tokens
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body content
 * @param {string} [params.imageUrl] - Optional image URL
 * @param {Object} [params.data] - Optional metadata (converted to key-value strings)
 * @returns {Promise<{success: boolean, sent: number, failed: number, invalidTokens: string[]}>}
 */
const sendMulticastNotification = async ({ tokens, title, body, imageUrl, data }) => {
  try {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { success: true, sent: 0, failed: 0, invalidTokens: [] };
    }

    // Deduplicate and filter non-empty valid strings
    const validTokens = [
      ...new Set(
        tokens.filter((t) => typeof t === "string" && t.trim().length > 10)
      ),
    ];

    if (validTokens.length === 0) {
      return { success: true, sent: 0, failed: 0, invalidTokens: [] };
    }

    const stringifiedData = prepareFcmData(data, imageUrl, title, body);

    if (!firebaseInitialized) {
      console.log("-----------------------------------------");
      console.log("MULTICAST NOTIFICATION SENT (MOCK/STUB MODE)");
      console.log("Total Tokens:", validTokens.length);
      console.log("Title:", title);
      console.log("Body:", body);
      console.log("ImageUrl:", imageUrl);
      console.log("Data:", stringifiedData);
      console.log("-----------------------------------------");
      return { success: true, sent: validTokens.length, failed: 0, invalidTokens: [] };
    }

    let totalSent = 0;
    let totalFailed = 0;
    const invalidTokens = [];

    // FCM sendEachForMulticast supports at most 500 tokens per call
    const BATCH_SIZE = 500;
    for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
      const chunk = validTokens.slice(i, i + BATCH_SIZE);

      const message = {
        tokens: chunk,
        notification: {
          title,
          body,
        },
        data: stringifiedData,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              contentAvailable: true,
            },
          },
        },
      };

      if (imageUrl) {
        message.notification.imageUrl = imageUrl;
        message.android.notification.imageUrl = imageUrl;
        message.apns.fcmOptions = { imageUrl };
      }

      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        totalSent += response.successCount;
        totalFailed += response.failureCount;

        if (response.responses && Array.isArray(response.responses)) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
              const errorCode = resp.error.code;
              if (
                errorCode === "messaging/registration-token-not-registered" ||
                errorCode === "messaging/invalid-registration-token" ||
                errorCode === "messaging/invalid-argument"
              ) {
                invalidTokens.push(chunk[idx]);
              }
            }
          });
        }
      } catch (batchError) {
        console.error(`FCM Multicast batch error (tokens ${i} to ${i + chunk.length}):`, batchError.message);
        totalFailed += chunk.length;
      }
    }

    console.log(
      `FCM Multicast Completed: ${totalSent} delivered, ${totalFailed} failed out of ${validTokens.length} total tokens.`
    );

    return {
      success: true,
      sent: totalSent,
      failed: totalFailed,
      invalidTokens,
    };
  } catch (error) {
    console.error("Multicast Send Error:", error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: Array.isArray(tokens) ? tokens.length : 0,
      invalidTokens: [],
    };
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastNotification,
};
