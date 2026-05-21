import "./Sidebar.css";
// import { BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut } from "lucide-react";
import { X, BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut, Star, Bell, MessageSquare } from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "#e50914" },
  { id: "users", label: "Users", icon: Users, color: "#3b82f6" },
  { id: "add-content", label: "Add Content", icon: Plus, color: "#10b981" },
  { id: "content", label: "Content Library", icon: Film, color: "#f59e0b" },
  { id: "ratings", label: "Ratings", icon: Star, color: "#facc15" },
  { id: "plans", label: "Subscription Plans", icon: CreditCard, color: "#ec4899" },
  { id: "promo", label: "Promo&Voucher", icon: CreditCard, color: "#ec4899" },
  { id: "pricing", label: "User Plan", icon: CreditCard, color: "#ec4899" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "#f59e0b" },
  { id: "support", label: "Support", icon: MessageSquare, color: "#06b6d4" },
  { id: "legal", label: "Legal", icon: FileText, color: "#8b5cf6" },
  { id: "help", label: "Help Center", icon: HelpCircle, color: "#06b6d4" },
  { id: "settings", label: "Settings", icon: Settings, color: "#64748b" },
];
export default function Sidebar({ activeTab, setActiveTab, theme, showSidebar, toggleSidebar }) {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <aside className={`sidebar ${showSidebar ? "open" : ""}`}>
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src="/favicon.png" alt="Logo" />
        </div>
        <div>
          <div className="sidebar-title">Mirchi</div>
          <div className="sidebar-tag">Admin Panel</div>
        </div>
        <button className="mobile-close-btn" onClick={toggleSidebar}>
          <X size={24} />
        </button>
      </div>
      {/* This is my sidebar  */}
      <div className="sidebar-divider" />

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              style={isActive ? { "--accent": item.color } : undefined}
            >
              <span className="nav-icon-wrap" style={isActive ? { background: item.color + "22", color: item.color } : undefined}>
                <item.icon size={20} />
              </span>
              <span className="nav-label">{item.label}</span>
              {isActive && <span className="nav-pill" style={{ background: item.color }} />}
            </button>
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
