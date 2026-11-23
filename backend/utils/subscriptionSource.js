// Older subscriptions have no `source`; infer it from the stored data
const resolveSubscriptionSource = (sub) => {
  if (!sub) return null;
  if (sub.source) return sub.source;
  if (sub.paymentId) return "payment";
  if (!sub.amount) return "voucher";
  return "direct";
};

module.exports = { resolveSubscriptionSource };
