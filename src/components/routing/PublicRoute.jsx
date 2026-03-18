import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute = ({ children }) => {
    const { isAuthenticated, user, isHydrating } = useSelector((state) => state.auth);

    if (isHydrating) return null;

    if (isAuthenticated) {
        const userRole = user?.role?.toLowerCase() || '';
        const isAdmin = ['admin1', 'admin2', 'admin3', 'admin'].includes(userRole);

        return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/employee/profile" replace />;
    }

    return children;
};

export default PublicRoute;