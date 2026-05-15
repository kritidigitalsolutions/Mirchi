const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: "User",
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            sparse: true,
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        profileImage: {
            type: String,
            default: "",
        },

        profileComplete: {
            type: Boolean,
            default: false,
        },

        fcmToken: {
            type: String,
            default: null,
        },

        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER",
        },

        // subscriptions: [
        //   {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "Subscription",
        //   },
        // ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);