import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import API from "../api/axios";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [theme, setTheme] = useState("dark"); // "dark" | "light"
  const [showSidebar, setShowSidebar] = useState(false);
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

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.classList.toggle("light", next === "light");
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar
        theme={theme}
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
        closeSidebar={() => setShowSidebar(false)}
        adminRole={adminRole}
        adminPermissions={adminPermissions}
      />

      <div className="page-shell">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          toggleSidebar={toggleSidebar}
        />

        <main className="page-body">
          <Outlet context={{ adminRole, adminPermissions }} />
        </main>
      </div>
    </div>
  );
}

