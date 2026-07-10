const crypto = require('crypto');
const { sabpaisaClient, generateChecksum, SABPAISA_MERCHANT_ID } = require('../config/sabpaisa');
const Plan = require('../models/plan.model');
const Promo = require('../models/promocode.model');
const Subscription = require('../models/subscription.model');
const User = require('../models/user.model');
const PaymentTransaction = require('../models/paymentTransaction.model');
const { expireSubscriptionIfNeeded } = require('../utils/subscription.helper');

const successfulStatuses = new Set(['SUCCESS', 'SUCCEEDED', 'PAID', 'COMPLETED', 'CAPTURED']);
const failedStatuses = new Set(['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'EXPIRED']);
const getValue = (source, ...keys) => keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null && value !== '');
const paymentLog = (step, details = {}) => console.log(`[PAYMENT] ${new Date().toISOString()} ${step}`, details);

// Safe when SabPaisa retries a webhook or the browser checks the same payment twice.
const activateSubscription = async (transaction, gatewayPayload = {}) => {
  paymentLog('SUBSCRIPTION_ACTIVATION_STARTED', { merchantTxnId: transaction.merchantTxnId, paymentId: transaction.paymentId, userId: transaction.user.toString() });
  const existing = await Subscription.findOne({ paymentId: transaction.paymentId });
  if (existing) {
    transaction.status = 'paid';
    transaction.subscription = existing._id;
    transaction.gatewayPayload = gatewayPayload;
    await transaction.save();
    paymentLog('SUBSCRIPTION_ALREADY_ACTIVE', { merchantTxnId: transaction.merchantTxnId, subscriptionId: existing._id.toString() });
    return existing;
  }

  let active = await Subscription.findOne({ user: transaction.user, status: 'active' });
  active = await expireSubscriptionIfNeeded(active);
  if (active?.status === 'active') throw new Error('User already has an active subscription');

  const plan = await Plan.findById(transaction.plan);
  if (!plan) throw new Error('Plan no longer exists');

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + plan.duration);
  const subscription = await Subscription.create({
    user: transaction.user,
    plan: plan._id,
    status: 'active',
    paymentId: transaction.paymentId,
    subscriptionId: transaction.merchantTxnId,
    amount: transaction.amount,
    currency: transaction.currency,
    startDate,
    endDate,
  });

  if (transaction.promoCode) {
    await Promo.updateOne({ code: transaction.promoCode, isActive: true }, { $inc: { usedCount: 1 } });
  }
  transaction.status = 'paid';
  transaction.subscription = subscription._id;
  transaction.gatewayPayload = gatewayPayload;
  await transaction.save();
  paymentLog('SUBSCRIPTION_ACTIVATED', { merchantTxnId: transaction.merchantTxnId, subscriptionId: subscription._id.toString(), planId: plan._id.toString(), endDate: endDate.toISOString() });
  return subscription;
};

