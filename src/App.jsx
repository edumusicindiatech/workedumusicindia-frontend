import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, setHydrationComplete } from "./store/slices/authSlice";
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
import Dashboard from "./pages/admin/Dashboard";
import EmployeeRoster from "./pages/admin/EmployeeRoster";
import EmployeeProfile from "./pages/admin/EmployeeProfile";
import Communication from "./pages/admin/Communication";
import AttendanceFeed from "./pages/admin/AttendenceFeed";

// Employee Imports
import EmployeeLayout from "./components/employee/EmployeeLayout";
import MyProfile from "./pages/employee/MyProfile";
import AssignedSchools from "./pages/employee/AssignedSchools";
import OptionalTasks from "./pages/employee/OptionalTasks";
import MediaUpload from "./pages/employee/MediaUpload";
import DailyReport from "./pages/employee/DailyReport";

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
          dispatch(setHydrationComplete());
        }
      } catch (error) {
        dispatch(setHydrationComplete());
      }
    };

    hydrateApp();
  }, [dispatch]);

  // Show a spinner ONLY while initially checking the cookie on a hard refresh
  if (isHydrating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

        {/* Employee Routes */}
        <Route path="/employee" element={<ProtectedRoute requireAdmin={false}><EmployeeLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/employee/profile" replace />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="assignments" element={<AssignedSchools />} />
          <Route path="optional" element={<OptionalTasks />} />
          <Route path="media" element={<MediaUpload />} />
          <Route path="report" element={<DailyReport />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<EmployeeRoster />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<AttendanceFeed />} />
          <Route path="communication" element={<Communication />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;