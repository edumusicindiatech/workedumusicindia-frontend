import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Auth & Shared
import Login from "./pages/Login";
import NotFound from "./pages/Notfound";

// Admin Imports
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import EmployeeRoster from "./pages/admin/EmployeeRoster";
import EmployeeProfile from "./pages/admin/EmployeeProfile"; // Admin's view of an employee
import Communication from "./pages/admin/Communication";
import AttendanceFeed from "./pages/admin/AttendenceFeed";

// Employee Imports
import EmployeeLayout from "./components/employee/EmployeeLayout";
import MyProfile from "./pages/employee/MyProfile"; // Employee's own view
import AssignedSchools from "./pages/employee/AssignedSchools";
import OptionalTasks from "./pages/employee/OptionalTasks";
import MediaUpload from "./pages/employee/MediaUpload";
import DailyReport from "./pages/employee/DailyReport";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />

        {/* Employee Routes */}
        <Route path="/employee" element={<EmployeeLayout />}>
          {/* Automatically redirect /employee to /employee/profile */}
          <Route index element={<Navigate to="/employee/profile" replace />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="assignments" element={<AssignedSchools />} />
          <Route path="optional" element={<OptionalTasks />} />
          <Route path="media" element={<MediaUpload />} />
          <Route path="report" element={<DailyReport />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Automatically redirect /admin to /admin/dashboard */}
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