import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, logout } from "./store/slices/authSlice";
import api, { setAxiosToken } from "./api/axios";

// Route Guards
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicRoute from "./components/routing/PublicRoute";

// Auth & Shared
import Login from "./pages/Login";
import NotFound from "./pages/Notfound";

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
import AdminLeaveRequests from "./pages/admin/AdminLeaveRequests"; // <-- Added Import

// Employee Imports
import EmployeeLayout from "./components/employee/EmployeeLayout";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import MyProfile from "./pages/employee/MyProfile";
import AssignedSchools from "./pages/employee/AssignedSchools";
import OptionalTasks from "./pages/employee/Tasks";
import DailyReport from "./pages/employee/DailyReport";
import EmployeeNotifications from "./pages/employee/EmployeeNotifications";
import EmployeeResetPassword from "./pages/employee/EmployeeResetPassword";
import { Toaster } from "react-hot-toast";

function App() {
  const dispatch = useDispatch();
  const { isHydrating } = useSelector((state) => state.auth);

  // 1. Grab the current theme from Redux (fallback to 'light' just in case)
  const currentTheme = useSelector((state) => state.theme?.mode || 'light');

  // 2. Reactively apply the theme to the DOM whenever it changes in Redux
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
      <Routes>
        {/* Public Routes (Traffic Controller) */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

        {/* ========================================== */}
        {/* SECURE RESET PASSWORD ROUTES (No Layouts)  */}
        {/* ========================================== */}
        <Route
          path="/admin/reset-password"
          element={<ProtectedRoute requireAdmin={true}><AdminResetPassword /></ProtectedRoute>}
        />
        <Route
          path="/employee/reset-password"
          element={<ProtectedRoute requireAdmin={false}><EmployeeResetPassword /></ProtectedRoute>}
        />

        {/* ========================================== */}
        {/* Employee Routes (Inside Layout)            */}
        {/* ========================================== */}
        <Route path="/employee" element={<ProtectedRoute requireAdmin={false}><EmployeeLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="assignments" element={<AssignedSchools />} />
          <Route path="optional" element={<OptionalTasks />} />
          <Route path="report" element={<DailyReport />} />
          <Route path="notifications" element={<EmployeeNotifications />} />
        </Route>

        {/* ========================================== */}
        {/* Admin Routes (Inside Layout)               */}
        {/* ========================================== */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<EmployeeRoster />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<AttendanceFeed />} />
          <Route path="progress" element={<ProgressReport />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="leave-requests" element={<AdminLeaveRequests />} /> {/* <-- ADDED ROUTE */}
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