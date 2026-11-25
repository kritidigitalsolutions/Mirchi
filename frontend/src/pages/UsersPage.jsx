import { useCallback, useEffect, useRef, useState } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Users, RefreshCw, User, CheckCircle, AlertCircle, Search, Loader, Eye, Trash2, X, ChevronLeft, ChevronRight, Lock, Unlock, Radio } from "lucide-react";
import { daysLeft, formatDate, formatDateTime, sourceLabel } from "../utils/subscriptionFormat";
import "./Dashboard.css";
import "./UsersPage.css";
import { fmtDate, fmtTime } from "../utils/tableFormat";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [subHistory, setSubHistory] = useState([]);
  const [subHistoryLoading, setSubHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0, limit: 10 });
  const [stats, setStats] = useState({ activeUsers: 0, blockedUsers: 0, onlineUsers: 0 });

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const ts = d.getTime();
    if (!Number.isFinite(ts)) return "";
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get("/admin/users", {
        params: { page, limit: 10, search: search.trim(), status: statusFilter },
      });
      setUsers(res.data.users || []);
      setPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalUsers: 0, limit: 10 });
      setStats((prev) => ({
        ...prev,
        ...(res.data.stats || { activeUsers: 0, blockedUsers: 0 }),
      }));
    } catch {
      if (!silent) {
        setUsers([]);
        setPagination({ currentPage: 1, totalPages: 1, totalUsers: 0, limit: 10 });
        setStats((prev) => ({ ...prev, activeUsers: 0, blockedUsers: 0 }));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const lastOnlineCountRef = useRef(null);

  // Real-time online users subscription (SSE + silent table refresh every 5s)
  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let abortController = null;

    const refreshTableSilently = () => {
      if (!document.hidden && !cancelled) {
        fetchUsers(true);
      }
    };

    const tableRefreshTimer = setInterval(refreshTableSilently, 5000);

    const fetchOnlineCount = async () => {
      if (document.hidden || cancelled) return;
      try {
        const res = await API.get("/admin/users/online-count");
        if (!cancelled && typeof res.data?.onlineUsers === "number") {
          setStats((prev) => ({ ...prev, onlineUsers: res.data.onlineUsers }));
        }
      } catch {
        // Ignore transient polling errors
      }
    };

    const startPolling = () => {
      if (pollTimer || cancelled) return;
      fetchOnlineCount();
      pollTimer = setInterval(fetchOnlineCount, 5000);
    };

    const connectStream = async () => {
      const token = localStorage.getItem("token");
      if (!token || typeof ReadableStream === "undefined") {
        startPolling();
        return;
      }

      abortController = new AbortController();
      try {
        const response = await fetch(`${API_BASE_URL}/admin/users/online-stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          startPolling();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const evt of events) {
            const line = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(5).trim());
              if (typeof payload.onlineUsers === "number") {
                setStats((prev) => ({ ...prev, onlineUsers: payload.onlineUsers }));
                if (lastOnlineCountRef.current !== null && lastOnlineCountRef.current !== payload.onlineUsers) {
                  refreshTableSilently();
                }
                lastOnlineCountRef.current = payload.onlineUsers;
              }
            } catch {
              // Ignore malformed SSE chunk
            }
          }
        }

        if (!cancelled) startPolling();
      } catch {
        if (!cancelled) startPolling();
      }
    };

    connectStream();

    return () => {
      cancelled = true;
      abortController?.abort();
      clearInterval(tableRefreshTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [fetchUsers]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setSelected(null);
      if (users.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        fetchUsers();
      }
    } catch { alert("Failed to delete"); }
  };

  const handleToggleBlock = async (id) => {
    try {
      const res = await API.patch(`/admin/users/${id}/block`);
      setUsers(p => p.map(u => u._id === id ? { ...res.data.user, latestSubscription: u.latestSubscription } : u));
      if (selected?._id === id) setSelected((current) => ({ ...res.data.user, latestSubscription: current?.latestSubscription }));
    } catch { alert("Failed to update status"); }
  };

  const openUser = async (user) => {
    setSelected(user);
    setSubHistory([]);
    setSubHistoryLoading(true);
    try {
      const res = await API.get(`/admin/users/${user._id}`);
      setSubHistory(res.data.subscriptions || []);
    } catch {
      setSubHistory([]);
    } finally {
      setSubHistoryLoading(false);
    }
  };

  const subStatusBadge = (status) =>
    status === "active" ? "badge-active" : "badge-blocked";

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Users size={28} style={{ display: "inline-block", marginRight: 8 }} /> User Management</h1>
          <p className="pg-sub">View, search, and manage all platform users</p>
        </div>
        <button className="btn btn-primary" onClick={fetchUsers}><RefreshCw size={16} style={{ display: "inline-block", marginRight: 6 }} /> Refresh</button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div
          className={`stat-card s-green ${statusFilter === "all" ? "active-filter" : ""}`}
          onClick={() => { setStatusFilter("all"); setPage(1); }}
          style={{ cursor: "pointer" }}
        >
          <div className="stat-icon"><User size={24} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.activeUsers + stats.blockedUsers || pagination.totalUsers}</div>
        </div>
        <div
          className={`stat-card s-blue ${statusFilter === "active" ? "active-filter" : ""}`}
          onClick={() => { setStatusFilter("active"); setPage(1); }}
          style={{ cursor: "pointer" }}
        >
          <div className="stat-icon"><CheckCircle size={24} /></div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{stats.activeUsers}</div>
        </div>
        <div
          className={`stat-card s-red ${statusFilter === "blocked" ? "active-filter" : ""}`}
          onClick={() => { setStatusFilter("blocked"); setPage(1); }}
          style={{ cursor: "pointer" }}
        >
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-label">Blocked</div>
          <div className="stat-value">{stats.blockedUsers}</div>
        </div>
        <div
          className={`stat-card s-orange ${statusFilter === "online" ? "active-filter" : ""}`}
          onClick={() => { setStatusFilter("online"); setPage(1); }}
          style={{ cursor: "pointer" }}
          title="Users active on the app within the last 2 minutes"
        >
          <div className="stat-icon"><Radio size={24} /></div>
          <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Online Now
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.25)",
              }}
            />
          </div>
          <div className="stat-value">{stats.onlineUsers ?? 0}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="content-box">
        <div className="search-row" style={{ marginBottom: 20 }}>
          <div className="search-field">
            <Search size={18} />
            <input placeholder="Search by name, email, or number..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Statuses</option>
            <option value="online">Online Now</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state"><p><Loader size={20} style={{ display: "inline-block", marginRight: 8 }} /> Loading users...</p></div>
        ) : (
          <div className="tbl-wrap users-tbl-wrap">
            <table className="tbl users-tbl">
              <colgroup>
                <col style={{ width: "46px" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="col-index">#</th>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Joined</th>
                  <th>Subscription</th>
                  <th className="col-center">Status</th>
                  <th className="col-center">Online</th>
                  <th className="col-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} className="tbl-empty">No users found</td></tr>
                ) : users.map((u, i) => (
                  <tr key={u._id || i}>
                    <td className="col-index">
                      {(pagination.currentPage - 1) * pagination.limit + i + 1}
                    </td>
                    <td>
                      <div className="users-user-cell">
                        <div className="users-avatar-wrap">
                          <div className="users-avatar">
                            {u.profileImage ? (
                              <img src={getImageUrl(u.profileImage)} alt={u.name || "User"} />
                            ) : (
                              u.name ? u.name[0].toUpperCase() : "U"
                            )}
                          </div>
                          {u.isOnline && (
                            <span className="users-avatar-dot" title="Online now" />
                          )}
                        </div>
                        <div className="users-user-info">
                          <span className="users-user-name" title={u.name || "Unknown"}>
                            {u.name || "Unknown"}
                          </span>
                          <span className="users-user-phone">
                            {u.phone || "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="users-contact-cell">
                        <span className="users-contact-email" title={u.email || "No email"}>
                          {u.email || "—"}
                        </span>
                        <div className="users-contact-auth">
                          <span className={`auth-pill ${u.authProvider === "GOOGLE" ? "google" : u.authProvider === "APPLE" ? "apple" : "phone"}`}>
                            {u.authProvider === "GOOGLE" ? "Google login" : u.authProvider === "APPLE" ? "Apple login" : "Phone login"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="users-joined-cell">
                        <span className="users-joined-date">{fmtDate(u.createdAt)}</span>
                        <span className="users-joined-time">{fmtTime(u.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="users-sub-cell">
                        {u.latestSubscription ? (
                          <>
                            <div className="users-sub-plan" title={u.latestSubscription.planName}>
                              <span>{u.latestSubscription.planName || "Plan"}</span>
                              <span className={`sub-status-dot ${u.latestSubscription.status}`} title={u.latestSubscription.status} />
                            </div>
                            <div className="users-sub-date">Claimed {formatDate(u.latestSubscription.startDate)}</div>
                          </>
                        ) : (
                          <>
                            <div className="users-sub-plan muted">No plan</div>
                            <div className="users-sub-date">Never subscribed</div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="col-center">
                      <span className={`users-status-badge ${u.isBlocked ? "blocked" : "active"}`}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="col-center">
                      <div className="users-activity-cell">
                        <span className={`users-activity-badge ${u.isOnline ? "online" : "offline"}`}>
                          <span className="activity-dot" />
                          {u.isOnline ? "Online" : "Offline"}
                        </span>
                        {!u.isOnline && (
                          <span className="users-activity-time">
                            {u.lastActiveAt ? formatRelativeTime(u.lastActiveAt) : "Inactive"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="col-center">
                      <div className="users-actions-cell">
                        <button
                          type="button"
                          className="icon-btn view"
                          onClick={() => openUser(u)}
                          title="View Profile"
                          aria-label="View user profile"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={`icon-btn ${u.isBlocked ? "unblock" : "block"}`}
                          onClick={() => handleToggleBlock(u._id)}
                          title={u.isBlocked ? "Unblock User" : "Block User"}
                          aria-label={u.isBlocked ? "Unblock user" : "Block user"}
                        >
                          {u.isBlocked ? <Unlock size={15} /> : <Lock size={15} />}
                        </button>
                        <button
                          type="button"
                          className="icon-btn del"
                          onClick={() => handleDelete(u._id)}
                          title="Delete User"
                          aria-label="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.totalUsers > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalUsers} users
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setPage((currentPage) => currentPage - 1)} disabled={pagination.currentPage === 1}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button className="btn btn-ghost" onClick={() => setPage((currentPage) => currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8 }} /> User Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>

            <div className="modal-body p-0">
              {/* Profile Hero */}
              <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                  <div className="u-avatar large">
                    {selected.profileImage ? (
                      <img src={getImageUrl(selected.profileImage)} alt={selected.name} />
                    ) : (
                      selected.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="profile-hero-text">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ margin: 0 }}>{selected.name || "Unknown User"}</h2>
                      {selected.profileComplete && (
                        <span className="badge badge-active" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>✓ VERIFIED</span>
                      )}
                    </div>
                    <p>{selected.email}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className={`badge ${selected.isBlocked ? "badge-blocked" : "badge-active"}`}>
                        {selected.isBlocked ? "BLOCKED" : "ACTIVE ACCOUNT"}
                      </span>
                      {selected.isOnline && (
                        <span className="badge badge-active" style={{ backgroundColor: "rgba(16, 185, 129, 0.16)", color: "#10b981" }}>
                          ● ONLINE NOW
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Full Name</span>
                  <span className="p-detail-value">{selected.name || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Phone Number</span>
                  <span className="p-detail-value mono">{selected.phone || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Email Address</span>
                  <span className="p-detail-value">{selected.email || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Profile Status</span>
                  <span className={`p-detail-value ${selected.profileComplete ? "text-success" : "text-warning"}`}>
                    {selected.profileComplete ? "Complete" : "Incomplete"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account ID</span>
                  <span className="p-detail-value mono">{selected._id}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Member Since</span>
                  <span className="p-detail-value">
                    {selected.createdAt?.$date
                      ? new Date(selected.createdAt.$date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                      : selected.createdAt
                        ? new Date(selected.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                        : "—"}
                  </span>
                </div>
              </div>

              {/* Subscription History */}
              <div className="user-sub-history">
                <h4>Subscription History</h4>
                {subHistoryLoading ? (
                  <p className="user-sub-empty"><Loader size={16} style={{ display: "inline-block", marginRight: 6 }} /> Loading...</p>
                ) : subHistory.length === 0 ? (
                  <p className="user-sub-empty">No subscriptions yet.</p>
                ) : (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Paid</th>
                          <th>Claimed On</th>
                          <th>Expires</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subHistory.map((sub) => {
                          const remaining = sub.status === "active" ? daysLeft(sub.endDate) : null;
                          return (
                            <tr key={sub._id}>
                              <td>{sub.plan?.name || "—"}</td>
                              <td>
                                ₹{sub.amount || 0}
                                <div className="user-sub-date">{sourceLabel(sub.source)}</div>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {formatDate(sub.startDate)}
                                <div className="user-sub-date">{formatDateTime(sub.startDate).split(", ").pop()}</div>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {formatDate(sub.endDate)}
                                {remaining !== null && <div className="user-sub-date">{remaining} days left</div>}
                              </td>
                              <td><span className={`badge ${subStatusBadge(sub.status)}`}>{sub.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setSelected(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
