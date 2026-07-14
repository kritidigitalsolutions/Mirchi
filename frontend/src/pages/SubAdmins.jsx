import { useState, useEffect, useMemo, Fragment } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Search,
  ShieldAlert,
  Edit3,
  Trash2,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "./SubAdmins.css";

const MODULE_GROUPS = [
  {
    category: "Content Management",
    modules: [
      { id: "movies", title: "Movies", availableActions: ["view", "create", "edit", "delete"] },
      { id: "series", title: "Web Series & Episodes", availableActions: ["view", "create", "edit", "delete"] },
      { id: "shortdrama", title: "Short Dramas", availableActions: ["view", "create", "edit", "delete"] },
      { id: "categories", title: "Categories", availableActions: ["view", "create", "edit", "delete"] },
      { id: "ratings", title: "Ratings & Reviews", availableActions: ["view", "delete"] },
    ],
  },
  {
    category: "Users & Subscriptions",
    modules: [
      { id: "users", title: "Users & Accounts", availableActions: ["view", "edit", "delete"] },
      { id: "plans", title: "Subscription Plans", availableActions: ["view", "create", "edit", "delete"] },
      { id: "promo", title: "Promo Codes & Vouchers", availableActions: ["view", "create", "edit", "delete"] },
      { id: "pricing", title: "User Subscriptions & Revenue", availableActions: ["view"] },
    ],
  },
  {
    category: "Support & Communication",
    modules: [
      { id: "notifications", title: "Notifications & Broadcasts", availableActions: ["view", "create", "delete"] },
      { id: "support", title: "Support Tickets", availableActions: ["view", "create", "edit"] },
    ],
  },
  {
    category: "Platform & Legal Settings",
    modules: [
      { id: "legal", title: "Legal Pages", availableActions: ["view", "edit"] },
      { id: "help", title: "Help Center & FAQ", availableActions: ["view", "create", "edit", "delete"] },
      { id: "settings", title: "Platform & CDN Settings", availableActions: ["view", "edit"] },
    ],
  },
];

const ALL_MODULES_LIST = MODULE_GROUPS.flatMap((g) => g.modules);
const ALL_MODULE_IDS = ALL_MODULES_LIST.map((m) => m.id);

