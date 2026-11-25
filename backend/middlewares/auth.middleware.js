const jwt = require("jsonwebtoken");
//added this below
const User = require("../models/user.model");
const { touchUserActivity } = require("../utils/presence.helper");

const isAuth = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "USER") {
      return res.status(403).json({
        success: false,
        message: "User access only",
      });
    }

    // req.user = decoded;
    //new change
    const user = await User.findById(decoded.id);

if (!user) {
  return res.status(401).json({
    success: false,
    message: "User not found",
  });
}

req.user = user;
touchUserActivity(user);

    next();

  } catch (error) {
    console.error("JWT NAME:", error.name);
    console.error("JWT MESSAGE:", error.message);
    console.error(error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// Attaches req.user when a valid user token is sent, but never blocks the
// request. Used by endpoints that also accept guests (e.g. watch tracking).
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      if (decoded.role === "USER") {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
          touchUserActivity(user);
        }
      }
    }
  } catch {
    // invalid / expired token: continue as guest
  }
  next();
};

module.exports = { isAuth, optionalAuth };