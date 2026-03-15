import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    User, Calendar, BellRing, Camera, FileText,
    Menu, X, Moon, Sun, LogOut
} from "lucide-react";

const EmployeeNavbar = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifCount] = useState(2); // Mock notification count for optional tasks

    // Dark mode state
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

    // Helper for active link styling
    const navLinkClasses = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    const navItems = [
        { path: "/employee/profile", icon: <User className="w-5 h-5" />, label: "My Profile" },
        { path: "/employee/assignments", icon: <Calendar className="w-5 h-5" />, label: "Assigned Schools" },
        {
            path: "/employee/optional",
            icon: <BellRing className="w-5 h-5" />,
            label: "Optional Tasks",
            badge: notifCount
        },
        { path: "/employee/media", icon: <Camera className="w-5 h-5" />, label: "Media Upload" },
        { path: "/employee/report", icon: <FileText className="w-5 h-5" />, label: "Daily Report" },
    ];

    return (
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo Area */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                            <span className="text-primary-foreground font-bold text-base">W</span>
                        </div>
                        <h1 className="font-display font-bold text-lg text-foreground">WorkForce</h1>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-2">
                        {navItems.map((item) => (
                            <NavLink key={item.path} to={item.path} className={navLinkClasses}>
                                {item.icon}
                                <span>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Right Side Actions (Theme & Logout) */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={() => navigate("/")}
                            className="hidden sm:flex p-2.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2.5 rounded-full hover:bg-muted text-foreground transition-colors ml-1"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isMobileMenuOpen && (
                <div className="lg:hidden absolute top-16 left-0 w-full bg-card border-b border-border shadow-elevated p-4 animate-fade-in">
                    <nav className="flex flex-col gap-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={navLinkClasses}
                            >
                                {item.icon}
                                <span className="flex-1">{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                                        {item.badge} New
                                    </span>
                                )}
                            </NavLink>
                        ))}
                        <div className="w-full h-px bg-border my-2"></div>
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Log Out
                        </button>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default EmployeeNavbar;