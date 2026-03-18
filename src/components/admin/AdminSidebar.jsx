import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    LayoutDashboard,
    Users,
    Radio,
    MessageSquare,
    Shield,
    X,
    Moon,
    Sun,
    Settings,
    LogOut,
    ChevronUp
} from "lucide-react";

// API and Redux Actions
import api from "../../api/axios";
import { logout } from "../../store/slices/authSlice";
import SettingsModal from "../../modals/SettingModal";

const AdminSidebar = ({ isOpen, setIsOpen }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Get user data from Redux (fallback to local if needed)
    const { user } = useSelector((state) => state.auth);
    const adminName = user?.name || "Admin User";
    const adminEmail = user?.email || "admin@workforce.com";

    // UI States
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const menuRef = useRef(null);

    // --- Theme Management ---
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    // --- Click Outside Handler ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Logout Handler ---
    const handleLogout = async () => {
        setIsMenuOpen(false);

        // 1. Clear Redux State
        dispatch(logout());

        // 2. Clear LocalStorage
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        try {
            // 3. Backend logout (clears HttpOnly refresh cookie)
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Backend logout cleanup failed:", error);
        }

        // 4. Hard Redirect to ensure all states are wiped
        window.location.href = "/";
    };

    // NavLink Styling Helper
    const navLinkClasses = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    return (
        <>
            <aside
                className={`fixed left-0 top-0 w-64 h-full bg-card border-r border-border z-30 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                {/* Logo Section */}
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                                <Shield className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-foreground tracking-tight">WorkForce</h1>
                                <p className="text-[10px] uppercase font-bold text-primary tracking-widest opacity-80">Admin Portal</p>
                            </div>
                        </div>

                        {/* Mobile Close */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Links */}
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

                {/* Footer Controls */}
                <div className="p-4 border-t border-border bg-muted/20 backdrop-blur-sm space-y-4 relative" ref={menuRef}>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-all text-sm font-medium text-foreground group shadow-sm"
                    >
                        <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                        </div>
                        <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    {/* Options Popup */}
                    {isMenuOpen && (
                        <div className="absolute bottom-[88px] left-4 right-4 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-bottom-4 fade-in duration-200 z-50">
                            <button
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    setIsSettingsModalOpen(true);
                                }}
                            >
                                <Settings className="w-4 h-4 text-primary" /> System Settings
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Log out
                            </button>
                        </div>
                    )}

                    {/* User Profile Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${isMenuOpen
                                ? "bg-card border-primary ring-2 ring-primary/10 shadow-lg"
                                : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-sm shrink-0 uppercase">
                                {adminName.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden text-left">
                                <p className="text-sm font-bold text-foreground truncate leading-tight">{adminName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{adminEmail}</p>
                            </div>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>
            </aside>

            {/* Modals */}
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
            />
        </>
    );
};

export default AdminSidebar;