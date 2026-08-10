import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Send, X, Trash2, Eye, RefreshCw } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./Notifications.css";
import "./NotificationsLight.css";

// ── Type badge colours ─────────────────────────────────────────────────────
const TYPE_COLORS = {
  GENERAL: { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
  SYSTEM: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  PLAN: { bg: "rgba(139,92,246,0.15)", color: "#8b5cf6" },
  PROMOTIONAL: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
};

const EMPTY_FORM = {
  title: "",
  message: "",
  imageUrl: "",
  actionUrl: "",
  type: "GENERAL",
  sendTo: "All Users",
  userSearch: "",
  linkCategory: "None", // None, Content, Plan
  linkType: "Movie", // Movie, Series
  contentSearch: "",
};

// ── sendTo value → backend targetUserType mapping ─────────────────────────
const SEND_TO_MAP = {
  "All Users": "ALL",
  "Subscribers Only": "SUBSCRIBERS",
  "Specific User": "SPECIFIC_USER",
};

// ── Helper: resolve display target from a notification doc ─────────────────
const resolveTarget = (n) => {
  if (n.targetUser) return n.targetUser?.name || n.targetUser?.email || "Specific User";
  if (n.targetUserType) return n.targetUserType === "ALL" ? "All Users" : n.targetUserType;
  return "All Users";
};

// ── Helper: resolve image URL from a notification doc ────────────────────
const getNotifImage = (n) => {
  if (!n) return null;
  if (n.imageUrl) return n.imageUrl;
  if (n.metadata?.imageUrl) return n.metadata.imageUrl;
  if (typeof n.metadata?.contentId === "object" && n.metadata?.contentId?.poster) {
    return n.metadata.contentId.poster;
  }
  if (typeof n.metadata?.contentId === "object" && n.metadata?.contentId?.banner) {
    return n.metadata.contentId.banner;
  }
  return null;
};

// ── Helper: resolve action URL from a notification doc ───────────────────
const getActionUrl = (n) => {
  if (!n) return null;
  if (n.actionUrl) return n.actionUrl;
  if (n.metadata?.actionUrl) return n.metadata.actionUrl;
  return null;
};

export default function NotificationsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const [users, setUsers] = useState([]);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewNotif, setViewNotif] = useState(null); // the notification being viewed
  const [deleteConfirm, setDeleteConfirm] = useState(null); // delete prompt modal state

  // Content for linking
  const [movies, setMovies] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [contentDropOpen, setContentDropOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  const userSearchRef = useRef(null);
  const contentSearchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target)) {
        setUserDropOpen(false);
      }
      if (contentSearchRef.current && !contentSearchRef.current.contains(event.target)) {
        setContentDropOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch notifications from backend ──────────────────────────────────
  const fetchNotifications = useCallback(async (currentPage = 1) => {
    setFetching(true);
    try {
      const res = await API.get(`/admin/notifications/?page=${currentPage}&limit=${limit}`);
      setNotifications(res.data.data || []);
      setTotalPages(res.data.pages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load notifications.", "error");
    } finally {
      setFetching(false);
    }
  }, []);

  // ── Fetch users for searchable dropdown ───────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await API.get("/admin/users?limit=1000");
      setUsers(res.data.users || res.data.data || []);
    } catch {
      // Non-critical — fallback to empty list
    }
  }, []);

  const fetchContentData = useCallback(async () => {
    try {
      const mRes = await API.get("/admin/movies?limit=1000");
      setMovies(mRes.data.movies || []);
      const sRes = await API.get("/admin/series?limit=1000");
      setSeriesList(sRes.data.series || []);
      const pRes = await API.get("/admin/plan");
      setPlans(pRes.data.plans || pRes.data.data || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
    fetchUsers();
    fetchContentData();
  }, [fetchNotifications, fetchUsers, fetchContentData]);

  // ── Form input change ─────────────────────────────────────────────────
  const ch = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ── Filtered user list ────────────────────────────────────────────────
  const filteredUsers = users.filter(
    (u) =>
      String(u.name || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      String(u.email || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      String(u.phone || "").includes(form.userSearch)
  );

  const getFilteredContent = () => {
    const activeLinkType = form.linkCategory === "Plan" ? "Plan" : (form.linkCategory === "Content" ? form.linkType : "None");
    let list = [];
    if (activeLinkType === "Movie") list = movies;
    else if (activeLinkType === "Series") list = seriesList;
    else if (activeLinkType === "Plan") list = plans;

    return list.filter(c => (c.title || c.name || "").toLowerCase().includes(form.contentSearch.toLowerCase()));
  };
  const filteredContent = getFilteredContent();

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setForm({
      ...form,
      linkCategory: category,
      contentSearch: ""
    });
    setSelectedContent(null);
    setContentDropOpen(false);
  };

  // ── Send notification ─────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      showToast("Please fill in title and message.", "error");
      return;
    }
    if (form.sendTo === "Specific User" && !selectedUser) {
      showToast("Please select a specific user.", "error");
      return;
    }

    const activeLinkType = form.linkCategory === "Plan" ? "Plan" : (form.linkCategory === "Content" ? form.linkType : "None");

    if (activeLinkType !== "None" && !selectedContent) {
      showToast(`Please select a ${activeLinkType}.`, "error");
      return;
    }

    let attachmentType = "none";
    let contentType = undefined;
    let contentId = undefined;
    let planId = undefined;

    if (form.linkCategory === "Content") {
      attachmentType = "content";
      contentType = form.linkType.toLowerCase();
      contentId = selectedContent?._id || selectedContent?.id;
    } else if (form.linkCategory === "Plan") {
      attachmentType = "plan";
      contentType = "plan";
      contentId = selectedContent?._id || selectedContent?.id;
      planId = selectedContent?._id || selectedContent?.id;
    }

    let generatedActionUrl = "";
    if (form.linkCategory === "Content" && selectedContent) {
      const id = selectedContent._id || selectedContent.id;
      if (form.linkType === "Movie") generatedActionUrl = `mirchiapp://movies/id/${id}`;
      else if (form.linkType === "Series") generatedActionUrl = `mirchiapp://series/id/${id}`;
    } else if (form.linkCategory === "Plan" && selectedContent) {
      const id = selectedContent._id || selectedContent.id;
      generatedActionUrl = `mirchiapp://plans/id/${id}`;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        imageUrl: form.imageUrl.trim() || selectedContent?.poster || selectedContent?.banner || "",
        actionUrl: generatedActionUrl || undefined,
        sendTo: SEND_TO_MAP[form.sendTo] || "ALL",
        attachmentType,
        contentType,
        contentId,
        planId,
        ...(form.sendTo === "Specific User" && selectedUser
          ? { targetUser: selectedUser._id || selectedUser.id }
          : {}),
      };

      await API.post("/admin/notifications/send", payload);

      showToast("Notification sent successfully! 🎉");
      setForm(EMPTY_FORM);
      setSelectedUser(null);
      setSelectedContent(null);
      fetchNotifications(1); // refresh table from page 1
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Clear form ────────────────────────────────────────────────────────
  const handleClear = () => {
    setForm(EMPTY_FORM);
    setSelectedUser(null);
    setSelectedContent(null);
  };

  // ── Delete notification ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      await API.delete(`/admin/notifications/${id}`);
      showToast("Notification deleted.");
      fetchNotifications(page);
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed.", "error");
      fetchNotifications(page);
    }
  };

  // ── Delete all notifications ──────────────────────────────────────────
  const handleDeleteAll = async () => {
    try {
      setNotifications([]);
      setTotalPages(1);
      setPage(1);
      await API.delete("/admin/notifications/all");
      showToast("All notifications deleted.");
      fetchNotifications(1);
    } catch (err) {
      showToast(err.response?.data?.message || "Delete all failed.", "error");
      fetchNotifications(1);
    }
  };

  // ── View notification & Mark as Read ───────────────────────────────────
  const handleView = async (notif) => {
    setViewNotif(notif);
    if (!notif.isRead) {
      try {
        await API.patch(`/admin/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="add-content-page notif-page">

      {/* ── Toast ── */}
      {toast && (
        <div className={`notif-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <span className="pg-title-icon"><Bell size={26} /></span>
            Notifications
          </h1>
          <p className="pg-sub">Send and manage user notifications</p>
        </div>

        <div className="notif-stats-row">
          <div className="notif-stat-chip">
            <span className="notif-stat-val">{notifications.length}</span>
            <span className="notif-stat-lbl">Total Sent</span>
          </div>
          <div className="notif-stat-chip s-green">
            <span className="notif-stat-val">{notifications.length}</span>
            <span className="notif-stat-lbl">Delivered</span>
          </div>
          <div className="notif-stat-chip s-red">
            <span className="notif-stat-val">0</span>
            <span className="notif-stat-lbl">Failed</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SEND FORM ═══════════════════════ */}
      <form onSubmit={handleSend}>
        <div className="form-card notif-card">
          <h3>
            <span className="notif-card-icon"><Send size={16} /></span>
            Send Notification
          </h3>

          {/* Title */}
          <div className="notif-field-group">
            <label className="notif-label">Notification Title</label>
            <input
              className="form-input-styled notif-input"
              name="title"
              placeholder="Enter notification title"
              value={form.title}
              onChange={ch}
            />
          </div>

          {/* Message */}
          <div className="notif-field-group">
            <label className="notif-label">Message</label>
            <textarea
              className="form-input-styled notif-input notif-textarea"
              name="message"
              placeholder="Write notification message..."
              value={form.message}
              onChange={ch}
              rows={4}
            />
          </div>

          {/* Image URL */}
          <div className="notif-field-group">
            <label className="notif-label">
              Image URL <span className="notif-optional">(Optional - Auto-resolved if Content attached)</span>
            </label>
            <input
              className="form-input-styled notif-input"
              name="imageUrl"
              placeholder="https://example.com/image.jpg or poster URL"
              value={form.imageUrl}
              onChange={ch}
            />
            {(form.imageUrl || selectedContent?.poster || selectedContent?.banner) && (
              <div className="notif-form-img-preview-wrap">
                <span className="notif-label" style={{ fontSize: "0.7rem", marginTop: 0 }}>Preview:</span>
                <img
                  src={form.imageUrl || selectedContent?.poster || selectedContent?.banner}
                  alt="Notification preview"
                  className="notif-form-img-preview"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Type + Send To */}
          <div className="notif-2col">
            <div className="notif-field-group">
              <label className="notif-label">Type</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="type"
                value={form.type}
                onChange={ch}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="SYSTEM">SYSTEM</option>
                <option value="PLAN">PLAN</option>
                <option value="PROMOTIONAL">PROMOTIONAL</option>
              </select>
            </div>

            <div className="notif-field-group">
              <label className="notif-label">Send To</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="sendTo"
                value={form.sendTo}
                onChange={(e) => {
                  ch(e);
                  setSelectedUser(null);
                  setUserDropOpen(false);
                }}
              >
                <option value="All Users">All Users</option>
                <option value="Specific User">Specific User</option>
                <option value="Subscribers Only">Subscribers Only</option>
              </select>
            </div>
          </div>

          {/* Specific User search (conditional) */}
          {form.sendTo === "Specific User" && (
            <div className="notif-field-group notif-fade-in">
              <label className="notif-label">Search User</label>
              <div className="notif-user-search-wrap" ref={userSearchRef}>
                <input
                  className="form-input-styled notif-input"
                  name="userSearch"
                  placeholder="Search by name / email / phone"
                  value={selectedUser ? (selectedUser.name || selectedUser.email) : form.userSearch}
                  onChange={(e) => {
                    if (selectedUser) setSelectedUser(null);
                    setForm({ ...form, userSearch: e.target.value });
                    setUserDropOpen(true);
                  }}
                  onFocus={() => setUserDropOpen(true)}
                  autoComplete="off"
                />
                {selectedUser && (
                  <button
                    type="button"
                    className="notif-user-clear"
                    onClick={() => { setSelectedUser(null); setForm({ ...form, userSearch: "" }); }}
                  >
                    <X size={14} />
                  </button>
                )}

                {userDropOpen && !selectedUser && (
                  <div className="notif-user-dropdown">
                    {filteredUsers.length === 0 ? (
                      <div className="notif-user-empty">No users found</div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u._id || u.id}
                          className="notif-user-option"
                          onMouseDown={() => {
                            setSelectedUser(u);
                            setUserDropOpen(false);
                            setForm({ ...form, userSearch: u.name || u.email });
                          }}
                        >
                          <div className="notif-user-avatar">
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="notif-user-name">{u.name || "—"}</div>
                            <div className="notif-user-meta">
                              {u.email}{u.phone ? ` · ${u.phone}` : ""}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Link Category Toggle */}
          <div className="notif-field-group">
            <label className="notif-label">Attachment Type</label>
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px', color: 'var(--text)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="linkCategory"
                  value="None"
                  checked={form.linkCategory === 'None'}
                  onChange={handleCategoryChange}
                /> None
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="linkCategory"
                  value="Content"
                  checked={form.linkCategory === 'Content'}
                  onChange={handleCategoryChange}
                /> Content
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="linkCategory"
                  value="Plan"
                  checked={form.linkCategory === 'Plan'}
                  onChange={handleCategoryChange}
                /> Subscription Plan
              </label>
            </div>
          </div>

          {/* Link Type (Only for Content) */}
          {form.linkCategory === "Content" && (
            <div className="notif-field-group notif-fade-in">
              <label className="notif-label">Link to Content</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="linkType"
                value={form.linkType}
                onChange={(e) => {
                  setForm({ ...form, linkType: e.target.value, contentSearch: "" });
                  setSelectedContent(null);
                  setContentDropOpen(false);
                }}
              >
                <option value="Movie">Movie</option>
                <option value="Series">Series</option>
              </select>
            </div>
          )}

          {/* Content Search */}
          {(form.linkCategory === "Content" || form.linkCategory === "Plan") && (
            <div className="notif-field-group notif-fade-in">
              <label className="notif-label">
                Search {form.linkCategory === "Plan" ? "Plan" : form.linkType}
              </label>
              <div className="notif-user-search-wrap" ref={contentSearchRef}>
                <input
                  className="form-input-styled notif-input"
                  name="contentSearch"
                  placeholder={`Search ${form.linkCategory === "Plan" ? "plan" : form.linkType.toLowerCase()} name`}
                  value={selectedContent ? (selectedContent.title || selectedContent.name) : form.contentSearch}
                  onChange={(e) => {
                    if (selectedContent) setSelectedContent(null);
                    setForm({ ...form, contentSearch: e.target.value });
                    setContentDropOpen(true);
                  }}
                  onFocus={() => setContentDropOpen(true)}
                  autoComplete="off"
                />
                {selectedContent && (
                  <button
                    type="button"
                    className="notif-user-clear"
                    onClick={() => { setSelectedContent(null); setForm({ ...form, contentSearch: "" }); }}
                  >
                    <X size={14} />
                  </button>
                )}

                {contentDropOpen && !selectedContent && (
                  <div className="notif-user-dropdown">
                    {filteredContent.length === 0 ? (
                      <div className="notif-user-empty">No {form.linkType.toLowerCase()} found</div>
                    ) : (
                      filteredContent.map((c) => (
                        <div
                          key={c._id || c.id}
                          className="notif-user-option"
                          onMouseDown={() => {
                            setSelectedContent(c);
                            setContentDropOpen(false);

                            let autoUrl = "";
                            const id = c._id || c.id;
                            if (form.linkCategory === "Content") {
                              if (form.linkType === "Movie") autoUrl = `mirchiapp://movies/id/${id}`;
                              else if (form.linkType === "Series") autoUrl = `mirchiapp://series/id/${id}`;
                            } else if (form.linkCategory === "Plan") {
                              autoUrl = `mirchiapp://plans/id/${id}`;
                            }

                            setForm((prev) => ({
                              ...prev,
                              contentSearch: (c.title || c.name),
                              actionUrl: autoUrl || prev.actionUrl
                            }));
                          }}
                        >
                          <div className="notif-user-avatar">
                            {((c.title || c.name) || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="notif-user-name">{(c.title || c.name) || "—"}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="notif-btn-row">
            <button
              type="submit"
              className="btn-lg notif-send-btn"
              disabled={loading}
            >
              {loading ? <span className="notif-spinner" /> : <Send size={16} />}
              {loading ? "Sending..." : "Send Notification"}
            </button>

            <button
              type="button"
              className="btn notif-clear-btn"
              onClick={handleClear}
            >
              <X size={15} />
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* ═══════════════════════ RECENT TABLE ═══════════════════════ */}
      <div className="content-box">
        <h3>
          <span className="notif-card-icon" style={{ color: "var(--orange)" }}>
            <Bell size={16} />
          </span>
          Recent Notifications
          <span className="notif-count-badge">{notifications.length}</span>

          {/* Delete All button */}
          {notifications.length > 0 && (
            <button
              className="icon-btn del"
              title="Delete All"
              onClick={() => setDeleteConfirm({ type: "all" })}
              style={{ marginLeft: "auto" }}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Refresh button */}
          <button
            className="icon-btn view"
            title="Refresh"
            onClick={() => fetchNotifications(page)}
            style={{ marginLeft: notifications.length > 0 ? "8px" : "auto" }}
            type="button"
          >
            <RefreshCw size={14} className={fetching ? "notif-spin-icon" : ""} />
          </button>
        </h3>

        <div className="tbl-wrap">
          {fetching ? (
            <div className="empty-state">
              <span className="notif-spinner" style={{ margin: "0 auto" }} />
              <p style={{ marginTop: 14 }}>Loading notifications…</p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: "65px" }}>Image</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div style={{ fontSize: "2rem" }}>🔔</div>
                        <p>No notifications sent yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => {
                    const notifImg = getNotifImage(n);
                    return (
                      <tr key={n._id} style={{ opacity: n.isRead ? 0.75 : 1, background: !n.isRead ? "rgba(255,255,255,0.02)" : "transparent" }}>
                        <td>
                          {notifImg ? (
                            <img
                              src={notifImg}
                              alt={n.title}
                              className="notif-tbl-img"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="notif-tbl-noimg">No img</div>
                          )}
                        </td>

                        <td>
                          <span className="notif-row-title" style={{ fontWeight: !n.isRead ? "bold" : "normal" }}>{n.title}</span>
                        </td>

                        <td>
                          <span
                            className="badge"
                            style={{
                              background: TYPE_COLORS[n.type]?.bg || TYPE_COLORS.GENERAL.bg,
                              color: TYPE_COLORS[n.type]?.color || TYPE_COLORS.GENERAL.color,
                            }}
                          >
                            {n.type || "GENERAL"}
                          </span>
                        </td>

                        <td>
                          <span className="notif-target">{resolveTarget(n)}</span>
                        </td>

                        <td>
                          <span className="notif-date">
                            {new Date(n.createdAt || n.sentAt).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </span>
                        </td>

                        <td>
                          <span className={`badge ${n.isRead ? "" : "badge-active"}`} style={{
                            background: n.isRead ? "rgba(100,116,139,0.15)" : "rgba(16, 185, 129, 0.15)",
                            color: n.isRead ? "#94a3b8" : "#10b981"
                          }}>
                            {n.isRead ? "Read" : "Unread"}
                          </span>
                        </td>

                        <td>
                          <div className="tbl-actions" style={{ justifyContent: "center" }}>
                            <button
                              className="icon-btn view"
                              title="View Details"
                              type="button"
                              onClick={() => handleView(n)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="icon-btn del"
                              title="Delete notification"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: "single", notif: n });
                              }}
                            >
                              <Trash2 size={15} style={{ pointerEvents: "none" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          {!fetching && totalPages > 1 && (
            <div className="pagination" style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
              <button
                className="btn"
                disabled={page <= 1}
                onClick={() => fetchNotifications(page - 1)}
              >
                Prev
              </button>
              <span style={{ display: "flex", alignItems: "center", fontSize: "0.9rem" }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn"
                disabled={page >= totalPages}
                onClick={() => fetchNotifications(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── View Detail Modal ── */}
      {viewNotif && (
        <div className="nd-overlay" onClick={() => setViewNotif(null)}>
          <div className="nd-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="nd-header">
              <div className="nd-header-icon">🔔</div>
              <div className="nd-header-text">
                <span className="nd-header-title">Notification Details</span>
                <span className="nd-header-sub">Admin Panel</span>
              </div>
              <button className="nd-close" onClick={() => setViewNotif(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="nd-body">

              {/* Hero: badge + title + date */}
              <div className="nd-hero">
                <span
                  className="nd-type-badge"
                  style={{
                    background: TYPE_COLORS[viewNotif.type]?.bg || TYPE_COLORS.GENERAL.bg,
                    color: TYPE_COLORS[viewNotif.type]?.color || TYPE_COLORS.GENERAL.color,
                  }}
                >
                  {viewNotif.type || "GENERAL"}
                </span>
                <h3 className="nd-title">{viewNotif.title}</h3>
                <p className="nd-date">
                  Sent on {new Date(viewNotif.createdAt || viewNotif.sentAt).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>

              {/* Message bubble */}
              <div className="nd-message">{viewNotif.message}</div>

              {/* Meta grid */}
              <div className="nd-meta-grid">
                <div className="nd-meta-item">
                  <span className="nd-meta-label">👥 Target User(s)</span>
                  <span className="nd-meta-value">{resolveTarget(viewNotif)}</span>
                </div>

                <div className="nd-meta-item">
                  <span className="nd-meta-label">📖 Read Status</span>
                  <span className={`nd-status-pill ${viewNotif.isRead ? "nd-status-read" : "nd-status-unread"}`}>
                    {viewNotif.isRead ? "✓ Read" : "● Unread"}
                  </span>
                </div>

                {getNotifImage(viewNotif) && (
                  <div className="nd-meta-item nd-meta-full">
                    <span className="nd-meta-label">🖼️ Image URL</span>
                    <a
                      href={getNotifImage(viewNotif)}
                      target="_blank"
                      rel="noreferrer"
                      className="nd-action-url"
                      style={{ wordBreak: "break-all" }}
                    >
                      {getNotifImage(viewNotif)}
                    </a>
                  </div>
                )}

                <div className="nd-meta-item nd-meta-full">
                  <span className="nd-meta-label">🔗 Action URL</span>
                  {getActionUrl(viewNotif) ? (
                    <a
                      href={getActionUrl(viewNotif)}
                      target="_blank"
                      rel="noreferrer"
                      className="nd-action-url"
                      style={{ wordBreak: "break-all" }}
                    >
                      {getActionUrl(viewNotif)}
                    </a>
                  ) : (
                    <span className="nd-meta-value" style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
                      None (No URL attached)
                    </span>
                  )}
                </div>

                {viewNotif.metadata?.contentType && (
                  <div className="nd-meta-item">
                    <span className="nd-meta-label">📌 Linked Content</span>
                    <span className="nd-meta-value nd-capitalize">{viewNotif.metadata.contentType}</span>
                  </div>
                )}
              </div>

              {/* Attached image */}
              {getNotifImage(viewNotif) && (
                <div className="nd-image-wrap">
                  <span className="nd-meta-label">🖼️ Attached Image</span>
                  <img
                    src={getNotifImage(viewNotif)}
                    alt="Notification attachment"
                    className="nd-preview-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="nd-footer">
              <button className="nd-close-btn" onClick={() => setViewNotif(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="nd-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="nd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="nd-header" style={{ background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.08))" }}>
              <div className="nd-header-icon">⚠️</div>
              <div className="nd-header-text">
                <span className="nd-header-title">Confirm Deletion</span>
                <span className="nd-header-sub">Action cannot be undone</span>
              </div>
              <button className="nd-close" onClick={() => setDeleteConfirm(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="nd-body" style={{ padding: "24px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "0.96rem", color: "var(--text)", margin: "0 0 10px 0", fontWeight: "600" }}>
                {deleteConfirm.type === "all"
                  ? "Are you sure you want to delete ALL notifications?"
                  : `Are you sure you want to delete "${deleteConfirm.notif?.title || "this notification"}"?`}
              </p>
              <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: 0 }}>
                This record will be permanently removed from the system.
              </p>
            </div>

            <div className="nd-footer" style={{ justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="nd-close-btn" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="nd-close-btn"
                style={{ background: "#ef4444", color: "#ffffff", borderColor: "#dc2626", fontWeight: "700" }}
                onClick={() => {
                  if (deleteConfirm.type === "all") {
                    handleDeleteAll();
                  } else {
                    handleDelete(deleteConfirm.notif._id);
                  }
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
