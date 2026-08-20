import { useEffect, useState } from "react";
import API from "../api/axios";
import {
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  IndianRupee,
  Loader,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import "./Subscription.css";
import "./SubscriptionLight.css";

const PAGE_SIZE = 10;

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [timeframe, setTimeframe] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [stats, setStats] = useState({
    todayCount: 0,
    todayUsers: 0,
    todayRevenue: 0,
    yesterdayCount: 0,
    yesterdayUsers: 0,
    yesterdayRevenue: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalSubscriptions: 0,
    limit: PAGE_SIZE,
  });

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/subscription/all", {
        params: {
          page,
          limit: PAGE_SIZE,
          search: search.trim(),
          status: status === "all" ? "" : status,
          timeframe: timeframe === "all" ? "" : timeframe,
        },
      });
      setSubs(res.data.subscriptions || []);
      setPagination(res.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalSubscriptions: 0,
        limit: PAGE_SIZE,
      });
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (error) {
      setSubs([]);
      alert(error.response?.data?.message || "Unable to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, [page, search, status, timeframe]);

  const handleCancel = async (subscription) => {
    if (!window.confirm(`Cancel the ${subscription.plan?.name || "selected"} subscription for ${subscription.user?.name || "this user"}?`)) {
      return;
    }

    setActionId(subscription._id);
    try {
      const res = await API.patch(`/admin/subscription/${subscription._id}/cancel`);
      alert(res.data.message || "Subscription cancelled successfully");
      fetchSubs();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to cancel subscription");
    } finally {
      setActionId("");
    }
  };

  const handleDeleteUser = async (subscription) => {
    if (!subscription.user?._id) {
      return alert("This user is no longer available.");
    }

    const userName = subscription.user.name || subscription.user.email || "this user";
    if (!window.confirm(`Delete ${userName}? This permanently deletes the user and all of their subscription records.`)) {
      return;
    }

    setActionId(subscription._id);
    try {
      const res = await API.delete(`/admin/users/${subscription.user._id}`);
      alert(res.data.message || "User deleted successfully");
      if (subs.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        fetchSubs();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Unable to delete user");
    } finally {
      setActionId("");
    }
  };

  const handleViewUser = async (subscription) => {
    if (!subscription.user?._id) {
      return alert("This user is no longer available.");
    }

    setDetailsLoading(true);
    setSelectedUser({ ...subscription.user, subscription });
    try {
      const res = await API.get(`/admin/users/${subscription.user._id}`);
      setSelectedUser({ ...res.data.user, subscription });
    } catch (error) {
      setSelectedUser(null);
      alert(error.response?.data?.message || "Unable to load user details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const handleStatCardClick = (targetTimeframe) => {
    setTimeframe((current) => (current === targetTimeframe ? "all" : targetTimeframe));
    setPage(1);
  };

  return (
    <div className="subscription-page">
      <div className="subscription-header">
        <div>
          <h2><CreditCard size={30} /> Subscriptions</h2>
          <p>Search, manage, and review subscriber access.</p>
        </div>
        <button className="subscription-refresh" onClick={fetchSubs} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Summary Stats Cards (Today / Yesterday / Total) */}
      <div className="subscription-stats-grid">
        <div
          className={`subscription-stat-card today ${timeframe === "today" ? "active" : ""}`}
          onClick={() => handleStatCardClick("today")}
          title="Click to filter subscriptions created Today (12:00 AM - 11:59 PM IST)"
        >
          <div className="subscription-stat-icon">
            <TrendingUp size={22} />
          </div>
          <div className="subscription-stat-info">
            <div className="subscription-stat-header">
              <span className="subscription-stat-title">Today (IST)</span>
              <span className="subscription-stat-badge">12 AM - 11:59 PM</span>
            </div>
            <div className="subscription-stat-values">
              <span className="subscription-stat-amount">₹{(stats.todayRevenue || 0).toLocaleString("en-IN")}</span>
              <span className="subscription-stat-users">
                <Users size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "3px" }} />
                {stats.todayCount || 0} subs ({stats.todayUsers || 0} users)
              </span>
            </div>
          </div>
        </div>

        <div
          className={`subscription-stat-card yesterday ${timeframe === "yesterday" ? "active" : ""}`}
          onClick={() => handleStatCardClick("yesterday")}
          title="Click to filter subscriptions created Yesterday (12:00 AM - 11:59 PM IST)"
        >
          <div className="subscription-stat-icon">
            <Calendar size={22} />
          </div>
          <div className="subscription-stat-info">
            <div className="subscription-stat-header">
              <span className="subscription-stat-title">Yesterday (IST)</span>
              <span className="subscription-stat-badge">12 AM - 11:59 PM</span>
            </div>
            <div className="subscription-stat-values">
              <span className="subscription-stat-amount">₹{(stats.yesterdayRevenue || 0).toLocaleString("en-IN")}</span>
              <span className="subscription-stat-users">
                <Users size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "3px" }} />
                {stats.yesterdayCount || 0} subs ({stats.yesterdayUsers || 0} users)
              </span>
            </div>
          </div>
        </div>

        <div
          className={`subscription-stat-card total ${timeframe === "all" ? "active" : ""}`}
          onClick={() => handleStatCardClick("all")}
          title="Click to view all subscriptions"
        >
          <div className="subscription-stat-icon">
            <IndianRupee size={22} />
          </div>
          <div className="subscription-stat-info">
            <div className="subscription-stat-header">
              <span className="subscription-stat-title">Total Revenue</span>
              <span className="subscription-stat-badge">All Time</span>
            </div>
            <div className="subscription-stat-values">
              <span className="subscription-stat-amount">₹{(stats.totalRevenue || 0).toLocaleString("en-IN")}</span>
              <span className="subscription-stat-users">
                <Users size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "3px" }} />
                {stats.totalSubscriptions || 0} subs
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="subscription-toolbar">
        <label className="subscription-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search by user name, email, or number..."
            value={search}
            onChange={updateFilter(setSearch)}
          />
        </label>
        <select
          value={timeframe}
          onChange={updateFilter(setTimeframe)}
          aria-label="Filter subscriptions by date"
          className="subscription-timeframe-select"
        >
          <option value="all">All Dates</option>
          <option value="today">Today (12am - 11:59pm IST)</option>
          <option value="yesterday">Yesterday (12am - 11:59pm IST)</option>
        </select>
        <select
          value={status}
          onChange={updateFilter(setStatus)}
          aria-label="Filter subscriptions by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="subscription-table-wrap">
        <table className="subscription-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="subscription-empty"><Loader size={20} className="spin" /> Loading subscriptions...</td></tr>
            ) : subs.length === 0 ? (
              <tr><td colSpan={6} className="subscription-empty">No subscriptions found.</td></tr>
            ) : subs.map((sub) => {
              const isActive = sub.status === "active" && new Date(sub.endDate) > new Date();
              const displayStatus = isActive ? "Active" : sub.status === "cancelled" ? "Cancelled" : "Expired";
              const busy = actionId === sub._id;

              return (
                <tr key={sub._id}>
                  <td className="subscription-user">
                    <div>{sub.user?.name || "Deleted user"}</div>
                    {sub.user?.phone && (
                      <div className="subscription-user-phone">
                        {sub.user.phone}
                      </div>
                    )}
                  </td>
                  <td className="plan">{sub.plan?.name || "—"}</td>
                  <td><span className={`status ${displayStatus.toLowerCase()}`}>{displayStatus}</span></td>
                  <td>₹{sub.amount || 0}</td>
                  <td>{sub.endDate ? new Date(sub.endDate).toLocaleDateString("en-IN") : "—"}</td>
                  <td>
                    <div className="subscription-actions">
                      <button
                        className="subscription-action view"
                        onClick={() => handleViewUser(sub)}
                        disabled={!sub.user?._id || busy}
                        title="View user details"
                      >
                        <Eye size={15} /> 
                      </button>
                      <button
                        className="subscription-action cancel"
                        onClick={() => handleCancel(sub)}
                        disabled={!isActive || busy}
                        title={isActive ? "Cancel subscription" : "Only active subscriptions can be cancelled"}
                      >
                        <Ban size={15} /> Cancel
                      </button>
                      <button
                        className="subscription-action delete"
                        onClick={() => handleDeleteUser(sub)}
                        disabled={!sub.user?._id || busy}
                        title="Delete user and their subscriptions"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && pagination.totalSubscriptions > 0 && (
        <div className="subscription-pagination">
          <span>Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalSubscriptions} subscriptions</span>
          <div>
            <button onClick={() => setPage((currentPage) => currentPage - 1)} disabled={pagination.currentPage === 1}>
              <ChevronLeft size={16} /> Previous
            </button>
            <button onClick={() => setPage((currentPage) => currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="subscription-details-overlay" onClick={() => setSelectedUser(null)}>
          <div className="subscription-details-modal" onClick={(event) => event.stopPropagation()}>
            <div className="subscription-details-header">
              <h3><User size={20} /> User Details</h3>
              <button onClick={() => setSelectedUser(null)} aria-label="Close user details"><X size={20} /></button>
            </div>
            {detailsLoading ? (
              <div className="subscription-details-loading"><Loader size={22} className="spin" /> Loading details...</div>
            ) : (
              <div className="subscription-details-content">
                <div className="subscription-user-avatar">{selectedUser.name?.[0]?.toUpperCase() || "U"}</div>
                <h4>{selectedUser.name || "Unknown user"}</h4>
                <dl>
                  <div><dt>Email</dt><dd>{selectedUser.email || "—"}</dd></div>
                  <div><dt>Phone</dt><dd>{selectedUser.phone || "—"}</dd></div>
                  <div><dt>Plan</dt><dd>{selectedUser.subscription?.plan?.name || "—"}</dd></div>
                  <div><dt>Subscription status</dt><dd>{selectedUser.subscription?.status || "—"}</dd></div>
                  <div><dt>Member since</dt><dd>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("en-IN") : "—"}</dd></div>
                </dl>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
