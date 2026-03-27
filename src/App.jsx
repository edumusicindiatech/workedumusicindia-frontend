import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, logout } from "./store/slices/authSlice";
import api, { setAxiosToken } from "./api/axios";
import { useTranslation } from "react-i18next";

// Route Guards
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicRoute from "./components/routing/PublicRoute";

// Auth & Shared
import Login from "./pages/Login";
import NotFound from "./pages/Notfound";
import AdminContact from "./pages/admin/AdminContact";

// Admin Imports
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/AdminDashboard";
import EmployeeRoster from "./pages/admin/EmployeeRoster";
import EmployeeProfile from "./pages/admin/EmployeeProfile";
import Communication from "./pages/admin/Communication";
import AttendanceFeed from "./pages/admin/AttendenceFeed";
import ProgressReport from "./pages/admin/ProgressReport";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminResetPassword from "./pages/admin/AdminResetPassword";
import AdminReports from "./pages/admin/AdminReports";
import AdminLeaveRequests from "./pages/admin/AdminLeaveRequests";
import AdminMediaGallery from "./pages/admin/AdminMediaGallery";

// Employee Imports
import EmployeeLayout from "./components/employee/EmployeeLayout";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import MyProfile from "./pages/employee/MyProfile";
import AssignedSchools from "./pages/employee/AssignedSchools";
import OptionalTasks from "./pages/employee/Tasks";
import EmployeeMedia from "./pages/employee/EmployeeMedia";
import DailyReport from "./pages/employee/DailyReport";
import EmployeeNotifications from "./pages/employee/EmployeeNotifications";
import EmployeeResetPassword from "./pages/employee/EmployeeResetPassword";
import { Toaster } from "react-hot-toast";

// ---> ADD YOUR MANAGER HERE <---
import FloatingUploadManager from "./modals/employee/FloatingUploadManager";

function App() {
  const dispatch = useDispatch();
  const { user, isHydrating } = useSelector((state) => state.auth);
  const { i18n } = useTranslation();

  const currentTheme = useSelector((state) => state.theme?.mode || 'light');

  useEffect(() => {
    localStorage.setItem('themeMode', currentTheme);

    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

  // --- BACKGROUND SYNC ON REFRESH ---
  useEffect(() => {
    const hydrateApp = async () => {
      try {
        const refreshResponse = await api.get('/auth/refresh-token');
        const newAccessToken = refreshResponse.data.access_token;
        setAxiosToken(newAccessToken);

        const profileResponse = await api.get('/employee/me/profile');

        if (profileResponse.data.success) {
          dispatch(setCredentials({
            user: profileResponse.data.user,
            access_token: newAccessToken
          }));
        } else {
          dispatch(logout());
        }
      } catch (error) {
        dispatch(logout());
      }
    };

    hydrateApp();
  }, [dispatch]);

  useEffect(() => {
    const handleOnline = async () => {
      const offlineQueue = JSON.parse(localStorage.getItem('offlineEmailQueue') || '[]');

      if (offlineQueue.length > 0) {
        console.log("Internet restored. Sending queued failure emails...");

        for (const payload of offlineQueue) {
          try {
            await api.post('/employee/media/send-failure-email', payload);
          } catch (err) {
            console.error("Failed to send queued email", err);
            return; // Stop and keep in queue if it fails again
          }
        }

        // If all succeeded, clear the queue!
        localStorage.removeItem('offlineEmailQueue');
      }
    };

    window.addEventListener('online', handleOnline);

    // Also run once on app mount just in case they refreshed the page while offline
    if (navigator.onLine) handleOnline();

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // --- LANGUAGE SYNC ---
  useEffect(() => {
    if (user?.preferences?.systemLanguage) {
      const langCode = user.preferences.systemLanguage === "हिन्दी (Hindi)" ? "hi" : "en";
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
    }
  }, [user?.preferences?.systemLanguage, i18n]);

  // --- BLANK SCREEN DURING HYDRATION ---
  if (isHydrating) {
    return <div className="min-h-screen w-full bg-[#f8f9fa] dark:bg-[#12161f]"></div>;
  }

  return (
    <Router>
      <Toaster position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
          },
        }}
      />

      {/* ---> MOUNT MANAGER SECURELY HERE <--- */}
      <FloatingUploadManager />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/contact-admin" element={<PublicRoute><AdminContact /></PublicRoute>} />

        {/* SECURE RESET PASSWORD ROUTES */}
        <Route
          path="/admin/reset-password"
          element={<ProtectedRoute requireAdmin={true}><AdminResetPassword /></ProtectedRoute>}
        />
        <Route
          path="/employee/reset-password"
          element={<ProtectedRoute requireAdmin={false}><EmployeeResetPassword /></ProtectedRoute>}
        />

        {/* Employee Routes */}
        <Route path="/employee" element={<ProtectedRoute requireAdmin={false}><EmployeeLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="assignments" element={<AssignedSchools />} />
          <Route path="optional" element={<OptionalTasks />} />
          <Route path="media" element={<EmployeeMedia />} />
          <Route path="report" element={<DailyReport />} />
          <Route path="notifications" element={<EmployeeNotifications />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<EmployeeRoster />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<AttendanceFeed />} />
          <Route path="progress" element={<ProgressReport />} />
          <Route path="reports" element={<AdminReports />} />

          {/* ---> ADDED ADMIN MEDIA ROUTE <--- */}
          <Route path="media" element={<AdminMediaGallery />} />

          <Route path="leave-requests" element={<AdminLeaveRequests />} />
          <Route path="communication" element={<Communication />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;