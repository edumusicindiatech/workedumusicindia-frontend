import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children, requireAdmin }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    // If not logged in, kick to login screen
    if (!isAuthenticated) return <Navigate to="/" replace />;

    // Safely check if the user is an admin
    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = ['admin1', 'admin2', 'admin3', 'admin'].includes(userRole);

    // If the route requires admin, but they aren't one -> send to employee dash
    if (requireAdmin && !isAdmin) return <Navigate to="/employee/profile" replace />;

    // If the route is for employees, but they ARE an admin -> send to admin dash
    if (!requireAdmin && isAdmin) return <Navigate to="/admin/dashboard" replace />;

    // Otherwise, they are allowed!
    return children;
};

export default ProtectedRoute;