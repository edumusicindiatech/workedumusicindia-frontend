import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import {
    LayoutDashboard, Users, Radio, MessageSquare, Shield,
    Moon, Sun, Settings, LogOut, TrendingUp, Bell, UserCircle, ClipboardCheck,
    CalendarDays, Film // <-- Added Film icon
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { logout } from "../../store/slices/authSlice";
import { toggleTheme } from "../../store/slices/themeSlice";
import AdminSettingsModal from "../../modals/admin/AdminSettingsModal";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");
const notificationSound = new Audio('/sounds/notification-ting.mp3');

const AdminSidebar = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { user } = useSelector((state) => state.auth);
    const theme = useSelector((state) => state.theme?.mode || 'light');

    const adminName = user?.name || "Admin User";
    const adminEmail = user?.email || "edumusicindia.tech@gmail.com";

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [userPreferences, setUserPreferences] = useState(user?.preferences || null);
    const [unreadCount, setUnreadCount] = useState(0);

    const mobileMenuRef = useRef(null);
    const pathnameRef = useRef(location.pathname);

    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        if (user?.preferences) {
            setUserPreferences(user.preferences);
        }
    }, [user?.preferences]);

    useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            try {
                const res = await api.get('/admin/notifications');
                if (res.data.success) {
                    const unread = res.data.data.filter(n => !n.isRead && !n.isHidden).length;
                    setUnreadCount(unread);
                }
            } catch (error) {
                console.error("Failed to fetch global notifications count", error);
                toast.error("Failed to sync notifications.");
            }
        };

        if (pathnameRef.current !== '/admin/notifications') {
            fetchUnreadCount();
        }

        const currentUserId = user.id || user._id;
        const joinUserRoom = () => {
            socket.emit("join_room", currentUserId);
        };
        if (socket.connected) {
            joinUserRoom();
        }
        socket.on("connect", joinUserRoom);

        const handleNewNotification = () => {
            try {
                notificationSound.currentTime = 0;
                notificationSound.play().catch(err => {
                    console.warn("🔇 BROWSER BLOCKED AUDIO!", err);
                });
            } catch (e) {
                console.error("Error playing sound:", e);
            }

            if (pathnameRef.current !== '/admin/notifications') {
                setUnreadCount(prev => prev + 1);
                toast(t('sidebar.new_alert_toast'), { icon: '🛡️' });
            }
        };

        socket.on("new_notification", handleNewNotification);

        return () => {
            socket.off("new_notification", handleNewNotification);
        };
    }, [user, t]);

    useEffect(() => {
        if (location.pathname === '/admin/notifications') {
            setUnreadCount(0);
        }
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        dispatch(logout());
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        const toastId = toast.loading(t('sidebar.logging_out'));
        try {
            await api.post('/auth/logout');
            toast.success(t('sidebar.logout_success'), { id: toastId });
        } catch (error) {
            console.error("Backend logout cleanup failed:", error);
            toast.error(t('sidebar.logout_error'), { id: toastId });
        }

        navigate("/", { replace: true });
    };

    const desktopNavClasses = ({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    const mobileNavClasses = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`;

    return (
        <>
            <nav className="hidden xl:flex fixed top-0 w-full h-16 bg-card border-b border-border z-50 items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-3 w-64 shrink-0">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-foreground tracking-tight leading-none">{t('sidebar.brand')}</h1>
                    </div>
                </div>

                <div className="flex items-center justify-center flex-1 gap-2">
                    <NavLink to="/admin/dashboard" className={desktopNavClasses} title={t('sidebar.dashboard')}>
                        <LayoutDashboard className="w-4.5 h-4.5" /> {t('sidebar.dashboard')}
                    </NavLink>
                    <NavLink to="/admin/employees" className={desktopNavClasses} title={t('sidebar.roster')}>
                        <Users className="w-4.5 h-4.5" /> {t('sidebar.roster')}
                    </NavLink>
                    <NavLink to="/admin/attendance" className={desktopNavClasses} title={t('sidebar.attendance')}>
                        <Radio className="w-4.5 h-4.5" /> {t('sidebar.attendance')}
                    </NavLink>
                    <NavLink to="/admin/progress" className={desktopNavClasses} title={t('sidebar.progress')}>
                        <TrendingUp className="w-4.5 h-4.5" /> {t('sidebar.progress')}
                    </NavLink>
                    <NavLink to="/admin/reports" className={desktopNavClasses} title={t('sidebar.reports')}>
                        <ClipboardCheck className="w-4.5 h-4.5" /> {t('sidebar.reports')}
                    </NavLink>

                    {/* ---> ADDED MEDIA LINK HERE <--- */}
                    <NavLink to="/admin/media" className={desktopNavClasses} title={t('sidebar.media') || 'Media Gallery'}>
                        <Film className="w-4.5 h-4.5" /> {t('sidebar.media') || 'Media'}
                    </NavLink>

                    <NavLink to="/admin/leave-requests" className={desktopNavClasses} title={t('sidebar.leave')}>
                        <CalendarDays className="w-4.5 h-4.5" /> {t('sidebar.leave')}
                    </NavLink>
                    <NavLink to="/admin/notifications" className={desktopNavClasses} title={t('sidebar.alerts')}>
                        <div className="relative flex items-center justify-center">
                            <Bell className="w-4.5 h-4.5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        {t('sidebar.alerts')}
                    </NavLink>
                    <NavLink to="/admin/communication" className={desktopNavClasses} title={t('sidebar.broadcast')}>
                        <MessageSquare className="w-4.5 h-4.5" /> {t('sidebar.broadcast')}
                    </NavLink>
                </div>

                <div className="flex items-center justify-end gap-3 w-64 shrink-0 border-l border-border pl-6">
                    <button onClick={() => dispatch(toggleTheme())} className="p-2 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors" title={t('sidebar.theme')}>
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    </button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-muted-foreground md:cursor-pointer hover:text-foreground hover:bg-muted rounded-full transition-colors" title={t('sidebar.settings')}>
                        <Settings className="w-5 h-5" />
                    </button>
                    <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive md:cursor-pointer hover:bg-destructive/10 rounded-full transition-colors" title={t('sidebar.logout')}>
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <header className="xl:hidden fixed top-0 left-0 w-full h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                        <Shield className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h1 className="font-bold text-lg text-foreground tracking-tight">{t('sidebar.brand')}</h1>
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

                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/reports'); }}
                            >
                                <ClipboardCheck className="w-4 h-4 text-primary" /> {t('sidebar.reports')}
                            </button>

                            {/* ---> ADDED MEDIA LINK HERE IN MOBILE DROPDOWN <--- */}
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/media'); }}
                            >
                                <Film className="w-4 h-4 text-primary" /> {t('sidebar.media') || 'Media Gallery'}
                            </button>

                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/leave-requests'); }}
                            >
                                <CalendarDays className="w-4 h-4 text-primary" /> {t('sidebar.leave')}
                            </button>

                            <button onClick={() => dispatch(toggleTheme())} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                    <span>{theme === 'dark' ? t('sidebar.light_mode') : t('sidebar.dark_mode')}</span>
                                </div>
                            </button>

                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }}
                            >
                                <Settings className="w-4 h-4 text-primary" /> {t('sidebar.settings')}
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                                <LogOut className="w-4 h-4" /> {t('sidebar.logout')}
                            </button>
                        </div>
                    )}
                </div>
            </header>

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

            <AdminSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                currentPreferences={userPreferences}
                onSaveSuccess={(newPreferences) => {
                    setUserPreferences(newPreferences);
                }}
            />
        </>
    );
};

export default AdminSidebar;