export default function SubAdmins() {
  const context = useOutletContext() || {};
  const adminRole = context.adminRole || localStorage.getItem("adminRole") || "ADMIN";
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    permissions: [],
    isActive: true,
  });
  const [moduleSearch, setModuleSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (adminRole === "ADMIN") {
      fetchSubAdmins();
    } else {
      setLoading(false);
    }
  }, [adminRole]);

  const fetchSubAdmins = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/subadmins");
      if (res.data?.success) {
        setSubAdmins(res.data.data || []);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        showToast("Super Admin access strictly required", "error");
      } else {
        showToast(err.response?.data?.message || "Failed to load sub-admins", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setShowPassword(false);
    setForm({
      name: "",
      email: "",
      password: "",
      permissions: [],
      isActive: true,
    });
    setModuleSearch("");
    setShowModal(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setShowPassword(false);
    setForm({
      name: staff.name || "",
      email: staff.email || "",
      password: "",
      permissions: Array.isArray(staff.permissions) ? [...staff.permissions] : [],
      isActive: staff.isActive !== false,
    });
    setModuleSearch("");
    setShowModal(true);
  };

  // ── Permission Helpers tailored to exact page actions ──
  const hasActionPerm = (modId, action) => {
    const perms = form.permissions;
    if (perms.includes(modId)) return true;
    if (perms.includes(`${modId}.${action}`)) return true;
    // Backward compat: if they have full "content" permission and this is a content submodule
    if (["movies", "series", "shortdrama", "categories"].includes(modId)) {
      if (perms.includes("content") || perms.includes(`content.${action}`)) return true;
    }
    return false;
  };

  const isAllActionsSelected = (mod) => {
    return mod.availableActions.every((act) => hasActionPerm(mod.id, act));
  };

  const toggleActionPerm = (mod, action) => {
    setForm((prev) => {
      let current = [...prev.permissions];
      const isChecked = hasActionPerm(mod.id, action);

      if (isChecked) {
        // Unchecking: remove full mod.id or specific action
        if (current.includes(mod.id)) {
          current = current.filter((p) => p !== mod.id);
          // Add back the other available actions for this module
          mod.availableActions.forEach((a) => {
            if (a !== action) current.push(`${mod.id}.${a}`);
          });
        } else {
          current = current.filter((p) => p !== `${mod.id}.${action}`);
        }
      } else {
        // Checking: add action
        current.push(`${mod.id}.${action}`);
        // Check if all available actions for this mod are now selected
        const allSelected = mod.availableActions.every((a) => {
          return current.includes(`${mod.id}.${a}`) || mod.id === a ? true : hasActionPerm(mod.id, a);
        });

        if (allSelected) {
          current = current.filter((p) => !p.startsWith(`${mod.id}.`));
          if (!current.includes(mod.id)) current.push(mod.id);
        }
      }
      return { ...prev, permissions: Array.from(new Set(current)) };
    });
  };

  const toggleAllActions = (mod) => {
    setForm((prev) => {
      let current = [...prev.permissions];
      if (isAllActionsSelected(mod)) {
        current = current.filter((p) => p !== mod.id && !p.startsWith(`${mod.id}.`));
      } else {
        current = current.filter((p) => !p.startsWith(`${mod.id}.`));
        current.push(mod.id);
      }
      return { ...prev, permissions: Array.from(new Set(current)) };
    });
  };

  const handleGrantAll = () => {
    setForm((prev) => ({
      ...prev,
      permissions: [...ALL_MODULE_IDS, "content"],
    }));
  };

  const handleClearAll = () => {
    setForm((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  const isGroupActionSelected = (group, action) =>
    group.modules
      .filter((module) => module.availableActions.includes(action))
      .every((module) => hasActionPerm(module.id, action));

  const toggleGroupActionPermissions = (group, action) => {
    const shouldSelect = !isGroupActionSelected(group, action);

    setForm((prev) => {
      let permissions = [...prev.permissions];

      if (!shouldSelect && group.category === "Content Management") {
        if (permissions.includes("content")) {
          permissions = permissions.filter((permission) => permission !== "content");
          group.modules
            .filter((module) => ["movies", "series", "shortdrama", "categories"].includes(module.id))
            .forEach((module) => {
              module.availableActions
                .filter((moduleAction) => moduleAction !== action)
                .forEach((moduleAction) => permissions.push(`${module.id}.${moduleAction}`));
            });
        }
        permissions = permissions.filter((permission) => permission !== `content.${action}`);
      }

      group.modules.forEach((module) => {
        if (!module.availableActions.includes(action)) return;

        if (shouldSelect) {
          if (!permissions.includes(module.id) && !permissions.includes(`${module.id}.${action}`)) {
            permissions.push(`${module.id}.${action}`);
          }
        } else if (permissions.includes(module.id)) {
          permissions = permissions.filter((permission) => permission !== module.id);
          module.availableActions
            .filter((moduleAction) => moduleAction !== action)
            .forEach((moduleAction) => permissions.push(`${module.id}.${moduleAction}`));
        } else {
          permissions = permissions.filter((permission) => permission !== `${module.id}.${action}`);
        }
      });

      return { ...prev, permissions: Array.from(new Set(permissions)) };
    });
  };

  const isGroupAllSelected = (group) => group.modules.every((module) => isAllActionsSelected(module));

  const toggleGroupAllPermissions = (group) => {
    const shouldSelect = !isGroupAllSelected(group);

    setForm((prev) => {
      let permissions = prev.permissions.filter(
        (permission) => !group.modules.some((module) => permission === module.id || permission.startsWith(`${module.id}.`))
      );

      if (group.category === "Content Management") {
        permissions = permissions.filter((permission) => permission !== "content" && !permission.startsWith("content."));
      }

      if (shouldSelect) {
        permissions.push(...group.modules.map((module) => module.id));
      }

      return { ...prev, permissions: Array.from(new Set(permissions)) };
    });
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      return showToast("Name and Email are required", "error");
    }
    if (!editingStaff && !form.password) {
      return showToast("Password is required when creating staff account", "error");
    }
    if (form.password && form.password.length < 6) {
      return showToast("Password must be at least 6 characters long", "error");
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          permissions: form.permissions,
          isActive: form.isActive,
        };
        if (form.password) {
          payload.password = form.password;
        }
        const res = await API.put(`/admin/subadmins/${editingStaff._id}`, payload);
        if (res.data?.success) {
          showToast("Sub-admin updated successfully!", "success");
          setShowModal(false);
          fetchSubAdmins();
        }
      } else {
        const res = await API.post("/admin/subadmins", form);
        if (res.data?.success) {
          showToast("Sub-admin created successfully!", "success");
          setShowModal(false);
          fetchSubAdmins();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Are you sure you want to delete staff account '${staff.name}'? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.delete(`/admin/subadmins/${staff._id}`);
      if (res.data?.success) {
        showToast("Staff account deleted successfully!", "success");
        setSubAdmins((prev) => prev.filter((item) => item._id !== staff._id));
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete account", "error");
    }
  };

  const toggleQuickStatus = async (staff) => {
    try {
      const nextStatus = !(staff.isActive !== false);
      const res = await API.put(`/admin/subadmins/${staff._id}`, { isActive: nextStatus });
      if (res.data?.success) {
        showToast(`Account set to ${nextStatus ? "Active" : "Disabled"}`, "success");
        setSubAdmins((prev) =>
          prev.map((item) => (item._id === staff._id ? { ...item, isActive: nextStatus } : item))
        );
      }
    } catch (err) {
      showToast("Failed to update account status", "error");
    }
  };

  const filteredSubAdmins = useMemo(() => {
    if (!search.trim()) return subAdmins;
    const q = search.toLowerCase();
    return subAdmins.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(q) ||
        (item.email || "").toLowerCase().includes(q)
    );
  }, [subAdmins, search]);

  const activeCount = useMemo(
    () => subAdmins.filter((s) => s.isActive !== false).length,
    [subAdmins]
  );
  const disabledCount = subAdmins.length - activeCount;

  if (adminRole !== "ADMIN") {
    return (
      <div className="subadmins-page" style={{ alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="subadmins-table-card" style={{ maxWidth: 480, textAlign: "center", padding: "40px 24px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <ShieldAlert size={34} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 10px", color: "#f8fafc" }}>Access Restricted</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 24px" }}>
            The Sub-admin & Staff Management dashboard is exclusively reserved for the <strong>Super Admin (`isSuperAdmin`)</strong>. Your staff role (`{adminRole}`) has access limited to your assigned modules.
          </p>
          <button className="btn-add-subadmin" style={{ margin: "0 auto" }} onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="subadmins-page">
      {/* ── Header ── */}
      <div className="subadmins-header">
        <div className="subadmins-header-left">
          <h1>Sub-admins & Staff Management</h1>
          <p>Create and manage role-based staff accounts with exact page control matrix</p>
        </div>
        <button className="btn-add-subadmin" onClick={openAddModal}>
          <Plus size={18} />
          <span>Add Sub-admin</span>
        </button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="subadmins-stats-grid">
        <div className="subadmin-stat-card">
          <div className="subadmin-stat-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
            <Users size={26} />
          </div>
          <div className="subadmin-stat-info">
            <h3>{subAdmins.length}</h3>
            <span>Total Staff Accounts</span>
          </div>
        </div>

        <div className="subadmin-stat-card">
          <div className="subadmin-stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
            <UserCheck size={26} />
          </div>
          <div className="subadmin-stat-info">
            <h3>{activeCount}</h3>
            <span>Active Sub-admins</span>
          </div>
        </div>

        <div className="subadmin-stat-card">
          <div className="subadmin-stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
            <UserX size={26} />
          </div>
          <div className="subadmin-stat-info">
            <h3>{disabledCount}</h3>
            <span>Disabled / Blocked</span>
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="subadmins-table-card">
        <div className="table-search-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
            Loading staff accounts...
          </div>
        ) : filteredSubAdmins.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🛡️</div>
            <h3 style={{ fontSize: "1.1rem", color: "#cbd5e1", margin: "0 0 4px" }}>No staff accounts found</h3>
            <p style={{ fontSize: "0.88rem", margin: 0 }}>Create your first sub-admin with exact module controls.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="subadmins-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Assigned Permissions</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubAdmins.map((staff) => {
                  const perms = Array.isArray(staff.permissions) ? staff.permissions : [];
                  const isActive = staff.isActive !== false;
                  return (
                    <tr key={staff._id}>
                      <td>
                        <div className="staff-info-cell">
                          <div className="staff-avatar">
                            {staff.name ? staff.name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div className="staff-name-wrap">
                            <h4>{staff.name}</h4>
                            <span>{staff.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`role-badge ${staff.role?.toLowerCase() || "subadmin"}`}>
                          {staff.role || "SUBADMIN"}
                        </span>
                      </td>

                      <td>
                        <div className="permissions-cloud">
                          {perms.length === 0 ? (
                            <span style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
                              No module access assigned
                            </span>
                          ) : perms.includes("content") && perms.length >= ALL_MODULE_IDS.length ? (
                            <span className="perm-pill all">
                              <CheckCircle2 size={13} /> Full Platform Access
                            </span>
                          ) : (
                            ALL_MODULES_LIST.map((mObj) => {
                              const hasAny = perms.some((p) => p === mObj.id || p.startsWith(`${mObj.id}.`));
                              if (!hasAny) return null;
                              return (
                                <span key={mObj.id} className="perm-pill">
                                  {mObj.title}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      <td>
                        <button
                          className={`status-pill ${isActive ? "active" : "disabled"}`}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                          onClick={() => toggleQuickStatus(staff)}
                          title="Click to toggle status"
                        >
                          <span className={`status-pill ${isActive ? "active" : "disabled"}`}>
                            {isActive ? (
                              <>
                                <CheckCircle2 size={14} /> Active
                              </>
                            ) : (
                              <>
                                <AlertCircle size={14} /> Disabled
                              </>
                            )}
                          </span>
                        </button>
                      </td>

                      <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td>
                        <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                          <button
                            className="btn-action"
                            title="Edit Staff Account & Permissions"
                            onClick={() => openEditModal(staff)}
                          >
                            <Edit3 size={16} />
                          </button>

                          {staff.role !== "ADMIN" && (
                            <button
                              className="btn-action delete"
                              title="Delete Staff Account"
                              onClick={() => handleDeleteStaff(staff)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Overlay (Granular Matrix UI matching reference + exact page actions) ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="subadmin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-titles">
                <h2>{editingStaff ? `Edit Sub Admin` : "Create Sub Admin"}</h2>
                <p>Assign only the permissions this admin should use.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} autoComplete="off">
              <div className="modal-body">
                {/* 3-Column Top Input Row */}
                <div className="form-row-3col">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="subadmin-email"
                      autoComplete="off"
                      placeholder="Enter email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <div className="password-input-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="subadmin-new-password"
                        autoComplete="new-password"
                        placeholder={editingStaff ? "Leave blank to keep unchanged" : "Set initial password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required={!editingStaff}
                        minLength={editingStaff && !form.password ? 0 : 6}
                      />
                      <button
                        type="button"
                        className="password-visibility-toggle"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {editingStaff && (
                  <div className="status-toggle-row">
                    <div>
                      <h4 style={{ margin: "0 0 2px 0", fontSize: "0.92rem", color: "#f8fafc" }}>Account Status</h4>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                        {form.isActive ? "Active (Can access permitted modules)" : "Disabled (Login blocked immediately)"}
                      </p>
                    </div>
                    <label className="matrix-checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      />
                    </label>
                  </div>
                )}

                {/* Module Permissions Matrix Bar */}
                <div className="matrix-section-header">
                  <h3>Module Permissions</h3>
                  <div className="matrix-header-actions">
                    <div className="matrix-search-box">
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="Find module..."
                        value={moduleSearch}
                        onChange={(e) => setModuleSearch(e.target.value)}
                      />
                    </div>
                    <button type="button" className="btn-grant-all" onClick={handleGrantAll}>
                      Grant All
                    </button>
                    <button type="button" className="btn-clear-all" onClick={handleClearAll}>
                      Clear
                    </button>
                  </div>
                </div>

                {/* Granular Checkbox Matrix Table */}
                <div className="matrix-table-wrapper">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: "28%" }}>MODULE</th>
                        <th className="text-center">VIEW</th>
                        <th className="text-center">CREATE</th>
                        <th className="text-center">EDIT</th>
                        <th className="text-center">DELETE</th>
                        <th className="text-center">ALL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULE_GROUPS.map((group) => {
                        const filteredModules = group.modules.filter((m) =>
                          m.title.toLowerCase().includes(moduleSearch.toLowerCase())
                        );
                        if (filteredModules.length === 0) return null;

                        return (
                          <Fragment key={group.category}>
                            {/* Category Header Row */}
                            <tr className="category-header-row">
                              <td>{group.category}</td>
                              {["view", "create", "edit", "delete"].map((action) => (
                                <td key={action} className="text-center">
                                  {group.modules.some((module) => module.availableActions.includes(action)) ? (
                                    <label className="matrix-checkbox-label" title={`Select ${action} for all ${group.category} modules`}>
                                      <input
                                        type="checkbox"
                                        aria-label={`Select ${action} for all ${group.category} modules`}
                                        checked={isGroupActionSelected(group, action)}
                                        onChange={() => toggleGroupActionPermissions(group, action)}
                                      />
                                    </label>
                                  ) : (
                                    <span className="perm-disabled-dash">—</span>
                                  )}
                                </td>
                              ))}
                              <td className="text-center">
                                <label className="matrix-checkbox-label" title={`Select all permissions for ${group.category}`}>
                                  <input
                                    type="checkbox"
                                    aria-label={`Select all permissions for ${group.category}`}
                                    checked={isGroupAllSelected(group)}
                                    onChange={() => toggleGroupAllPermissions(group)}
                                  />
                                </label>
                              </td>
                            </tr>
                            {/* Module Rows */}
                            {filteredModules.map((mod) => {
                              const allChecked = isAllActionsSelected(mod);
                              return (
                                <tr key={mod.id} className="module-row">
                                  <td style={{ fontWeight: 600, color: "#f8fafc" }}>{mod.title}</td>
                                  
                                  {/* VIEW Column */}
                                  <td className="text-center">
                                    {mod.availableActions.includes("view") ? (
                                      <label className="matrix-checkbox-label">
                                        <input
                                          type="checkbox"
                                          checked={hasActionPerm(mod.id, "view")}
                                          onChange={() => toggleActionPerm(mod, "view")}
                                        />
                                      </label>
                                    ) : (
                                      <span className="perm-disabled-dash">—</span>
                                    )}
                                  </td>

                                  {/* CREATE Column */}
                                  <td className="text-center">
                                    {mod.availableActions.includes("create") ? (
                                      <label className="matrix-checkbox-label">
                                        <input
                                          type="checkbox"
                                          checked={hasActionPerm(mod.id, "create")}
                                          onChange={() => toggleActionPerm(mod, "create")}
                                        />
                                      </label>
                                    ) : (
                                      <span className="perm-disabled-dash">—</span>
                                    )}
                                  </td>

                                  {/* EDIT Column */}
                                  <td className="text-center">
                                    {mod.availableActions.includes("edit") ? (
                                      <label className="matrix-checkbox-label">
                                        <input
                                          type="checkbox"
                                          checked={hasActionPerm(mod.id, "edit")}
                                          onChange={() => toggleActionPerm(mod, "edit")}
                                        />
                                      </label>
                                    ) : (
                                      <span className="perm-disabled-dash">—</span>
                                    )}
                                  </td>

                                  {/* DELETE Column */}
                                  <td className="text-center">
                                    {mod.availableActions.includes("delete") ? (
                                      <label className="matrix-checkbox-label">
                                        <input
                                          type="checkbox"
                                          checked={hasActionPerm(mod.id, "delete")}
                                          onChange={() => toggleActionPerm(mod, "delete")}
                                        />
                                      </label>
                                    ) : (
                                      <span className="perm-disabled-dash">—</span>
                                    )}
                                  </td>

                                  {/* ALL Column */}
                                  <td className="text-center">
                                    <label className="matrix-checkbox-label">
                                      <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={() => toggleAllActions(mod)}
                                      />
                                    </label>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : editingStaff
                    ? "Save Changes"
                    : "Create Sub Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
