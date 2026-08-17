import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";
import {
  BarChart3,
  Users,
  Film,
  Radio,
  TrendingUp, RefreshCw,
  BadgeCheck,
  UserX,
  Clock3,
  Sun,
  CalendarDays,
  CalendarRange,
  Calendar,
  CalendarClock,
  Wallet
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";

// const GROWTH = growthData;

const COLORS = ["#e50914", "#3b82f6", "#10b981", "#f59e0b"];

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ch-tooltip">
      <p className="ch-tooltip-label">{label}</p>
      <p className="ch-tooltip-val">{payload[0].value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [subscriptionStats, setSubscriptionStats] = useState({
    totalSubscribedUsers: 0,
    totalNotSubscribedUsers: 0,
    expirySubscriptionCount: 0,
  });
  const [registrationStats, setRegistrationStats] = useState({
    todayRegistration: 0,
    yesterdayRegistration: 0,
    totalRegistration: 0,
  });
  const [incomeStats, setIncomeStats] = useState({
    todayIncome: 0,
    yesterdayIncome: 0,
    weeklyIncome: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    totalIncome: 0,
  });

  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState([]);

  const GROWTH = growthData.length ? growthData : [];

  const [contentStats, setContentStats] = useState([]);
  const PIE = contentStats.length ? contentStats : [];

  // Retrieve permissions and roles for permission-based rendering
  const adminRole = localStorage.getItem("adminRole") || "ADMIN";
  const permissions = JSON.parse(localStorage.getItem("adminPermissions") || "[]");

  const hasPermission = (permissionId) => {
    if (adminRole === "ADMIN") return true;
    return permissions.some((p) => {
      if (p === permissionId || p === "content") return true;
      if (
        permissionId === "content" &&
        ["movies", "series", "shortdrama", "categories"].some((sub) => p === sub || p.startsWith(`${sub}.`))
      ) {
        return true;
      }
      return p.startsWith(`${permissionId}.`);
    });
  };

  const canAccessUsers = hasPermission("users");
  const canAccessContent = hasPermission("content");
  const canAccessPricing = hasPermission("pricing");

  // Registration totals are calculated on the server using its current day.
  // Refresh this independently so an open Dashboard rolls into the new day
  // without requiring the admin to reload the page.
  async function fetchRegistrationStats() {
    if (!canAccessUsers) return;

    try {
      const response = await API.get("/admin/user/registration-stats");
      if (response?.data) {
        setRegistrationStats(response.data.data || {
          todayRegistration: 0,
          yesterdayRegistration: 0,
          totalRegistration: 0,
        });
      }
    } catch (err) {
      console.log("Registration stats refresh error:", err);
    }
  }

  // Fetch data safely and robustly
  async function fetchData() {
    setLoading(true);
    try {
      const promises = [
        canAccessUsers ? API.get("/admin/users") : Promise.resolve(null),
        canAccessContent ? API.get("/admin/content/stats") : Promise.resolve(null),
        canAccessUsers ? API.get("/admin/user/growth") : Promise.resolve(null),
        canAccessPricing ? API.get("/admin/subscription/stats") : Promise.resolve(null),
        canAccessPricing ? API.get("/admin/subscription/income-stats") : Promise.resolve(null),
        canAccessUsers ? API.get("/admin/user/registration-stats") : Promise.resolve(null),
      ];

      const results = await Promise.allSettled(promises);
      const [uRes, sRes, gRes, subStatsRes, incomeStatsRes, regStatsRes] = results;

      if (uRes.status === "fulfilled" && uRes.value && uRes.value.data) {
        const uData = uRes.value.data;
        setUsers(uData?.users || uData?.data || uData || []);
        setTotalUsers(uData?.count || uData?.pagination?.totalUsers || 0);
        setActiveUsersCount(uData?.stats?.activeUsers || 0);
      }

      if (sRes.status === "fulfilled" && sRes.value && sRes.value.data) {
        const sData = sRes.value.data;
        const fetchedStats = sData?.data || (sData?.stats ? [
          { name: "Movies", value: sData.stats.movies || 0 },
          { name: "Series", value: sData.stats.series || 0 },
        ] : []);
        setContentStats(fetchedStats);
      }

      if (gRes.status === "fulfilled" && gRes.value && gRes.value.data) {
        setGrowthData(gRes.value.data.data || []);
      }

      if (subStatsRes.status === "fulfilled" && subStatsRes.value && subStatsRes.value.data) {
        setSubscriptionStats(subStatsRes.value.data.data || {
          totalSubscribedUsers: 0,
          totalNotSubscribedUsers: 0,
          expirySubscriptionCount: 0,
        });
      }

      if (incomeStatsRes.status === "fulfilled" && incomeStatsRes.value && incomeStatsRes.value.data) {
        setIncomeStats(incomeStatsRes.value.data.data || {
          todayIncome: 0,
          yesterdayIncome: 0,
          weeklyIncome: 0,
          monthlyIncome: 0,
          yearlyIncome: 0,
          totalIncome: 0,
        });
      }

      if (regStatsRes.status === "fulfilled" && regStatsRes.value && regStatsRes.value.data) {
        setRegistrationStats(regStatsRes.value.data.data || {
          todayRegistration: 0,
          yesterdayRegistration: 0,
          totalRegistration: 0,
        });
      }
    } catch (err) {
      console.log("Dashboard fetch error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    // Re-check the server's 12:00 AM–11:59:59 PM window every minute.
    // This makes the card update within one minute of the server's new day.
    const registrationRefresh = window.setInterval(fetchRegistrationStats, 60_000);
    return () => window.clearInterval(registrationRefresh);
  }, []);

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const totalContent = Array.isArray(contentStats)
    ? contentStats.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
    : 0;

  // Dynamic Trend Calculations
  const calculateUserGrowthTrend = () => {
    if (!growthData || growthData.length === 0 || !totalUsers) {
      return "0% this week";
    }
    const newUsersThisWeek = growthData.reduce((sum, item) => sum + (item.users || 0), 0);
    const usersBeforeThisWeek = totalUsers - newUsersThisWeek;
    if (usersBeforeThisWeek <= 0) {
      return "↑ +100% this week";
    }
    const pct = ((newUsersThisWeek / usersBeforeThisWeek) * 100).toFixed(1);
    return `↑ +${pct}% this week`;
  };

  const getContentLibraryTrend = () => {
    const movies = contentStats.find(item => item.name === "Movies")?.value || 0;
    const series = contentStats.find(item => item.name === "Series")?.value || 0;
    return `${movies} Mov · ${series} Ser`;
  };

  const getTodayRegTrend = () => {
    const today = registrationStats.todayRegistration || 0;
    const yesterday = registrationStats.yesterdayRegistration || 0;
    const diff = today - yesterday;
    if (diff > 0) return `↑ +${diff} more than yesterday`;
    if (diff < 0) return `↓ ${Math.abs(diff)} fewer than yesterday`;
    return `Same as yesterday (${today})`;
  };

  const getYesterdayRegTrend = () => {
    const yesterday = registrationStats.yesterdayRegistration || 0;
    const total = registrationStats.totalRegistration || 0;
    if (!total) return "No registrations yet";
    const pct = ((yesterday / total) * 100).toFixed(1);
    return `${pct}% of total users`;
  };

  const getTotalRegTrend = () => {
    const active = activeUsersCount;
    const total = registrationStats.totalRegistration || totalUsers || 0;
    if (!total) return "0% active users";
    const pct = ((active / total) * 100).toFixed(1);
    return `${pct}% active accounts`;
  };

  const getSubscribedUsersTrend = () => {
    const sub = subscriptionStats.totalSubscribedUsers || 0;
    const total = totalUsers || 1;
    const pct = ((sub / total) * 100).toFixed(1);
    return `↑ ${pct}% subscription rate`;
  };

  const getNotSubscribedUsersTrend = () => {
    const notSub = subscriptionStats.totalNotSubscribedUsers || 0;
    const total = totalUsers || 1;
    const pct = ((notSub / total) * 100).toFixed(1);
    return `↓ ${pct}% of user base`;
  };

  const getExpirySubscriptionTrend = () => {
    const expired = subscriptionStats.expirySubscriptionCount || 0;
    const sub = subscriptionStats.totalSubscribedUsers || 0;
    const totalSubs = expired + sub;
    if (!totalSubs) return "0% churn rate";
    const pct = ((expired / totalSubs) * 100).toFixed(1);
    return `↓ ${pct}% churn rate`;
  };

  const getTodayIncomeTrend = () => {
    const today = incomeStats.todayIncome || 0;
    const yesterday = incomeStats.yesterdayIncome || 0;
    const diff = today - yesterday;
    if (diff > 0) return `↑ +₹${diff.toLocaleString("en-IN")} vs yesterday`;
    if (diff < 0) return `↓ -₹${Math.abs(diff).toLocaleString("en-IN")} vs yesterday`;
    return `Same as yesterday`;
  };

  const getYesterdayIncomeTrend = () => {
    const yesterday = incomeStats.yesterdayIncome || 0;
    const total = incomeStats.totalIncome || 1;
    const pct = ((yesterday / total) * 100).toFixed(1);
    return `${pct}% of total revenue`;
  };

  const getWeeklyIncomeTrend = () => {
    const weekly = incomeStats.weeklyIncome || 0;
    const total = incomeStats.totalIncome || 1;
    const pct = ((weekly / total) * 100).toFixed(1);
    return `${pct}% of total revenue`;
  };

  const getMonthlyIncomeTrend = () => {
    const monthly = incomeStats.monthlyIncome || 0;
    const total = incomeStats.totalIncome || 1;
    const pct = ((monthly / total) * 100).toFixed(1);
    return `${pct}% of total revenue`;
  };

  const getYearlyIncomeTrend = () => {
    const yearly = incomeStats.yearlyIncome || 0;
    const total = incomeStats.totalIncome || 1;
    const pct = ((yearly / total) * 100).toFixed(1);
    return `${pct}% of total revenue`;
  };

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><BarChart3 style={{ display: "inline-block", marginRight: 8 }} size={32} /> Platform Overview</h1>
          <p className="pg-sub">Real-time stats and analytics for Mirchi</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData}>
          {loading ? <><TrendingUp size={18} style={{ marginRight: 6 }} /> Loading...</> : <><RefreshCw size={18} style={{ marginRight: 6 }} /> Refresh</>}
        </button>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="stat-grid">
        {canAccessUsers && (
          <div className="stat-card s-red">
            <div className="stat-icon"><Users size={32} /></div>
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{loading ? "..." : totalUsers}</div>
            <div className="stat-trend up">{calculateUserGrowthTrend()}</div>
          </div>
        )}
        {canAccessContent && (
          <div className="stat-card s-blue">
            <div className="stat-icon"><Film size={32} /></div>
            <div className="stat-label">Content Library</div>
            <div className="stat-value">{loading ? "..." : totalContent}</div>
            <div className="stat-trend up">{getContentLibraryTrend()}</div>
          </div>
        )}
        {canAccessUsers && (
          <div className="stat-card s-green">
            <div className="stat-icon"><Radio size={32} /></div>
            <div className="stat-label">Active Users</div>
            <div className="stat-value">{loading ? "..." : activeUsersCount}</div>
            <div className="stat-trend up">
              {totalUsers ? `↑ ${((activeUsersCount / totalUsers) * 100).toFixed(1)}% of total` : "Live now"}
            </div>
          </div>
        )}
      </div>

      {/* Registration Section */}
      {canAccessUsers && (
        <div className="content-box">
          <h3>Registration</h3>
          <div className="stat-grid">
            <div className="stat-card s-red">
              <div className="stat-icon"><Sun size={28} /></div>
              <div className="stat-label">Today Registration</div>
              <div className="stat-value">{loading ? "..." : registrationStats.todayRegistration}</div>
              <div className={`stat-trend ${(registrationStats.todayRegistration || 0) >= (registrationStats.yesterdayRegistration || 0) ? "up" : "down"}`}>
                {getTodayRegTrend()}
              </div>
            </div>
            <div className="stat-card s-blue">
              <div className="stat-icon"><CalendarDays size={28} /></div>
              <div className="stat-label">Yesterday Registration</div>
              <div className="stat-value">{loading ? "..." : registrationStats.yesterdayRegistration}</div>
              <div className="stat-trend up">{getYesterdayRegTrend()}</div>
            </div>
            <div className="stat-card s-green">
              <div className="stat-icon"><Users size={28} /></div>
              <div className="stat-label">Total Registration counts</div>
              <div className="stat-value">{loading ? "..." : registrationStats.totalRegistration}</div>
              <div className="stat-trend up">{getTotalRegTrend()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Section */}
      {canAccessPricing && (
        <div className="content-box">
          <h3>Subscriptions</h3>
          <div className="stat-grid">
            <div className="stat-card s-green">
              <div className="stat-icon"><BadgeCheck size={28} /></div>
              <div className="stat-label">Total Subscribe Users</div>
              <div className="stat-value">{loading ? "..." : subscriptionStats.totalSubscribedUsers}</div>
              <div className="stat-trend up">{getSubscribedUsersTrend()}</div>
            </div>
            <div className="stat-card s-blue">
              <div className="stat-icon"><UserX size={28} /></div>
              <div className="stat-label">Total Not Subscribe Users</div>
              <div className="stat-value">{loading ? "..." : subscriptionStats.totalNotSubscribedUsers}</div>
              <div className="stat-trend down">{getNotSubscribedUsersTrend()}</div>
            </div>
            <div className="stat-card s-orange">
              <div className="stat-icon"><Clock3 size={28} /></div>
              <div className="stat-label">Expiry Subscription counts</div>
              <div className="stat-value">{loading ? "..." : subscriptionStats.expirySubscriptionCount}</div>
              <div className="stat-trend down">{getExpirySubscriptionTrend()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Income Section */}
      {canAccessPricing && (
        <div className="content-box">
          <h3>Income</h3>
          <div className="stat-grid">
            <div className="stat-card s-red">
              <div className="stat-icon"><Sun size={28} /></div>
              <div className="stat-label">Today Income</div>
              <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.todayIncome)}</div>
              <div className={`stat-trend ${(incomeStats.todayIncome || 0) >= (incomeStats.yesterdayIncome || 0) ? "up" : "down"}`}>
                {getTodayIncomeTrend()}
              </div>
            </div>
            <div className="stat-card s-blue">
              <div className="stat-icon"><CalendarDays size={28} /></div>
              <div className="stat-label">Yesterday Income</div>
              <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.yesterdayIncome)}</div>
              <div className="stat-trend up">{getYesterdayIncomeTrend()}</div>
            </div>
            <div className="stat-card s-green">
              <div className="stat-icon"><CalendarRange size={28} /></div>
              <div className="stat-label">Weekly Income</div>
              <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.weeklyIncome)}</div>
              <div className="stat-trend up">{getWeeklyIncomeTrend()}</div>
            </div>
            <div className="stat-card s-orange">
              <div className="stat-icon"><Calendar size={28} /></div>
              <div className="stat-label">Monthly Income</div>
              <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.monthlyIncome)}</div>
              <div className="stat-trend up">{getMonthlyIncomeTrend()}</div>
            </div>
            <div className="stat-card s-blue">
              <div className="stat-icon"><CalendarClock size={28} /></div>
              <div className="stat-label">Yearly Income</div>
              <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.yearlyIncome)}</div>
              <div className="stat-trend up">{getYearlyIncomeTrend()}</div>
            </div>
            <div className="stat-card s-green">
              <div className="stat-icon"><Wallet size={28} /></div>
              <div className="stat-label">Total Income Counts</div>
              <div className="stat-value">{loading ? "..." : formatCurrency(incomeStats.totalIncome)}</div>
              <div className="stat-trend up">All-time revenue</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Charts Row ─── */}
      {(canAccessUsers || canAccessContent) && (
        <div 
          className="charts-row" 
          style={{ gridTemplateColumns: (canAccessUsers && canAccessContent) ? "2fr 1fr" : "1fr" }}
        >
          {/* Area Chart */}
          {canAccessUsers && (
            <div className="content-box">
              <h3>📈 User Growth — This Week</h3>
              {growthData.length === 0 ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No user growth data this week
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={GROWTH} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e50914" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border2)" }} />
                    <Area type="monotone" dataKey="users" stroke="#e50914" strokeWidth={2.5}
                      fill="url(#redGrad)"
                      activeDot={{ r: 6, fill: "#e50914", stroke: "var(--bg2)", strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Pie Chart */}
          {canAccessContent && (
            <div className="content-box">
              <h3>🎬 Content Split</h3>
              {totalContent === 0 ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No content in library yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={PIE} cx="50%" cy="50%"
                      innerRadius={55} outerRadius={88}
                      paddingAngle={4} dataKey="value" stroke="none">
                      {PIE.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)" }} />
                    <Legend iconType="circle" formatter={v => <span style={{ color: "var(--text-soft)", fontSize: "0.8rem" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Recent Activity ─── */}
      {canAccessUsers && (
        <div className="content-box">
          <h3>🕐 Recent Users</h3>
          {loading ? (
            <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>Loading...</p>
          ) : !Array.isArray(users) || users.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>No users yet</p>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>User</th><th>Email</th><th>Joined</th></tr></thead>
                <tbody>
                  {users.slice(0, 5).map((u, i) => (
                    <tr key={u._id || i}>
                      <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div className="u-avatar">{u.name?.[0]?.toUpperCase() || "U"}</div>
                          <span className="u-name">{u.name || "User"}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-soft)" }}>{u.email}</td>
                      <td style={{ color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
