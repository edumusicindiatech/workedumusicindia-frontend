import { useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, logout } from "./store/slices/authSlice";
import api, { setAxiosToken } from "./api/axios";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";

// ==========================================
// 1. SYNCHRONOUS IMPORTS (Keep Layouts & Guards static so the app shell loads instantly)
// ==========================================
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicRoute from "./components/routing/PublicRoute";
import AdminLayout from "./components/admin/AdminLayout";
import EmployeeLayout from "./components/employee/EmployeeLayout";
import FloatingUploadManager from "./modals/employee/FloatingUploadManager";

// ==========================================
// 2. ASYNCHRONOUS IMPORTS (Lazy-loaded chunks to fix Lighthouse render-blocking)
// ==========================================
// Auth & Shared
const Login = lazy(() => import("./pages/shared/Login"));
const NotFound = lazy(() => import("./pages/shared/Notfound"));
const AdminContact = lazy(() => import("./pages/admin/AdminContact"));
const LearningHub = lazy(() => import("./pages/shared/LearningHub"));

// Admin Pages
const Dashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const EmployeeRoster = lazy(() => import("./pages/admin/EmployeeRoster"));
const EmployeeProfile = lazy(() => import("./pages/admin/EmployeeProfile"));
const Communication = lazy(() => import("./pages/admin/Communication"));
const AttendanceFeed = lazy(() => import("./pages/admin/AttendenceFeed"));
const ProgressReport = lazy(() => import("./pages/admin/ProgressReport"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminResetPassword = lazy(() => import("./pages/admin/AdminResetPassword"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminLeaveRequests = lazy(() => import("./pages/admin/AdminLeaveRequests"));
const AdminMediaGallery = lazy(() => import("./pages/admin/AdminMediaGallery"));
const AdminLeaderboard = lazy(() => import("./pages/admin/AdminLeaderBoard"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));

// Employee Pages
const EmployeeDashboard = lazy(() => import("./pages/employee/EmployeeDashboard"));
const MyProfile = lazy(() => import("./pages/employee/MyProfile"));
const AssignedSchools = lazy(() => import("./pages/employee/AssignedSchools"));
const OptionalTasks = lazy(() => import("./pages/employee/Tasks"));
const EmployeeMedia = lazy(() => import("./pages/employee/EmployeeMedia"));
const DailyReport = lazy(() => import("./pages/employee/DailyReport"));
const EmployeeNotifications = lazy(() => import("./pages/employee/EmployeeNotifications"));
const EmployeeResetPassword = lazy(() => import("./pages/employee/EmployeeResetPassword"));
const EmployeeLeaderBoard = lazy(() => import("./pages/employee/EmployeeLeaderBoard"));

// ==========================================
// 3. FALLBACK LOADER
// ==========================================
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#12161f]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

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
            return;
          }
        }
        localStorage.removeItem('offlineEmailQueue');
      }
    };

    window.addEventListener('online', handleOnline);
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

      <FloatingUploadManager />

      {/* --- ADDED SUSPENSE WRAPPER HERE --- */}
      <Suspense fallback={<PageLoader />}>
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
            <Route path="learning-hub" element={<LearningHub />} />
            <Route path="report" element={<DailyReport />} />
            <Route path="leaderboard" element={<EmployeeLeaderBoard />} />
            <Route path="notifications" element={<EmployeeNotifications />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="employees" element={<EmployeeRoster />} />
            <Route path="employees/:id" element={<EmployeeProfile />} />
            <Route path="attendance" element={<AttendanceFeed />} />
            <Route path="progress" element={<ProgressReport />} />
            <Route path="leaderboard" element={<AdminLeaderboard />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="media" element={<AdminMediaGallery />} />
            <Route path="learning-hub" element={<LearningHub />} />
            <Route path="leave-requests" element={<AdminLeaveRequests />} />
            <Route path="communication" element={<Communication />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;