const createOrder = async (req, res) => {
  try {
    const { planId, promoCode } = req.body;
    paymentLog('CREATE_REQUEST_RECEIVED', { userId: req.user.id, planId, hasPromoCode: Boolean(promoCode) });
    if (!planId) return res.status(400).json({ success: false, message: 'planId required' });

    const [plan, user] = await Promise.all([Plan.findById(planId), User.findById(req.user.id)]);
    if (!plan || !plan.isActive) return res.status(404).json({ success: false, message: 'Plan not found' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let finalAmount = plan.price;
    let appliedPromo = null;
    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (!promo || (promo.expiryDate && promo.expiryDate < new Date()) || promo.usedCount >= promo.maxUses) {
        return res.status(400).json({ success: false, message: 'Invalid or expired promo code' });
      }
      if (promo.applicablePlans?.length && !promo.applicablePlans.some((id) => id.toString() === planId)) {
        return res.status(400).json({ success: false, message: 'Promo not valid for this plan' });
      }
      const discount = promo.discountType === 'percentage' ? (plan.price * promo.discountValue) / 100 : promo.discountValue;
      finalAmount = Math.max(plan.price - discount, 0);
      appliedPromo = promo.code;
    }

    const merchantTxnId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const amountPaise = Math.round(finalAmount * 100);
    const timestamp = Math.floor(Date.now() / 1000);
    const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');
    if (!process.env.SABPAISA_RETURN_URL && !backendUrl) throw new Error('Set BACKEND_URL or SABPAISA_RETURN_URL');
    if (!process.env.SABPAISA_WEBHOOK_URL && !backendUrl) throw new Error('Set BACKEND_URL or SABPAISA_WEBHOOK_URL');

    const payload = {
      merchantId: SABPAISA_MERCHANT_ID,
      merchantTxnId,
      amount: amountPaise,
      currency: 'INR',
      timestamp,
      checksum: generateChecksum(merchantTxnId, amountPaise, 'INR', timestamp),
      customerName: user.name || 'User',
      customerEmail: user.email || 'noreply@mirchiott.com',
      customerPhone: user.phone || '9999999999',
      returnUrl: process.env.SABPAISA_RETURN_URL || `${backendUrl}/api/payment/return`,
      webhookUrl: process.env.SABPAISA_WEBHOOK_URL || `${backendUrl}/api/payment/webhook`,
      notes: { planId, userId: req.user.id, promoCode: appliedPromo || '' },
    };
    paymentLog('SABPAISA_CREATE_REQUEST', { merchantTxnId, planId, amount: finalAmount, amountPaise, returnUrl: payload.returnUrl, webhookUrl: payload.webhookUrl });
    const { data } = await sabpaisaClient.post('/api/v2/payments', payload);
    paymentLog('SABPAISA_CREATE_RESPONSE', { merchantTxnId, paymentId: data?.paymentId, status: data?.status, success: data?.success, hasCheckoutUrl: Boolean(data?.checkoutUrl) });
    if (!data?.checkoutUrl || !data?.paymentId) throw new Error('SabPaisa did not return checkoutUrl or paymentId');

    await PaymentTransaction.create({
      merchantTxnId,
      paymentId: data.paymentId,
      user: req.user.id,
      plan: plan._id,
      promoCode: appliedPromo,
      amount: finalAmount,
      currency: 'INR',
    });
    paymentLog('TRANSACTION_SAVED', { merchantTxnId, paymentId: data.paymentId, userId: req.user.id, planId, amount: finalAmount });
    const checkoutUrl = data.clientSecret ? `${data.checkoutUrl}?clientSecret=${encodeURIComponent(data.clientSecret)}` : data.checkoutUrl;
    return res.status(200).json({ success: true, checkoutUrl, paymentId: data.paymentId, merchantTxnId, amount: finalAmount });
  } catch (err) {
    paymentLog('CREATE_FAILED', { message: err.message, gatewayError: err.response?.data });
    console.error('Create Order Error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, message: err.message, error: err.response?.data });
  }
};

// Browser may use this after redirect. It never grants access by trusting a browser-supplied status.
const verifyPayment = async (req, res) => {
  try {
    const { merchantTxnId } = req.body;
    paymentLog('VERIFY_REQUEST_RECEIVED', { merchantTxnId, userId: req.user.id });
    if (!merchantTxnId) return res.status(400).json({ success: false, message: 'merchantTxnId required' });
    const transaction = await PaymentTransaction.findOne({ merchantTxnId, user: req.user.id }).populate('subscription');
    if (!transaction) {
      paymentLog('VERIFY_NOT_FOUND', { merchantTxnId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Payment transaction not found' });
    }
    if (transaction.status !== 'paid') {
      paymentLog('VERIFY_PENDING', { merchantTxnId, transactionStatus: transaction.status });
      return res.status(202).json({ success: false, message: 'Payment is awaiting SabPaisa confirmation' });
    }
    paymentLog('VERIFY_SUCCESS', { merchantTxnId, subscriptionId: transaction.subscription?._id?.toString() || transaction.subscription?.toString() });
    return res.json({ success: true, message: 'Payment verified', subscription: transaction.subscription });
  } catch (err) {
    paymentLog('VERIFY_FAILED', { message: err.message });
    console.error('Verify Payment Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const sabPaisaWebhook = async (req, res) => {
  try {
    const signatureHeader = req.headers['x-sabpaisa-signature'];
    paymentLog('WEBHOOK_RECEIVED', { hasSignature: Boolean(signatureHeader), contentLength: req.headers['content-length'], body: req.body });
    if (!signatureHeader) {
      paymentLog('WEBHOOK_REJECTED', { reason: 'Missing signature' });
      return res.status(400).send('Missing signature');
    }
    const [timestamp, receivedSignature] = signatureHeader.split('.');
    if (!timestamp || !receivedSignature || Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) {
      paymentLog('WEBHOOK_REJECTED', { reason: 'Invalid or expired signature timestamp' });
      return res.status(400).send('Invalid or expired signature timestamp');
    }
    const expectedSignature = crypto.createHmac('sha256', process.env.SABPAISA_WEBHOOK_SECRET)
      .update(`${timestamp}.`).update(req.rawBody || Buffer.from(JSON.stringify(req.body))).digest('base64');
    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(receivedSignature);
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      paymentLog('WEBHOOK_REJECTED', { reason: 'Invalid signature' });
      return res.status(400).send('Invalid signature');
    }

    const merchantTxnId = getValue(req.body, 'merchantTxnId', 'merchant_txn_id', 'merchantTransactionId');
    const paymentId = getValue(req.body, 'paymentId', 'payment_id');
    const status = getValue(req.body, 'status', 'payment_status', 'event');
    if (!merchantTxnId) return res.status(400).send('Missing merchant transaction ID');
    paymentLog('WEBHOOK_SIGNATURE_VALID', { merchantTxnId, paymentId, status });
    const transaction = await PaymentTransaction.findOne({ merchantTxnId });
    if (!transaction) {
      paymentLog('WEBHOOK_REJECTED', { merchantTxnId, reason: 'Unknown payment transaction' });
      return res.status(404).send('Unknown payment transaction');
    }
    if (paymentId && paymentId !== transaction.paymentId) {
      paymentLog('WEBHOOK_REJECTED', { merchantTxnId, reason: 'Payment ID mismatch', paymentId });
      return res.status(400).send('Payment ID mismatch');
    }

    const normalizedStatus = String(status || '').toUpperCase().replace(/[.\- ]/g, '_');
    if (successfulStatuses.has(normalizedStatus) || normalizedStatus.endsWith('_SUCCESS') || normalizedStatus.endsWith('_SUCCEEDED')) {
      const subscription = await activateSubscription(transaction, req.body);
      return res.status(200).json({ status: 'processed', subscriptionId: subscription._id });
    }
    // A gateway can send informational events before the final result. Keep
    // those payments pending; only a final failure may move them to failed.
    if (failedStatuses.has(normalizedStatus) || normalizedStatus.endsWith('_FAILED')) transaction.status = 'failed';
    transaction.gatewayPayload = req.body;
    await transaction.save();
    paymentLog('WEBHOOK_NON_FINAL_EVENT_SAVED', { merchantTxnId, gatewayStatus: status, transactionStatus: transaction.status });
    return res.status(200).json({ status: 'received' });
  } catch (error) {
    paymentLog('WEBHOOK_FAILED', { message: error.message });
    console.error('Webhook Error:', error.message);
    return res.status(500).send('Webhook error');
  }
};

const sabPaisaReturn = (req, res) => {
  const merchantTxnId = req.query.merchantTxnId || req.query.merchant_txn_id || '';
  const status = req.query.status || '';
  const frontendUrl = (process.env.FRONTEND_URL || 'https://mirchiott.com').split(',')[0].replace(/\/$/, '');
  paymentLog('RETURN_URL_RECEIVED', { merchantTxnId, status, query: req.query, redirectTo: `${frontendUrl}/payment-result` });
  return res.redirect(`${frontendUrl}/payment-result?txnId=${encodeURIComponent(merchantTxnId)}&status=${encodeURIComponent(status)}`);
};

module.exports = {
  createOrder,
  verifyPayment,
  createSabPaisaPayment: createOrder,
  verifySabPaisaPayment: verifyPayment,
  sabPaisaWebhook,
  sabPaisaReturn,
};
