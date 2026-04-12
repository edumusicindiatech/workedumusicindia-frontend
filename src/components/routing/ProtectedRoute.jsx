import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react"; // Gives a nice spinner while it waits!

const ProtectedRoute = ({ children, requireAdmin }) => {
    // 1. Pull in your isHydrating state here
    const { isAuthenticated, user, isHydrating } = useSelector((state) => state.auth);

    // 2. WAIT FOR REDUX TO FINISH HYDRATING BEFORE DOING ANYTHING ELSE
    if (isHydrating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // 3. Now it is completely safe to run your routing logic
    // If not logged in, kick to login screen
    if (!isAuthenticated) return <Navigate to="/" replace />;

    // Safely check if the user is an admin
    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = ['admin', 'superadmin'].includes(userRole);

    // If the route requires admin, but they aren't one -> send to employee dash
    if (requireAdmin && !isAdmin) return <Navigate to="/employee/profile" replace />;

    // If the route is for employees, but they ARE an admin -> send to admin dash
    if (!requireAdmin && isAdmin) return <Navigate to="/admin/dashboard" replace />;

    // Otherwise, they are allowed!
    return children;
};

export default ProtectedRoute;