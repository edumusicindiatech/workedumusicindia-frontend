import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute = ({ children }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    if (isAuthenticated) {
        // If they are already logged in, route them to their correct dashboard
        const userRole = user?.role?.toLowerCase() || '';
        const isAdmin = ['admin1', 'admin2', 'admin3', 'admin'].includes(userRole);

        return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/employee/profile" replace />;
    }

    // If not logged in, let them see the login page
    return children;
};

export default PublicRoute;