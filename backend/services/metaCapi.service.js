const crypto = require('crypto');
const axios = require('axios');

// Hash helper for Conversions API (SHA-256)
function hashField(value) {
  if (!value) return null;
  const cleaned = String(value).trim().toLowerCase();
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

// Normalize and hash phone numbers (digits only, must include country code)
function hashPhone(phone) {
  if (!phone) return null;
  // Strip all non-digit characters
  let digits = String(phone).replace(/\D/g, '');
  
  // Standardize Indian phone numbers (common since SabPaisa is used)
  // If it's a 10-digit number, prepend 91 (India country code)
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  
  return crypto.createHash('sha256').update(digits).digest('hex');
}

/**
 * Sends a server-side event to Meta Conversions API (CAPI).
 * 
 * @param {Object} params
 * @param {string} params.eventName - e.g., 'Purchase', 'InitiateCheckout', 'Lead'
 * @param {string} params.eventId - Unique ID for deduplication (usually transaction ID)
 * @param {string} [params.eventSourceUrl] - URL where the event occurred
 * @param {string} [params.actionSource] - 'website', 'app', 'system_generated', etc.
 * @param {Object} params.userData - Information about the customer
 * @param {string} [params.userData.email] - Plain text email (will be normalized and hashed)
 * @param {string} [params.userData.phone] - Plain text phone (will be normalized and hashed)
 * @param {string} [params.userData.firstName] - Plain text first name (will be normalized and hashed)
 * @param {string} [params.userData.lastName] - Plain text last name (will be normalized and hashed)
 * @param {string} [params.userData.clientIpAddress] - Client IP address (plain text)
 * @param {string} [params.userData.clientUserAgent] - Client User Agent (plain text)
 * @param {string} [params.userData.fbp] - Browser ID cookie (_fbp)
 * @param {string} [params.userData.fbc] - Click ID cookie (_fbc)
 * @param {Object} [params.customData] - Custom event details
 * @param {number} [params.customData.value] - Amount paid
 * @param {string} [params.customData.currency] - e.g., 'INR', 'USD'
 * @param {Array} [params.customData.contents] - Array of item objects { id, quantity, item_price }
 */
async function sendMetaEvent({
  eventName,
  eventId,
  eventSourceUrl,
  actionSource = 'website',
  userData = {},
  customData = {}
}) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE; // Useful for testing/debugging in Meta Events Manager

  if (!pixelId || !accessToken) {
    console.warn('[META_CAPI] Meta Pixel ID or Access Token is missing in environment variables. Event not sent.');
    return null;
  }

  try {
    // Construct user_data block with hashed parameters
    const userPayload = {};

    if (userData.email) {
      const hashedEmail = hashField(userData.email);
      if (hashedEmail) userPayload.em = [hashedEmail];
    }

    if (userData.phone) {
      const hashedPhone = hashPhone(userData.phone);
      if (hashedPhone) userPayload.ph = [hashedPhone];
    }

    if (userData.firstName) {
      const hashedFn = hashField(userData.firstName);
      if (hashedFn) userPayload.fn = [hashedFn];
    }

    if (userData.lastName) {
      const hashedLn = hashField(userData.lastName);
      if (hashedLn) userPayload.ln = [hashedLn];
    }

    // Pass unmodified client parameters if available
    if (userData.clientIpAddress) {
      userPayload.client_ip_address = userData.clientIpAddress;
    }
    if (userData.clientUserAgent) {
      userPayload.client_user_agent = userData.clientUserAgent;
    }
    if (userData.fbp) {
      userPayload.fbp = userData.fbp;
    }
    if (userData.fbc) {
      userPayload.fbc = userData.fbc;
    }

    // Event object
    const eventPayload = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl || process.env.FRONTEND_URL?.split(',')[0] || 'https://mirchiott.com',
      action_source: actionSource,
      user_data: userPayload
    };

    // Attach custom data if available (required for Purchase events)
    if (customData && Object.keys(customData).length > 0) {
      eventPayload.custom_data = {
        currency: customData.currency || 'INR',
        value: Number(customData.value || 0),
        content_type: customData.contentType || 'product',
        contents: customData.contents || []
      };
    }

    // Build the outer payload
    const requestData = {
      data: [eventPayload]
    };

    if (testEventCode && process.env.NODE_ENV !== 'production') {
  requestData.test_event_code = testEventCode;
}

    console.log('[META_CAPI] Sending event to Meta:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${pixelId}/events`,
      requestData,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('[META_CAPI] Event successfully sent to Meta:', response.data);
    return response.data;
  } catch (error) {
    console.error('[META_CAPI] Failed to send event to Meta:', error.response?.data || error.message);
    // Don't throw the error, we want the payment webhook to succeed even if Meta fails
    return null;
  }
}

module.exports = {
  sendMetaEvent
};