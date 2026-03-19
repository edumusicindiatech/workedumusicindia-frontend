import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    LayoutDashboard,
    Users,
    Radio,
    MessageSquare,
    Shield,
    Moon,
    Sun,
    Settings,
    LogOut,
    ChevronUp,
    UserCircle,
    TrendingUp,
    Bell
} from "lucide-react";

import api from "../../api/axios";
import { logout } from "../../store/slices/authSlice";
import SettingsModal from "../../modals/SettingModal";

const AdminSidebar = () => {
    const dispatch = useDispatch();

    const { user } = useSelector((state) => state.auth);
    const adminName = user?.name || "Admin User";
    const adminEmail = user?.email || "admin@workforce.com";

    // UI States
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Desktop Menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const desktopMenuRef = useRef(null);
    const mobileMenuRef = useRef(null);

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

    // --- Click Outside Handlers ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Logout Handler ---
    const handleLogout = async () => {
        setIsMenuOpen(false);
        setIsMobileMenuOpen(false);

        dispatch(logout());
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Backend logout cleanup failed:", error);
        }

        window.location.href = "/";
    };

    // --- Styling Helpers ---
    const desktopNavClasses = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    const mobileNavClasses = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`;

    return (
        <>
            {/* =========================================
                1. DESKTOP VIEW (Left Sidebar)
                ========================================= */}
            <aside className="hidden md:flex fixed left-0 top-0 w-64 h-full bg-card border-r border-border z-30 flex-col">
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                            <Shield className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-foreground tracking-tight">WorkForce</h1>
                            <p className="text-[10px] uppercase font-bold text-primary tracking-widest opacity-80">Admin Portal</p>
                        </div>
                    </div>

                    <nav className="space-y-1.5 flex-1">
                        <NavLink to="/admin/dashboard" className={desktopNavClasses}>
                            <LayoutDashboard className="w-5 h-5" /> Dashboard
                        </NavLink>
                        <NavLink to="/admin/employees" className={desktopNavClasses}>
                            <Users className="w-5 h-5" /> Employee Roster
                        </NavLink>
                        <NavLink to="/admin/attendance" className={desktopNavClasses}>
                            <Radio className="w-5 h-5" /> Attendance Feed
                        </NavLink>
                        <NavLink to="/admin/progress" className={desktopNavClasses}>
                            <TrendingUp className="w-5 h-5" /> Progress Report
                        </NavLink>
                        {/* --- NOTIFICATIONS MOVED ABOVE COMMUNICATION --- */}
                        <NavLink to="/admin/notifications" className={desktopNavClasses}>
                            <Bell className="w-5 h-5" /> Notifications
                        </NavLink>
                        <NavLink to="/admin/communication" className={desktopNavClasses}>
                            <MessageSquare className="w-5 h-5" /> Communication
                        </NavLink>
                    </nav>
                </div>

                {/* Desktop Footer Controls */}
                <div className="p-4 border-t border-border bg-muted/20 backdrop-blur-sm space-y-4 relative" ref={desktopMenuRef}>
                    <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-all text-sm font-medium text-foreground group shadow-sm">
                        <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                        </div>
                        <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute bottom-22 left-4 right-4 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-bottom-4 fade-in duration-200 z-50">
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMenuOpen(false); setIsSettingsModalOpen(true); }}
                            >
                                <Settings className="w-4 h-4 text-primary" /> System Settings
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                                <LogOut className="w-4 h-4" /> Log out
                            </button>
                        </div>
                    )}

                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${isMenuOpen ? "bg-card border-primary ring-2 ring-primary/10 shadow-lg" : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"}`}>
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

            {/* =========================================
                2. MOBILE VIEW (Top Header)
                ========================================= */}
            <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                        <Shield className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h1 className="font-bold text-lg text-foreground tracking-tight">WorkForce</h1>
                </div>

                <div className="relative" ref={mobileMenuRef}>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <UserCircle className="w-7 h-7 text-muted-foreground" />
                    </button>

                    {isMobileMenuOpen && (
                        <div className="absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                            <div className="px-3 py-2 mb-1 border-b border-border">
                                <p className="text-sm font-bold text-foreground truncate">{adminName}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{adminEmail}</p>
                            </div>
                            <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                    <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                                </div>
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }}
                            >
                                <Settings className="w-4 h-4 text-primary" /> Settings
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                                <LogOut className="w-4 h-4" /> Log out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* =========================================
                3. MOBILE VIEW (Bottom Navigation)
                ========================================= */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-1 pb-safe">
                <NavLink to="/admin/dashboard" className={mobileNavClasses}>
                    <LayoutDashboard className="w-5.5 h-5.5" />
                    <span className="text-[9px] font-medium hidden sm:block">Home</span>
                </NavLink>
                <NavLink to="/admin/employees" className={mobileNavClasses}>
                    <Users className="w-5.5 h-5.5" />
                    <span className="text-[9px] font-medium hidden sm:block">Roster</span>
                </NavLink>
                <NavLink to="/admin/attendance" className={mobileNavClasses}>
                    <Radio className="w-5.5 h-5.5" />
                    <span className="text-[9px] font-medium hidden sm:block">Feed</span>
                </NavLink>
                <NavLink to="/admin/progress" className={mobileNavClasses}>
                    <TrendingUp className="w-5.5 h-5.5" />
                    <span className="text-[9px] font-medium hidden sm:block">Progress</span>
                </NavLink>
                {/* --- NOTIFICATIONS MOVED ABOVE COMMUNICATION --- */}
                <NavLink to="/admin/notifications" className={mobileNavClasses}>
                    <Bell className="w-5.5 h-5.5" />
                    <span className="text-[9px] font-medium hidden sm:block">Alerts</span>
                </NavLink>
                <NavLink to="/admin/communication" className={mobileNavClasses}>
                    <MessageSquare className="w-5.5 h-5.5" />
                    <span className="text-[9px] font-medium hidden sm:block">Chat</span>
                </NavLink>
            </nav>

            {/* Modals */}
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
            />
        </>
    );
};

export default AdminSidebar;