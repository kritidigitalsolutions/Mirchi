const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");

const isAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN" && decoded.role !== "SUBADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const adminRecord = await Admin.findById(decoded.id).select("-password");
    if (!adminRecord || adminRecord.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account disabled or not found",
      });
    }

    req.user = {
      id: adminRecord._id,
      role: adminRecord.role,
      permissions: adminRecord.permissions || [],
      email: adminRecord.email,
      name: adminRecord.name,
    };

    next();
  } catch (error) {
    console.error("Admin Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const hasPermission = (...requiredPerms) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      // Super Admin bypasses all module restrictions
      if (req.user.role === "ADMIN") {
        return next();
      }

      const userPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
      if (userPerms.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: You have no permissions granted`,
        });
      }

      // Determine required action suffix based on HTTP method
      let actionSuffix = "view";
      if (req.method === "POST") actionSuffix = "create";
      else if (req.method === "PUT" || req.method === "PATCH") actionSuffix = "edit";
      else if (req.method === "DELETE") actionSuffix = "delete";

      // Check if user has permission for at least one of requiredPerms
      const hasAccess = requiredPerms.some((p) => {
        // 1. Check if full module or parent module is granted (e.g. "movies", "content")
        if (userPerms.includes(p) || (p !== "content" && userPerms.includes("content"))) {
          return true;
        }
        // 2. Check exact action suffix (e.g. "movies.view", "movies.create", "content.view")
        const actionKey = `${p}.${actionSuffix}`;
        const parentActionKey = `content.${actionSuffix}`;
        if (userPerms.includes(actionKey) || (p !== "content" && userPerms.includes(parentActionKey))) {
          return true;
        }
        // 3. For GET requests, if they have any permission for this module (e.g., movies.edit), allow viewing
        if (actionSuffix === "view") {
          return userPerms.some((up) => up === p || up.startsWith(`${p}.`) || up.startsWith("content."));
        }
        return false;
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: You require '${requiredPerms.join(" or ")} (${actionSuffix.toUpperCase()})' permission for this action`,
        });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: "Permission verification failed" });
    }
  };
};

module.exports = { isAdmin, hasPermission };