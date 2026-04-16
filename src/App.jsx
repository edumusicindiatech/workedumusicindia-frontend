import { useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, logout, setHydrationComplete } from "./store/slices/authSlice";
import api, { setAxiosToken } from "./api/axios";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";

// --- NEW IMPORT FOR PWA UPDATE HOOK ---
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DownloadCloud } from "lucide-react"; // Nice icon for the update screen

// ==========================================
// 1. SYNCHRONOUS IMPORTS
// ==========================================
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicRoute from "./components/routing/PublicRoute";
import AdminLayout from "./components/admin/AdminLayout";
import EmployeeLayout from "./components/employee/EmployeeLayout";
import FloatingUploadManager from "./modals/employee/FloatingUploadManager";

// ==========================================
// 2. ASYNCHRONOUS IMPORTS
// ==========================================
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

// Shared Pages
const HelpFAQ = lazy(() => import("./pages/employee/HelpFAQ"));
const SharedChat = lazy(() => import("./pages/shared/SharedChat"));

// ==========================================
// 3. FALLBACK LOADER
// ==========================================
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#12161f]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// ==========================================
// 4. GLOBAL TOASTER (WITH CONDITIONAL LOGIC)
// ==========================================
const GlobalToaster = () => {
  const location = useLocation();

  // Hide this global toaster if we are on the employee reset password page
  if (location.pathname === '/employee/reset-password') {
    return null;
  }

  return (
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
  );
};


function App() {
  const dispatch = useDispatch();
  const { user, isHydrating, token } = useSelector((state) => state.auth);
  const { i18n } = useTranslation();

  const currentTheme = useSelector((state) => state.theme?.mode || 'light');

  // --- STRICT PWA UPDATE LOGIC ---
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 60 minutes if the user leaves the tab open forever
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    }
  });

  useEffect(() => {
    localStorage.setItem('themeMode', currentTheme);
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

  // --- SEAMLESS BACKGROUND SYNC ---
  useEffect(() => {
    const initializeApp = async () => {
      // SCENARIO 1: We already have a token from Redux-Persist (User just refreshed)
      if (token) {
        setAxiosToken(token);
        dispatch(setHydrationComplete()); // Unblock UI immediately, zero jerk!

        // Silently verify and update profile in the background
        try {
          const profileRes = await api.get('/employee/me/profile');
          if (profileRes.data.success) {
            dispatch(setCredentials({
              user: profileRes.data.user,
              access_token: token
            }));
          }
        } catch (error) {
          // We DO NOT logout here. If the token is truly expired, 
          // your global Axios interceptor handles the 401 and refresh logic.
          console.warn("Background profile sync failed (offline or expired). Using cache.");
        }
        return;
      }

      // SCENARIO 2: No token in Redux (User returning after days, or cleared cache)
      try {
        const refreshRes = await api.get('/auth/refresh-token', {
          withCredentials: true
        });

        const newAccessToken = refreshRes.data.access_token;
        setAxiosToken(newAccessToken);

        const profileRes = await api.get('/employee/me/profile');

        if (profileRes.data.success) {
          dispatch(setCredentials({
            user: profileRes.data.user,
            access_token: newAccessToken
          }));
        } else {
          dispatch(logout());
        }
      } catch (error) {
        // If we have NO token and refresh fails, they are definitely logged out.
        dispatch(logout());
      } finally {
        dispatch(setHydrationComplete());
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONLY once on mount to prevent infinite loops

  // --- OFFLINE SYNC ---
  useEffect(() => {
    const handleOnline = async () => {
      const offlineQueue = JSON.parse(localStorage.getItem('offlineEmailQueue') || '[]');
      if (offlineQueue.length > 0) {
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

  // --- ZERO JERK RENDERING LOGIC ---
  const showBlankScreen = isHydrating && !token;

  if (showBlankScreen) {
    return <div className="min-h-screen w-full bg-[#f8f9fa] dark:bg-[#12161f]"></div>;
  }

  return (
    <>
      {/* STRICT PWA UPDATE BLOCKER MODAL */}
      {needRefresh && (
        <div className="fixed inset-0 z-[999999999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-[90%] flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <DownloadCloud className="w-8 h-8 text-primary animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Update Required</h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              A new mandatory version of the app is available. You must update to continue using the system.
            </p>
            <button
              onClick={() => updateServiceWorker(true)}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-base transition-transform active:scale-95 shadow-lg"
            >
              Update App Now
            </button>
          </div>
        </div>
      )}

      <Router>
        <GlobalToaster />
        <FloatingUploadManager />
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
              <Route path="help" element={<HelpFAQ />} />
              <Route path="chat" element={<SharedChat />} />
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
              <Route path="chat" element={<SharedChat />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </  >
  );
}

export default App;