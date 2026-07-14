const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const { isSuperAdmin } = require("../../middlewares/superadmin.middleware");
const {
  createSubAdmin,
  getSubAdmins,
  updateSubAdmin,
  deleteSubAdmin,
} = require("../../controllers/admin/subadmin.controller");

// All sub-admin routes require valid token (isAdmin) AND Super Admin status (isSuperAdmin)
router.use(isAdmin, isSuperAdmin);

router.post("/", createSubAdmin);
router.get("/", getSubAdmins);
router.put("/:id", updateSubAdmin);
router.delete("/:id", deleteSubAdmin);

module.exports = router;
