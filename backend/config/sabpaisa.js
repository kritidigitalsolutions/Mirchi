const axios = require('axios');

// SabPaisa configuration – values are read from environment variables.
// Keep secrets out of source code; they should be set in .env.
const SABPAISA_API_KEY = process.env.SABPAISA_API_KEY || '';
const SABPAISA_SECRET_KEY = process.env.SABPAISA_SECRET_KEY || '';
const SABPAISA_MERCHANT_ID = process.env.SABPAISA_MERCHANT_ID || '';
const SABPAISA_BASE_URL = process.env.SABPAISA_BASE_URL || '';

// Helper to generate HMAC SHA256 checksum for request authentication.
const crypto = require('crypto');
function generateChecksum(merchantTxnId, amount, currency, timestamp) {
  // Formula: merchantId|merchantTxnId|amount|currency|timestamp
  const data = `${SABPAISA_MERCHANT_ID}|${merchantTxnId}|${amount}|${currency}|${timestamp}`;
  return crypto.createHmac('sha256', SABPAISA_SECRET_KEY).update(data).digest('hex');
}

const sabpaisaClient = axios.create({
  baseURL: SABPAISA_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': SABPAISA_API_KEY,
  },
});

module.exports = {
  sabpaisaClient,
  generateChecksum,
  SABPAISA_MERCHANT_ID,
  SABPAISA_BASE_URL,
};
