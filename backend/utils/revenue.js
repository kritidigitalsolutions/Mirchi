// Keep revenue consistent without excluding free subscriptions from user counts.
const revenueSum = {
  $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] },
};

module.exports = { revenueSum };
