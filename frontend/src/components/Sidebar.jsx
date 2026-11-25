import { useState } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  BarChart3,
  Users,
  Plus,
  Film,
  FileText,
  HelpCircle,
  CreditCard,
  Settings,
  LogOut,
  Bell,
  MessageSquare,
  ShieldCheck,
  Tags,
  LayoutGrid,
  GalleryHorizontal,
} from "lucide-react";
import "./Sidebar.css";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "#e50914", permissionId: null },
  { id: "subadmins", label: "Sub-admins & Staff", icon: ShieldCheck, color: "#a855f7", requiresSuperAdmin: true },
  { id: "analytics", label: "Content Analytics", icon: BarChart2, color: "#3987e5", permissionId: "analytics" },
  { id: "users", label: "Users", icon: Users, color: "#3b82f6", permissionId: "users" },
  { id: "pricing", label: "Subscribed Users", icon: CreditCard, color: "#ec4899", permissionId: "pricing" },
  { id: "add-content", label: "Add Content", icon: Plus, color: "#10b981", permissionId: "content" },
  { id: "content", label: "Content Library", icon: Film, color: "#f59e0b", permissionId: "content" },
  { id: "categories", label: "Categories", icon: Tags, color: "#eab308", permissionId: "content" },
  { id: "webpage", label: "Webpage Layout", icon: LayoutGrid, color: "#ff8c00", permissionId: "content" },
  { id: "app-banners", label: "App Banners", icon: GalleryHorizontal, color: "#f43f5e", permissionId: "content" },
  { id: "plans", label: "Subscription Plans", icon: CreditCard, color: "#ec4899", permissionId: "plans" },
  { id: "promo", label: "Promo&Voucher", icon: CreditCard, color: "#ec4899", permissionId: "promo" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "#f59e0b", permissionId: "notifications" },
  { id: "support", label: "Support", icon: MessageSquare, color: "#06b6d4", permissionId: "support" },
  { id: "legal", label: "Legal", icon: FileText, color: "#8b5cf6", permissionId: "legal" },
  { id: "help", label: "Help Center", icon: HelpCircle, color: "#06b6d4", permissionId: "help" },
  { id: "settings", label: "Settings", icon: Settings, color: "#64748b", permissionId: "settings" },
];

export default function Sidebar({
  theme,
  showSidebar,
  toggleSidebar,
  closeSidebar,
  isCollapsed = false,
  toggleCollapse,
  adminRole = "ADMIN",
  adminPermissions = [],
}) {
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const handleMouseEnter = (e, label, color, isActive = false) => {
    if (!isCollapsed || window.innerWidth <= 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      color,
      isActive,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
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
    <aside
      className={`sidebar ${showSidebar ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}
      aria-expanded={!isCollapsed}
    >
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div
          className={`sidebar-brand-content ${isCollapsed ? "clickable" : ""}`}
          onClick={isCollapsed ? toggleCollapse : undefined}
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : undefined}
          role={isCollapsed ? "button" : undefined}
          tabIndex={isCollapsed ? 0 : undefined}
          onKeyDown={isCollapsed ? (e) => { if (e.key === "Enter" || e.key === " ") toggleCollapse(); } : undefined}
          onMouseEnter={isCollapsed ? (e) => handleMouseEnter(e, "Expand sidebar", "#e50914") : undefined}
          onMouseLeave={handleMouseLeave}
        >
          <div className="sidebar-logo">
            <img src="/favicon.png" alt="Logo" />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-title">Mirchi</div>
            <div className="sidebar-tag">{adminRole === "ADMIN" ? "Super Admin Panel" : "Staff Panel"}</div>
          </div>
        </div>

        {/* Desktop collapse toggle button inside brand header */}
        <button
          type="button"
          className="sidebar-collapse-btn desktop-collapse-btn"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          <ChevronLeft className={`toggle-chevron ${isCollapsed ? "rotated" : ""}`} size={18} />
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          className="mobile-close-btn"
          onClick={toggleSidebar}
          aria-label="Close navigation"
        >
          <X size={22} />
        </button>
      </div>

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
              style={({ isActive }) => (isActive ? { "--accent": item.color } : undefined)}
              onClick={() => {
                if (window.innerWidth <= 1024 && closeSidebar) {
                  closeSidebar();
                }
              }}
              onMouseEnter={(e) => handleMouseEnter(e, item.label, item.color)}
              onMouseLeave={handleMouseLeave}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="nav-icon-wrap"
                    style={isActive ? { background: item.color + "22", color: item.color } : undefined}
                  >
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

        {/* Desktop collapse toggle row button in footer */}
        <button
          type="button"
          className="sidebar-collapse-row-btn"
          onClick={toggleCollapse}
          onMouseEnter={(e) => handleMouseEnter(e, isCollapsed ? "Expand sidebar" : "Collapse sidebar")}
          onMouseLeave={handleMouseLeave}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          <span className="nav-icon-wrap collapse-icon-wrap">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </span>
          <span className="nav-label">Collapse</span>
          <kbd className="sidebar-kbd">Ctrl+B</kbd>
        </button>

        {/* Logout button */}
        <button
          type="button"
          className="logout-btn"
          onClick={handleLogout}
          onMouseEnter={(e) => handleMouseEnter(e, "Logout", "#e50914")}
          onMouseLeave={handleMouseLeave}
        >
          <span className="nav-icon-wrap logout-icon-wrap">
            <LogOut size={18} />
          </span>
          <span className="nav-label">Logout</span>
        </button>

        <p className="sidebar-version">v1.0 · {theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
      </div>

      {/* Floating tooltip for collapsed mode rendered in Portal */}
      {isCollapsed &&
        hoveredTooltip &&
        createPortal(
          <div
            className="sidebar-floating-tooltip"
            style={{
              top: `${hoveredTooltip.top}px`,
              left: `${hoveredTooltip.left}px`,
            }}
          >
            <span className="tooltip-text">{hoveredTooltip.label}</span>
            {hoveredTooltip.isActive && (
              <span
                className="tooltip-dot"
                style={{ background: hoveredTooltip.color || "var(--primary)" }}
              />
            )}
          </div>,
          document.body
        )}
    </aside>
  );
}
