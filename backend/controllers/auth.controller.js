const jwt = require("jsonwebtoken");

const OTP = require("../models/user.otp.model");
const User = require("../models/user.model");


// ========================================
// FORMAT INDIAN PHONE
// ========================================
const formatIndianPhone = (phone) => {
  const cleaned = String(phone).replace(
    /\D/g,
    ""
  );

  if (cleaned.length === 10) {
    return "+91" + cleaned;
  }

  if (
    cleaned.length === 12 &&
    cleaned.startsWith("91")
  ) {
    return "+" + cleaned;
  }

  return phone;
};


// ========================================
// GENERATE USER TOKEN
// ========================================
const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRE || "7d",
    }
  );
};


// ========================================
// SEND OTP
// ========================================
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    // indian mobile validation
    const phoneRegex =
      /^\+91[6-9]\d{9}$/;

    if (
      !phoneRegex.test(normalizedPhone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid Indian mobile number",
      });
    }

    // rate limit
    const recentOtp =
      await OTP.findOne({
        phone: normalizedPhone,
        createdAt: {
          $gt: new Date(
            Date.now() - 60 * 1000
          ),
        },
      });

    if (recentOtp) {
      return res.status(429).json({
        success: false,
        message:
          "Please wait before requesting another OTP",
      });
    }

    // generate otp
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // remove old otp
    await OTP.deleteMany({
      phone: normalizedPhone,
    });

    // save new otp
    await OTP.create({
      phone: normalizedPhone,
      otp,
      expiresAt: new Date(
        Date.now() + 5 * 60 * 1000
      ),
    });

    // check if user exists
    const user = await User.findOne({
      phone: normalizedPhone,
    });

    const isNewUser =
      !user || !user.profileComplete;

    // console otp
    console.log(
      `📱 OTP for ${normalizedPhone}: ${otp} | isNewUser: ${isNewUser}`
    );

    return res.status(200).json({
      success: true,
      message: "OTP generated successfully",
      isNewUser,

      // REMOVE IN PRODUCTION
      otp,
    });

  } catch (error) {
    console.error(
      "SEND OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
    });
  }
};


// ========================================
// VERIFY OTP
// ========================================
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Phone and OTP are required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    const normalizedOtp = String(
      otp
    ).trim();

    const otpRecord =
      await OTP.findOne({
        phone: normalizedPhone,
        otp: normalizedOtp,
        expiresAt: {
          $gt: new Date(),
        },
      }).sort({
        createdAt: -1,
      });

    // wrong otp
    if (!otpRecord) {
      const existing =
        await OTP.findOne({
          phone: normalizedPhone,
          expiresAt: {
            $gt: new Date(),
          },
        });

      if (existing) {
        existing.attempts =
          (existing.attempts || 0) + 1;

        await existing.save();

        if (existing.attempts >= 5) {
          await OTP.deleteOne({
            _id: existing._id,
          });

          return res.status(429).json({
            success: false,
            message:
              "Too many wrong attempts. Request new OTP.",
          });
        }
      }

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    // delete otp after success
    await OTP.deleteOne({
      _id: otpRecord._id,
    });

    // check user
    let user = await User.findOne({
      phone: normalizedPhone,
    });

    // create user automatically
    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        role: "USER",
      });
    }

    // generate token
    const token =
      generateUserToken(user);

    const isNewUser = !user.profileComplete;

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully",

      token,
      isNewUser,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage:
          user.profileImage,
        profileComplete:
          user.profileComplete,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Verification failed",
    });
  }
};