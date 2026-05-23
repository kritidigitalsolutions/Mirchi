
import { Routes, Route } from "react-router-dom";
import { useState, createContext, useContext, useEffect, lazy } from "react";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// ── Lazy Loaded Dashboard Pages ──
const DashboardHome = lazy(() => import("./pages/Dashboard"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const AddContent = lazy(() => import("./pages/AddContent"));
const Content = lazy(() => import("./pages/Content"));
const RatingsPage = lazy(() => import("./pages/Ratings"));
const PlansPage = lazy(() => import("./pages/Plans"));
const PromoVoucher = lazy(() => import("./pages/PromoVoucher"));
const SubscriptionPage = lazy(() => import("./pages/Subscriptions"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const SupportDetails = lazy(() => import("./pages/SupportDetails"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const Settings = lazy(() => import("./pages/Settings"));

// ── Toast Context ──
const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

function App() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Secured Parent Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Nested Dashboard Routes */}
          <Route index element={<DashboardHome />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="add-content" element={<AddContent />} />
          <Route path="content" element={<Content />} />
          <Route path="ratings" element={<RatingsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="promo" element={<PromoVoucher />} />
          <Route path="pricing" element={<SubscriptionPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportDetails />} />
          <Route path="legal" element={<LegalPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>

      {/* Global Toast Component */}
      {toast && (
        <div className={`global-toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{toast.type === "success" ? "✓" : "✕"}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <div className="toast-progress" />
        </div>
      )}
    </ToastContext.Provider>
  );
}

export default App;