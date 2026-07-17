const jwt = require("jsonwebtoken");

const OTP = require("../models/user.otp.model");
const User = require("../models/user.model");

const { admin } = require("../config/firebase");
const { OAuth2Client } = require("google-auth-library");


const { sendOtpSms } = require("../services/pinnacleSmsService");


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// ========================================
// DUMMY USER (Development)
// ========================================
const DUMMY_PHONE = "+919999999999";
const DUMMY_OTP = "123456";

const isDummyUser = (phone) => phone === DUMMY_PHONE;

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

// SEND OTP  (Pinnacle SMS integrated)

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

    // ========================================
    // DUMMY USER
    // ========================================
    if (isDummyUser(normalizedPhone)) {
      let user = await User.findOne({
        phone: DUMMY_PHONE,
      });

      if (!user) {
        user = await User.create({
          phone: DUMMY_PHONE,
          name: "Dummy User",
          username: "@dummyuser",
          role: "USER",
          profileComplete: true,
          profileImage: "",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Dummy OTP generated",
        isNewUser: false,
      });
    }

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


    // Pinnacle needs a plain 10-digit number, no +91 prefix
    const tenDigitPhone = normalizedPhone.replace(
      /^\+91/,
      ""
    );

    // Send the SMS via Pinnacle BEFORE saving to DB —
    // we don't want an OTP record for an SMS that never went out.
    const smsResult = await sendOtpSms(
      tenDigitPhone,
      otp
    );
    console.log("\n========== SMS RESULT ==========");
    console.log(JSON.stringify(smsResult, null, 2));

    if (!smsResult.success) {
      console.error(
        "PINNACLE SEND OTP FAILED:",
        smsResult.error
      );

      return res.status(502).json({
        success: false,
        message:
          "Failed to send OTP. Please try again.",
      });
    }

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


    // Keep this for local/dev debugging ONLY.
    // Logging real OTPs in production logs is a security risk.
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `📱 OTP for ${normalizedPhone}: ${otp} | isNewUser: ${isNewUser}`
      );
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${normalizedPhone}`,
      isNewUser,
      // ⚠️ Do NOT return the otp in the API response in production.
      // otp,
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

    // ========================================
    // DUMMY USER LOGIN
    // ========================================
    if (isDummyUser(normalizedPhone)) {
      if (normalizedOtp !== DUMMY_OTP) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      let user = await User.findOne({
        phone: DUMMY_PHONE,
      });

      if (!user) {
        user = await User.create({
          phone: DUMMY_PHONE,
          name: "Dummy User",
          username: "@dummyuser",
          role: "USER",
          profileComplete: true,
          profileImage: "",
          lastLoginAt: new Date(),
        });
      } else {
        user.lastLoginAt = new Date();
        await user.save();
      }

      const token = generateUserToken(user);

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        token,
        isNewUser: false,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          profileComplete: user.profileComplete,
          role: user.role,
        },
      });
    }

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
        lastLoginAt: new Date(),
      });
    } else {
      user.lastLoginAt = new Date();
    }

    const rawFcmToken =
      req.body.fcmToken || req.body.token;

    const normalizedFcmToken =
      typeof rawFcmToken === "string"
        ? rawFcmToken.trim()
        : "";

    if (normalizedFcmToken) {
      await User.updateMany(
        {
          _id: { $ne: user._id },
          fcmToken: normalizedFcmToken,
        },
        {
          $unset: {
            fcmToken: "",
            fcmTokenUpdatedAt: "",
          },
        }
      );

      user.fcmToken = normalizedFcmToken;
      user.fcmTokenUpdatedAt = new Date();
    }

    await user.save();

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

// ========================================
// GOOGLE LOGIN
// ========================================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken, token, fcmToken } = req.body;

    if (!idToken && !token) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    let uid;
    let email;
    let name;
    let picture;

    if (idToken) {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({
          success: false,
          message: "Google client ID is not configured",
        });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      uid = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else {
      // Backward compatibility for Firebase Auth clients.
      const decodedToken = await admin.auth().verifyIdToken(token);

      uid = decodedToken.uid;
      email = decodedToken.email;
      name = decodedToken.name;
      picture = decodedToken.picture;
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account email not found",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find existing user by Google UID or by Email
    let user = await User.findOne({
      $or: [
        { googleId: uid },
        { email: normalizedEmail }
      ]
    });

    let isNewUser = false;

    // Create new user if not exists
    if (!user) {
      isNewUser = true;

      // We generate a highly unique temporary/placeholder phone string using UID and random characters
      // to guarantee uniqueness and avoid duplicate key errors on the unique phone index.
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const tempPhone = `google_${uid.substring(0, 10)}_${uniqueSuffix}`;

      user = await User.create({
        name: name || "User",
        email: normalizedEmail,
        profileImage: picture || "",
        googleId: uid,
        authProvider: "GOOGLE",
        profileComplete: true,
        phone: tempPhone,
        lastLoginAt: new Date(),
      });
    } else {
      // If the user exists but hasn't linked Google credentials yet, link them!
      let updated = false;
      if (!user.googleId) {
        user.googleId = uid;
        updated = true;
      }
      if (user.authProvider !== "GOOGLE") {
        user.authProvider = "GOOGLE";
        updated = true;
      }
      user.lastLoginAt = new Date();
    }

    user.lastLoginAt = new Date();

    // Save FCM Token & disassociate it from any other users to prevent duplicate alerts
    if (fcmToken && typeof fcmToken === "string") {
      const normalizedFcmToken = fcmToken.trim();
      if (normalizedFcmToken) {
        await User.updateMany(
          {
            _id: { $ne: user._id },
            fcmToken: normalizedFcmToken,
          },
          {
            $unset: {
              fcmToken: "",
              fcmTokenUpdatedAt: "",
            },
          }
        );

        user.fcmToken = normalizedFcmToken;
        user.fcmTokenUpdatedAt = new Date();
      }
    }
    await user.save();

    // Generate JWT
    const appToken = generateUserToken(user);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token: appToken,
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
};

// ========================================
// WEBSITE SSO LOGIN
// ========================================
exports.websiteSSOLogin = async (req, res) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const appToken = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(
        appToken,
        process.env.JWT_SECRET
      );
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    // Generate fresh website token
    const websiteToken = generateUserToken(user);

    return res.status(200).json({
      success: true,
      message: "Website login successful",
      token: websiteToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("WEBSITE SSO LOGIN:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};