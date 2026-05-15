import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardHome from "../pages/Dashboard";
import UsersPage from "../pages/UsersPage";
import LegalPage from "../pages/LegalPage";
import HelpPage from "../pages/HelpPage";
import AddContent from "../pages/AddContent";
import Content from "../pages/Content";
import Settings from "../pages/Settings";
import SubscriptionPage from "../pages/Subscriptions";
import "./AdminLayout.css";
import RatingsPage from "../pages/Ratings";
import PlansPage from "../pages/Plans";
import PromoVoucher from "../pages/PromoVoucher";
import NotificationsPage from "../pages/Notifications";


export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme]         = useState("dark"); // "dark" | "light"
  const [showSidebar, setShowSidebar] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.classList.toggle("light", next === "light");
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setShowSidebar(false); }} 
        theme={theme} 
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
      />

      <div className="page-shell">
        <Topbar 
          theme={theme} 
          toggleTheme={toggleTheme} 
          setActiveTab={setActiveTab} 
          toggleSidebar={toggleSidebar} 
        />

        <main className="page-body">
          {activeTab === "dashboard"   && <DashboardHome />}
          {activeTab === "users"       && <UsersPage />}
          {activeTab === "legal"       && <LegalPage />}
          {activeTab === "help"        && <HelpPage />}
          {activeTab === "add-content" && <AddContent />}
          {activeTab === "content"     && <Content />}
          {activeTab === "ratings" && <RatingsPage />}
          {activeTab === "plans" && <PlansPage />}
          {activeTab === "promo" && <PromoVoucher />}
          
          {activeTab === "pricing" && <SubscriptionPage />}
          {activeTab === "notifications" && <NotificationsPage />}
          {activeTab === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}

