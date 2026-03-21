import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, logout } from "./store/slices/authSlice";
import api, { setAxiosToken } from "./api/axios";
import { Loader2 } from "lucide-react";

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
import Notifications from "./pages/admin/Notifications";
import AdminResetPassword from "./pages/admin/AdminResetPassword"; // <-- ADDED

// Employee Imports
import EmployeeLayout from "./components/employee/EmployeeLayout";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import MyProfile from "./pages/employee/MyProfile";
import AssignedSchools from "./pages/employee/AssignedSchools";
import OptionalTasks from "./pages/employee/Tasks";
import DailyReport from "./pages/employee/DailyReport";
import EmployeeNotifications from "./pages/employee/EmployeeNotifications";
import EmployeeResetPassword from "./pages/employee/EmployeeResetPassword"; // <-- ADDED
import { Toaster } from "react-hot-toast";

function App() {
  const dispatch = useDispatch();
  const { isHydrating } = useSelector((state) => state.auth);

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

  if (isHydrating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))', // Matches your Tailwind bg-card
            color: 'hsl(var(--foreground))', // Matches your text color
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#ffffff' }, // Emerald green
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' }, // Destructive red
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
          <Route path="communication" element={<Communication />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;