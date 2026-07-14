const Admin = require("../../models/admin.model");
const bcrypt = require("bcryptjs");

// ========================================
// CREATE SUB-ADMIN
// ========================================
exports.createSubAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions, isActive } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An admin or sub-admin with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const subAdmin = await Admin.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "SUBADMIN",
      permissions: Array.isArray(permissions) ? permissions : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return res.status(201).json({
      success: true,
      message: "Sub-admin created successfully",
      data: {
        _id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        role: subAdmin.role,
        permissions: subAdmin.permissions,
        isActive: subAdmin.isActive,
        createdAt: subAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error("CREATE SUB-ADMIN ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// GET ALL SUB-ADMINS
// ========================================
exports.getSubAdmins = async (req, res) => {
  try {
    const subAdmins = await Admin.find({ role: "SUBADMIN" })
      .select("-password -__v")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: subAdmins.length,
      data: subAdmins,
    });
  } catch (error) {
    console.error("GET SUB-ADMINS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// UPDATE SUB-ADMIN
// ========================================
exports.updateSubAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions, isActive } = req.body;
    const subAdminId = req.params.id;

    const subAdmin = await Admin.findById(subAdminId);
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    if (subAdmin.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Super Admin credentials cannot be modified via sub-admin endpoints",
      });
    }

    if (name) subAdmin.name = name.trim();

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== subAdmin.email) {
        const existing = await Admin.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: "Another account is already using this email",
          });
        }
        subAdmin.email = normalizedEmail;
      }
    }

    if (Array.isArray(permissions)) {
      subAdmin.permissions = permissions;
    }

    if (isActive !== undefined) {
      subAdmin.isActive = Boolean(isActive);
    }

    if (password && password.trim().length >= 6) {
      subAdmin.password = await bcrypt.hash(password.trim(), 10);
    }

    await subAdmin.save();

    return res.status(200).json({
      success: true,
      message: "Sub-admin updated successfully",
      data: {
        _id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        role: subAdmin.role,
        permissions: subAdmin.permissions,
        isActive: subAdmin.isActive,
        updatedAt: subAdmin.updatedAt,
      },
    });
  } catch (error) {
    console.error("UPDATE SUB-ADMIN ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// DELETE SUB-ADMIN
// ========================================
exports.deleteSubAdmin = async (req, res) => {
  try {
    const subAdmin = await Admin.findById(req.params.id);
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    if (subAdmin.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Super Admin cannot be deleted",
      });
    }

    await subAdmin.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Sub-admin deleted successfully",
    });
  } catch (error) {
    console.error("DELETE SUB-ADMIN ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
