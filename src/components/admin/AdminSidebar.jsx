import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Radio, MessageSquare, Shield, X, Moon, Sun } from "lucide-react";

const AdminSidebar = ({ isOpen, setIsOpen }) => {
    // Dark mode state and effect
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    // UI Helper for links
    const navLinkClasses = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    return (
        <aside
            className={`fixed left-0 top-0 w-64 h-full bg-card border-r border-border z-30 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                }`}
        >
            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                            <Shield className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-lg text-foreground">WorkForce</h1>
                            <p className="text-xs text-muted-foreground">Admin Portal</p>
                        </div>
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="space-y-1.5 flex-1">
                    <NavLink to="/admin/dashboard" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </NavLink>

                    <NavLink to="/admin/employees" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                        <Users className="w-5 h-5" />
                        Employee Roster
                    </NavLink>

                    <NavLink to="/admin/attendance" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                        <Radio className="w-5 h-5" />
                        Attendance Feed
                    </NavLink>

                    <NavLink to="/admin/communication" className={navLinkClasses} onClick={() => setIsOpen(false)}>
                        <MessageSquare className="w-5 h-5" />
                        Communication
                    </NavLink>
                </nav>
            </div>

            {/* Footer Section: Theme Toggle & Profile */}
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm space-y-4">

                {/* Custom Theme Switch */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-medium text-foreground group"
                >
                    <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                    {/* Toggle UI */}
                    <div className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-border'}`}>
                        <div className={`w-4 h-4 rounded-full bg-background shadow-sm transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/80 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-sm">
                        A
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate">Ankit Pandey</p>
                        <p className="text-xs text-muted-foreground truncate">admin@workforce.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;