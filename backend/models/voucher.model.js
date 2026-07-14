const mongoose = require("mongoose");

const voucherSchema =
  new mongoose.Schema(
    {
      // ========================================
      // VOUCHER CODE
      // ========================================

      code: {
        type: String,

        unique: true,

        required: true,

        uppercase: true,
        trim: true,
      },

      // ========================================
      // PLAN
      // ========================================

      plan: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Plan",

        required: true,
      },

      // ========================================
      // VALIDITY DAYS
      // ========================================

      validityDays: {
        type: Number,

        required: true,

        min: 1,
      },

      // ========================================
      // USED STATUS
      // ========================================

      isUsed: {
        type: Boolean,

        default: false,
      },

      // ========================================
      // USED BY
      // ========================================

      usedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      // ========================================
      // EXPIRY DATE
      // ========================================

      expiryDate: {
        type: Date,
      },

      // ========================================
      // OPTIONAL DESCRIPTION
      // ========================================

      description: {
        type: String,

        trim: true,

        default: "",
      },
    },

    {
      timestamps: true,
    }
  );


// ========================================
// INDEXES
// ========================================

voucherSchema.index({ plan: 1 });
voucherSchema.index({ isUsed: 1 });
voucherSchema.index({ expiryDate: 1 });

// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
  "Voucher",
  voucherSchema
);