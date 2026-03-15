import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Radio, MessageSquare, Shield } from "lucide-react";

const AdminSidebar = () => {
    // This helper function handles the styling for active vs inactive links
    const navLinkClasses = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    return (
        <aside className="fixed left-0 top-0 w-64 h-full bg-card border-r border-border z-20">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg">WorkForce</h1>
                        <p className="text-xs text-muted-foreground">Admin Portal</p>
                    </div>
                </div>

                <nav className="space-y-2">
                    <NavLink to="/admin/dashboard" className={navLinkClasses}>
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </NavLink>

                    <NavLink to="/admin/employees" className={navLinkClasses}>
                        <Users className="w-5 h-5" />
                        Employee Roster
                    </NavLink>

                    <NavLink to="/admin/attendance" className={navLinkClasses}>
                        <Radio className="w-5 h-5" />
                        Attendance Feed
                    </NavLink>

                    <NavLink to="/admin/communication" className={navLinkClasses}>
                        <MessageSquare className="w-5 h-5" />
                        Communication
                    </NavLink>
                </nav>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                        A
                    </div>
                    <div>
                        <p className="text-sm font-medium">Admin User</p>
                        <p className="text-xs text-muted-foreground">admin@workforce.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;