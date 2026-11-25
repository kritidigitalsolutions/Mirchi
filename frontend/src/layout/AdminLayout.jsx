import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import API from "../api/axios";
import { getStoredTheme, storeTheme, switchThemeWithTransition } from "../utils/themeTransition";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [theme, setTheme] = useState(getStoredTheme); // "dark" | "light"

  // Keep <body> in sync (also restores the saved theme on page load)
  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
  }, [theme]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebarCollapsed", String(next));
      } catch (err) {
        console.error("Failed to store sidebarCollapsed state:", err);
      }
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    if (window.innerWidth <= 1024) {
      setShowSidebar((prev) => !prev);
    } else {
      toggleCollapse();
    }
  }, [toggleCollapse]);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);
  const [adminRole, setAdminRole] = useState(() => localStorage.getItem("adminRole") || "ADMIN");
  const [adminPermissions, setAdminPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("adminPermissions") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const res = await API.get("/admin/auth/profile");
        if (res.data?.success && res.data?.admin) {
          const { role, permissions, name, isActive } = res.data.admin;
          if (isActive === false) {
            localStorage.clear();
            window.location.href = "/";
            return;
          }
          localStorage.setItem("adminData", JSON.stringify(res.data.admin));
          localStorage.setItem("adminRole", role || "ADMIN");
          localStorage.setItem("adminPermissions", JSON.stringify(permissions || []));
          if (name) localStorage.setItem("adminName", name);
          setAdminRole(role || "ADMIN");
          setAdminPermissions(permissions || []);
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
          window.location.href = "/";
        }
      }
    };
    fetchAdminProfile();
  }, []);

  const toggleTheme = (event) => {
    const next = theme === "dark" ? "light" : "dark";
    storeTheme(next);
    switchThemeWithTransition(
      () => {
        setTheme(next);
        document.body.classList.toggle("light", next === "light");
      },
      event,
      next === "light"
    );
  };

  return (
    <div className={`app-shell ${theme}`}>
      {/* Mobile backdrop overlay */}
      <div
        className={`sidebar-mobile-backdrop ${showSidebar ? "active" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      <Sidebar
        theme={theme}
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
        closeSidebar={() => setShowSidebar(false)}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        adminRole={adminRole}
        adminPermissions={adminPermissions}
      />

      <div className="page-shell">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          toggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
        />

        <main className="page-body">
          <Outlet context={{ adminRole, adminPermissions }} />
        </main>
      </div>
    </div>
  );
}

