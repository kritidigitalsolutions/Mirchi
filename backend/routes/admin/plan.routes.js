const express = require("express");
const router = express.Router();

const {
  createPlan,
  updatePlan,
  deletePlan,
  getAllPlans
} = require("../../controllers/admin/plan.controller");


const { isAdmin, hasPermission } = require("../../middlewares/admin.middleware");

// ================= ADMIN PLAN ROUTES =================
router.use(isAdmin, hasPermission("plans"));

router.post("/", isAdmin, createPlan);
router.get("/", isAdmin, getAllPlans);
router.patch("/:id", isAdmin, updatePlan);
router.delete("/:id", isAdmin, deletePlan);

module.exports = router;