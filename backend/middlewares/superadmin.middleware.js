const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Strictly ensure role is ADMIN (Super Admin) and NOT SUBADMIN
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Super Admin access strictly required for this action",
      });
    }

    next();
  } catch (error) {
    console.error("Super Admin Middleware Error:", error.message);
    return res.status(403).json({
      success: false,
      message: "Super Admin verification failed",
    });
  }
};

module.exports = { isSuperAdmin };
