const mongoose = require("mongoose");

// Trusted payment context saved before redirecting a user to the gateway.
const paymentTransactionSchema = new mongoose.Schema({
  merchantTxnId: { type: String, required: true, unique: true, index: true },
  paymentId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  promoCode: { type: String, default: null },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending", index: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
  gatewayPayload: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

module.exports = mongoose.models.PaymentTransaction || mongoose.model("PaymentTransaction", paymentTransactionSchema);
