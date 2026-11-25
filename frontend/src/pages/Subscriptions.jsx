import { useEffect, useState, useCallback } from "react";
import API from "../api/axios";
import {
  Ban,
  BarChart2,
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { daysLeft, formatDate, formatDateTime, sourceLabel } from "../utils/subscriptionFormat";
import "./Subscription.css";
import "./SubscriptionLight.css";

const PAGE_SIZE = 10;

// Chart range options
const CHART_RANGES = [
  { value: "today", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

// ── Custom Tooltip ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, metric, chartRange }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload || {};
  const isRevenue = metric === "revenue";

  // Format the label nicely
  const formatLabel = (l) => {
    if (!l) return "";
    if (chartRange === "today") {
      // "2026-11-25 14:00" → "2:00 PM"
      const timePart = l.split(" ")[1] || l;
      const [h, m] = timePart.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    }
    if (chartRange === "year") {
      // "2026-09" → "Sep 2026"
      const [y, mo] = l.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[parseInt(mo, 10) - 1]} ${y}`;
    }
    // "2026-11-25" → "25 Nov"
    const parts = l.split("-");
    if (parts.length === 3) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]}`;
    }
    return l;
  };

  return (
    <div className="sub-chart-tooltip">
      <div className="sub-chart-tooltip-label">{formatLabel(label)}</div>
      <div className="sub-chart-tooltip-rows">
        <div className="sub-chart-tooltip-row">
          <span className="sub-chart-tooltip-dot" style={{ background: isRevenue ? "#10b981" : "#a855f7" }} />
          <span className="sub-chart-tooltip-key">{isRevenue ? "Revenue" : "Subscribers"}</span>
          <span className="sub-chart-tooltip-val">
            {isRevenue
              ? `₹${(data.revenue || 0).toLocaleString("en-IN")}`
              : (data.subscribers || 0).toLocaleString("en-IN")}
          </span>
        </div>
        {!isRevenue && data.revenue > 0 && (
          <div className="sub-chart-tooltip-row sub-chart-tooltip-row--secondary">
            <span className="sub-chart-tooltip-dot" style={{ background: "#10b981" }} />
            <span className="sub-chart-tooltip-key">Revenue</span>
            <span className="sub-chart-tooltip-val">₹{(data.revenue || 0).toLocaleString("en-IN")}</span>
          </div>
        )}
        {data.uniqueUsers > 0 && !isRevenue && (
          <div className="sub-chart-tooltip-row sub-chart-tooltip-row--secondary">
            <span className="sub-chart-tooltip-dot" style={{ background: "#60a5fa" }} />
            <span className="sub-chart-tooltip-key">Unique users</span>
            <span className="sub-chart-tooltip-val">{data.uniqueUsers}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// "Ended today" / "Ended 3 days ago"
const endedAgo = (endDate) => {
  if (!endDate) return "";
  const days = Math.floor((Date.now() - new Date(endDate).getTime()) / 86400000);
  if (days <= 0) return "Ended today";
  return `Ended ${days} day${days === 1 ? "" : "s"} ago`;
};

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [timeframe, setTimeframe] = useState("all");
  const [claimedFrom, setClaimedFrom] = useState("");
  const [claimedTo, setClaimedTo] = useState("");
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

  // --- Chart state ---
  const [chartRange, setChartRange] = useState("week");
  const [chartData, setChartData] = useState([]);
  const [chartSummary, setChartSummary] = useState({ totalSubscribers: 0, totalRevenue: 0 });
  const [chartLoading, setChartLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState("subscribers"); // "subscribers" | "revenue"

  const fetchChart = useCallback(async (range) => {
    setChartLoading(true);
    try {
      const res = await API.get("/admin/subscription/chart", { params: { range } });
      setChartData(res.data.chartData || []);
      setChartSummary(res.data.summary || { totalSubscribers: 0, totalRevenue: 0 });
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChart(chartRange);
  }, [chartRange, fetchChart]);

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
          from: claimedFrom,
          to: claimedTo,
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
  }, [page, search, status, timeframe, claimedFrom, claimedTo]);

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
        <button className="btn btn-ghost" onClick={fetchSubs} disabled={loading}>
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

      {/* ── Subscriber Growth Chart ───────────────────────────── */}
      <div className="sub-chart-card">
        {/* Header */}
        <div className="sub-chart-header">
          <div className="sub-chart-title-group">
            <div className="sub-chart-icon">
              <BarChart2 size={18} />
            </div>
            <div>
              <div className="sub-chart-title">Subscriber Growth</div>
              <div className="sub-chart-subtitle">
                {CHART_RANGES.find((r) => r.value === chartRange)?.label} overview
              </div>
            </div>
          </div>

          {/* KPI pills */}
          <div className="sub-chart-kpis">
            <div className={`sub-chart-kpi ${chartMetric === "subscribers" ? "sub-chart-kpi--active-purple" : ""}`}
              onClick={() => setChartMetric("subscribers")} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setChartMetric("subscribers")}>
              <span className="sub-chart-kpi-dot sub-chart-kpi-dot--purple" />
              <span className="sub-chart-kpi-label">Subscribers</span>
              <span className="sub-chart-kpi-val">
                {chartLoading ? "—" : chartSummary.totalSubscribers.toLocaleString("en-IN")}
              </span>
            </div>
            <div className={`sub-chart-kpi ${chartMetric === "revenue" ? "sub-chart-kpi--active-green" : ""}`}
              onClick={() => setChartMetric("revenue")} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setChartMetric("revenue")}>
              <span className="sub-chart-kpi-dot sub-chart-kpi-dot--green" />
              <span className="sub-chart-kpi-label">Revenue</span>
              <span className="sub-chart-kpi-val">
                {chartLoading ? "—" : `₹${chartSummary.totalRevenue.toLocaleString("en-IN")}`}
              </span>
            </div>
          </div>

          {/* Range pills */}
          <div className="sub-chart-range-toggle">
            {CHART_RANGES.map((r) => (
              <button
                key={r.value}
                className={chartRange === r.value ? "active" : ""}
                onClick={() => setChartRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart body */}
        <div className="sub-chart-body">
          {chartLoading ? (
            <div className="sub-chart-loading">
              <div className="sub-chart-skeleton">
                {[65, 40, 80, 55, 90, 70, 85, 60, 75, 50, 95, 65].map((h, i) => (
                  <div key={i} className="sub-chart-skeleton-bar" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="sub-chart-loading-label">
                <Loader size={16} className="spin" /> Loading…
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="sub-chart-empty">
              <BarChart2 size={36} strokeWidth={1.5} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No data for this period</div>
                <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>Try a different time range</div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={chartData}
                margin={{ top: 16, right: 24, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="subGradFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="60%" stopColor="#a855f7" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revGradFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  {/* Glow filter for the stroke line */}
                  <filter id="lineGlowPurple" x="-20%" y="-80%" width="140%" height="260%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="lineGlowGreen" x="-20%" y="-80%" width="140%" height="260%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="rgba(148,163,184,0.07)"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{ fill: "#475569", fontSize: 11, fontFamily: "inherit" }}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => {
                    if (!v) return "";
                    if (chartRange === "today") {
                      const timePart = v.split(" ")[1] || v;
                      const [h] = timePart.split(":").map(Number);
                      const ampm = h >= 12 ? "pm" : "am";
                      return `${h % 12 || 12}${ampm}`;
                    }
                    if (chartRange === "year") {
                      const [, mo] = v.split("-");
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      return months[parseInt(mo, 10) - 1] || v;
                    }
                    const parts = v.split("-");
                    if (parts.length === 3) return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
                    return v;
                  }}
                />

                <YAxis
                  tick={{ fill: "#475569", fontSize: 11, fontFamily: "inherit" }}
                  tickLine={false}
                  axisLine={false}
                  dx={-4}
                  tickFormatter={(v) => {
                    if (chartMetric === "revenue") {
                      if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                      if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
                      return `₹${v}`;
                    }
                    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
                    return v;
                  }}
                  width={chartMetric === "revenue" ? 62 : 38}
                />

                <Tooltip
                  content={
                    <ChartTooltip metric={chartMetric} chartRange={chartRange} />
                  }
                  cursor={{
                    stroke: chartMetric === "revenue" ? "#10b981" : "#a855f7",
                    strokeWidth: 1,
                    strokeDasharray: "4 3",
                    strokeOpacity: 0.5,
                  }}
                  animationDuration={150}
                  isAnimationActive={true}
                />

                {chartMetric === "subscribers" ? (
                  <Area
                    type="monotoneX"
                    dataKey="subscribers"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    fill="url(#subGradFill)"
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: "#a855f7",
                      stroke: "#1e1040",
                      strokeWidth: 2.5,
                      filter: "url(#lineGlowPurple)",
                    }}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-out"
                  />
                ) : (
                  <Area
                    type="monotoneX"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#revGradFill)"
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: "#10b981",
                      stroke: "#062a1c",
                      strokeWidth: 2.5,
                      filter: "url(#lineGlowGreen)",
                    }}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-out"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
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
        <div className="subscription-claimed-range" title="Filter by the date the subscription was claimed (IST)">
          <span>Claimed</span>
          <input
            type="date"
            value={claimedFrom}
            max={claimedTo || undefined}
            onChange={updateFilter(setClaimedFrom)}
            aria-label="Claimed from date"
          />
          <span>to</span>
          <input
            type="date"
            value={claimedTo}
            min={claimedFrom || undefined}
            onChange={updateFilter(setClaimedTo)}
            aria-label="Claimed to date"
          />
          {(claimedFrom || claimedTo) && (
            <button
              type="button"
              onClick={() => { setClaimedFrom(""); setClaimedTo(""); setPage(1); }}
              aria-label="Clear claimed date filter"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="subscription-table-wrap">
        <table className="subscription-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th className="sub-num">Amount</th>
              <th>Claimed On</th>
              <th>Expires</th>
              <th className="sub-actions-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="subscription-empty"><Loader size={20} className="spin" /> Loading subscriptions...</td></tr>
            ) : subs.length === 0 ? (
              <tr><td colSpan={7} className="subscription-empty">No subscriptions found.</td></tr>
            ) : subs.map((sub) => {
              const isActive = sub.status === "active" && new Date(sub.endDate) > new Date();
              const displayStatus = isActive ? "Active" : sub.status === "cancelled" ? "Cancelled" : "Expired";
              const busy = actionId === sub._id;
              const remaining = isActive ? daysLeft(sub.endDate) : null;

              const claimed = sub.startDate ? new Date(sub.startDate) : null;
              const duration = sub.plan?.duration;

              return (
                <tr key={sub._id}>
                  <td>
                    <div className="sub-main sub-user-name" title={sub.user?.name || ""}>{sub.user?.name || "Deleted user"}</div>
                    <div className="sub-meta">{sub.user?.phone || sub.user?.email || "—"}</div>
                  </td>
                  <td>
                    <div className="sub-main sub-plan-name">{sub.plan?.name || "—"}</div>
                    <div className="sub-meta">{duration ? `${duration} day${duration === 1 ? "" : "s"}` : "—"}</div>
                  </td>
                  <td><span className={`status ${displayStatus.toLowerCase()}`}>{displayStatus}</span></td>
                  <td className="sub-num">
                    <div className="sub-main">₹{(sub.amount || 0).toLocaleString("en-IN")}</div>
                    <div className={`sub-meta sub-source ${sub.source || ""}`}>{sourceLabel(sub.source)}</div>
                  </td>
                  <td>
                    <div className="sub-main">{formatDate(claimed)}</div>
                    <div className="sub-meta">
                      {claimed ? claimed.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : ""}
                    </div>
                  </td>
                  <td>
                    <div className="sub-main">{formatDate(sub.endDate)}</div>
                    <div className={`sub-meta ${remaining !== null && remaining <= 3 ? "sub-urgent" : ""}`}>
                      {remaining !== null
                        ? `${remaining} day${remaining === 1 ? "" : "s"} left`
                        : sub.status === "cancelled"
                          ? "Cancelled early"
                          : endedAgo(sub.endDate)}
                    </div>
                  </td>
                  <td>
                    <div className="subscription-actions">
                      <button
                        className="icon-btn view"
                        onClick={() => handleViewUser(sub)}
                        disabled={!sub.user?._id || busy}
                        title="View user details"
                        aria-label="View user details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="icon-btn edit"
                        onClick={() => handleCancel(sub)}
                        disabled={!isActive || busy}
                        title={isActive ? "Cancel subscription" : "Only active subscriptions can be cancelled"}
                        aria-label="Cancel subscription"
                      >
                        <Ban size={15} />
                      </button>
                      <button
                        className="icon-btn del"
                        onClick={() => handleDeleteUser(sub)}
                        disabled={!sub.user?._id || busy}
                        title="Delete user and their subscriptions"
                        aria-label="Delete user"
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
                  <div><dt>Claimed on</dt><dd>{formatDateTime(selectedUser.subscription?.startDate)}</dd></div>
                  <div><dt>Expires on</dt><dd>{formatDate(selectedUser.subscription?.endDate)}</dd></div>
                  <div><dt>Amount paid</dt><dd>₹{selectedUser.subscription?.amount || 0} · {sourceLabel(selectedUser.subscription?.source)}</dd></div>
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
