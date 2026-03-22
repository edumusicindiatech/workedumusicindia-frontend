import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
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
    TrendingUp,
    Bell,
    UserCircle
} from "lucide-react";

import api from "../../api/axios";
import { logout } from "../../store/slices/authSlice";
import AdminSettingsModal from "../../modals/admin/AdminSettingsModal";

const AdminSidebar = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation(); // To track current page

    const { user } = useSelector((state) => state.auth);
    const adminName = user?.name || "Admin User";
    const adminEmail = user?.email || "admin@workforce.com";

    // --- UI States ---
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // --- Notification State ---
    const [unreadCount, setUnreadCount] = useState(0);

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
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Global Notification Fetch & Socket (WITH SOUND) ---
    useEffect(() => {
        // 1. Fetch initial unread count
        const fetchUnreadCount = async () => {
            try {
                const res = await api.get('/admin/notifications');
                if (res.data.success) {
                    const unread = res.data.data.filter(n => !n.isRead && !n.isHidden).length;
                    setUnreadCount(unread);
                }
            } catch (error) {
                console.error("Failed to fetch global notifications count", error);
            }
        };

        // Don't fetch if they are already on the notifications page (it clears automatically)
        if (location.pathname !== '/admin/notifications') {
            fetchUnreadCount();
        }

        // 2. Setup Socket for Real-time Badge & Sound
        const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

        if (user?._id) {
            socket.emit("join_room", user._id);
        }

        socket.on("new_notification", () => {
            // A. Play the Ting Sound Globally
            const audio = new Audio('/sounds/notification-ting.mp3');
            audio.play().catch(err => {
                console.log("Audio blocked by browser policy until user interacts with the page:", err);
            });

            // B. Increment the badge (if not currently on the notifications page)
            if (location.pathname !== '/admin/notifications') {
                setUnreadCount(prev => prev + 1);
            }
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, [user?._id, location.pathname]);

    // --- Auto-Clear Badge when viewing Alerts page ---
    useEffect(() => {
        if (location.pathname === '/admin/notifications') {
            setUnreadCount(0);
        }
    }, [location.pathname]);

    // --- Logout Handler ---
    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        dispatch(logout());
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Backend logout cleanup failed:", error);
        }

        navigate("/", { replace: true });
    };

    // --- Desktop Nav Styling ---
    const desktopNavClasses = ({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    // --- Mobile/Tablet Bottom Nav Styling ---
    const mobileNavClasses = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`;

    return (
        <>
            {/* =========================================
                1. DESKTOP VIEW (Top Horizontal Navbar - xl and up)
                ========================================= */}
            <nav className="hidden xl:flex fixed top-0 w-full h-16 bg-card border-b border-border z-50 items-center justify-between px-6 shadow-sm">

                {/* Left: Logo Area */}
                <div className="flex items-center gap-3 w-64 shrink-0">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-foreground tracking-tight leading-none">WorkForce</h1>
                    </div>
                </div>

                {/* Center: Navigation Links (With Text) */}
                <div className="flex items-center justify-center flex-1 gap-2">
                    <NavLink to="/admin/dashboard" className={desktopNavClasses} title="Dashboard">
                        <LayoutDashboard className="w-4.5 h-4.5" /> Dashboard
                    </NavLink>
                    <NavLink to="/admin/employees" className={desktopNavClasses} title="Roster">
                        <Users className="w-4.5 h-4.5" /> Roster
                    </NavLink>
                    <NavLink to="/admin/attendance" className={desktopNavClasses} title="Live Attendance">
                        <Radio className="w-4.5 h-4.5" /> Live Attendance
                    </NavLink>
                    <NavLink to="/admin/progress" className={desktopNavClasses} title="Progress">
                        <TrendingUp className="w-4.5 h-4.5" /> Progress
                    </NavLink>

                    {/* ALERTS LINK WITH BADGE */}
                    <NavLink to="/admin/notifications" className={desktopNavClasses} title="Alerts">
                        <div className="relative flex items-center justify-center">
                            <Bell className="w-4.5 h-4.5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        Alerts
                    </NavLink>

                    <NavLink to="/admin/communication" className={desktopNavClasses} title="Broadcast">
                        <MessageSquare className="w-4.5 h-4.5" /> Broadcast
                    </NavLink>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-3 w-64 shrink-0 border-l border-border pl-6">
                    <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors" title="Theme">
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    </button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-muted-foreground md:cursor-pointer hover:text-foreground hover:bg-muted rounded-full transition-colors" title="Settings">
                        <Settings className="w-5 h-5" />
                    </button>
                    <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive md:cursor-pointer hover:bg-destructive/10 rounded-full transition-colors" title="Log Out">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            {/* =========================================
                2. TABLET/MOBILE VIEW (Top Header - below xl)
                ========================================= */}
            <header className="xl:hidden fixed top-0 left-0 w-full h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
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
                3. TABLET/MOBILE VIEW (Bottom Navigation - below xl)
                ========================================= */}
            <nav className="xl:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe">
                <NavLink to="/admin/dashboard" className={mobileNavClasses}>
                    <LayoutDashboard className="w-6 h-6" />
                </NavLink>

                <NavLink to="/admin/employees" className={mobileNavClasses}>
                    <Users className="w-6 h-6" />
                </NavLink>

                <NavLink to="/admin/attendance" className={mobileNavClasses}>
                    <Radio className="w-6 h-6" />
                </NavLink>

                <NavLink to="/admin/progress" className={mobileNavClasses}>
                    <TrendingUp className="w-6 h-6" />
                </NavLink>

                {/* MOBILE ALERTS LINK WITH BADGE */}
                <NavLink to="/admin/notifications" className={mobileNavClasses}>
                    <div className="relative flex items-center justify-center">
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                </NavLink>

                <NavLink to="/admin/communication" className={mobileNavClasses}>
                    <MessageSquare className="w-6 h-6" />
                </NavLink>
            </nav>

            {/* Modals */}
            <AdminSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
            />
        </>
    );
};

export default AdminSidebar;