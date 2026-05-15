const User = require("../models/user.model");


// ========================================
// GET PROFILE
// ========================================
exports.getProfile = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.user.id
    ).select("-__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    console.error(
      "Get Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// COMPLETE PROFILE
// ========================================
exports.completeProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
    } = req.body;

    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // prevent duplicate email
    if (email) {
      const existingEmail =
        await User.findOne({
          email,
        });

      if (
        existingEmail &&
        existingEmail._id.toString() !==
          user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email already in use",
        });
      }
    }

    // update fields
    if (name) {
      user.name = name;
    }

    if (email) {
      user.email = email
        .trim()
        .toLowerCase();
    }

    // handle profile image
    if (req.file) {
      user.profileImage = req.file.path.replace(/\\/g, "/");
    }

    user.profileComplete = true;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Profile completed successfully",
      user,
    });

  } catch (error) {
    console.error(
      "Complete Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// UPDATE PROFILE
// ========================================
exports.updateProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
    } = req.body;

    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // duplicate email check
    if (email) {
      const existingEmail =
        await User.findOne({
          email,
        });

      if (
        existingEmail &&
        existingEmail._id.toString() !==
          user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email already in use",
        });
      }
    }

    // update fields
    if (name) {
      user.name = name;
    }

    if (email) {
      user.email = email
        .trim()
        .toLowerCase();
    }

    // handle profile image
    if (req.file) {
      user.profileImage = req.file.path.replace(/\\/g, "/");
    }

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user,
    });

  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// SAVE FCM TOKEN
// ========================================
exports.saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      fcmToken: token,
    });

    res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    console.error("Save FCM Token Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};