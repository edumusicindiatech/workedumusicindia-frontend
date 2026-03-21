// src/components/routing/PublicRoute.jsx
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute = ({ children }) => {
    const { isAuthenticated, user, isHydrating } = useSelector((state) => state.auth);

    if (isHydrating) return null;

    if (isAuthenticated && user) {
        const userRole = user.role?.toLowerCase() || '';
        const isAdmin = ['admin', 'superadmin'].includes(userRole);
        // --- 1. INTERCEPT FIRST LOGIN ---
        if (user.isFirstLogin) {
            return isAdmin
                ? <Navigate to="/admin/reset-password" replace />
                : <Navigate to="/employee/reset-password" replace />;
        }

        // --- 2. STANDARD ROUTING ---
        return isAdmin
            ? <Navigate to="/admin/dashboard" replace />
            : <Navigate to="/employee/dashboard" replace />;
    }

    return children;
};

export default PublicRoute;