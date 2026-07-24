import "./Sidebar.css";
import { NavLink } from "react-router-dom";
// import { BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut } from "lucide-react";
import { X, BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut, Star, Bell, MessageSquare, Clapperboard, ShieldCheck, Tags } from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "#e50914", permissionId: null },
  { id: "subadmins", label: "Sub-admins & Staff", icon: ShieldCheck, color: "#a855f7", requiresSuperAdmin: true },
  { id: "users", label: "Users", icon: Users, color: "#3b82f6", permissionId: "users" },
  { id: "pricing", label: "Subscribed Users", icon: CreditCard, color: "#ec4899", permissionId: "pricing" },
  { id: "add-content", label: "Add Content", icon: Plus, color: "#10b981", permissionId: "content" },
  { id: "content", label: "Content Library", icon: Film, color: "#f59e0b", permissionId: "content" },
  { id: "categories", label: "Categories", icon: Tags, color: "#eab308", permissionId: "content" },
  // { id: "add-drama", label: "Add Short Drama", icon: Plus, color: "#a78bfa", permissionId: "content" },
  // { id: "dramas", label: "Short Dramas", icon: Clapperboard, color: "#8b5cf6", permissionId: "content" },
  { id: "ratings", label: "Ratings", icon: Star, color: "#facc15", permissionId: "ratings" },
  { id: "plans", label: "Subscription Plans", icon: CreditCard, color: "#ec4899", permissionId: "plans" },
  { id: "promo", label: "Promo&Voucher", icon: CreditCard, color: "#ec4899", permissionId: "promo" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "#f59e0b", permissionId: "notifications" },
  { id: "support", label: "Support", icon: MessageSquare, color: "#06b6d4", permissionId: "support" },
  { id: "legal", label: "Legal", icon: FileText, color: "#8b5cf6", permissionId: "legal" },
  { id: "help", label: "Help Center", icon: HelpCircle, color: "#06b6d4", permissionId: "help" },
  { id: "settings", label: "Settings", icon: Settings, color: "#64748b", permissionId: "settings" },
  
];

export default function Sidebar({ theme, showSidebar, toggleSidebar, closeSidebar, adminRole = "ADMIN", adminPermissions = [] }) {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const filteredNav = NAV.filter((item) => {
    if (item.requiresSuperAdmin && adminRole !== "ADMIN") {
      return false;
    }
    if (adminRole === "ADMIN") {
      return true;
    }
    if (!item.permissionId) {
      return true;
    }
    return adminPermissions.some((p) => {
      if (p === item.permissionId || p === "content") return true;
      if (
        item.permissionId === "content" &&
        ["movies", "series", "shortdrama", "categories"].some((sub) => p === sub || p.startsWith(`${sub}.`))
      ) {
        return true;
      }
      return p.startsWith(`${item.permissionId}.`);
    });
  });

  return (
    <aside className={`sidebar ${showSidebar ? "open" : ""}`}>
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src="/favicon.png" alt="Logo" />
        </div>
        <div>
          <div className="sidebar-title">Mirchi</div>
          <div className="sidebar-tag">{adminRole === "ADMIN" ? "Super Admin Panel" : "Staff Panel"}</div>
        </div>
        <button className="mobile-close-btn" onClick={toggleSidebar}>
          <X size={24} />
        </button>
      </div>
      {/* This is my sidebar  */}
      <div className="sidebar-divider" />

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {filteredNav.map((item) => {
          const toPath = item.id === "dashboard" ? "/dashboard" : `/dashboard/${item.id}`;
          return (
            <NavLink
              key={item.id}
              to={toPath}
              end={item.id === "dashboard"}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              style={({ isActive }) => isActive ? { "--accent": item.color } : undefined}
              onClick={() => closeSidebar && closeSidebar()}
            >
              {({ isActive }) => (
                <>
                  <span className="nav-icon-wrap" style={isActive ? { background: item.color + "22", color: item.color } : undefined}>
                    <item.icon size={20} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <span className="nav-pill" style={{ background: item.color }} />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} /> <span>Logout</span>
        </button>
        <p className="sidebar-version">v1.0 · {theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
      </div>
    </aside>
  );
}
