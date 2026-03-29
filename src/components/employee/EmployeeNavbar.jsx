import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toggleTheme } from "@/store/slices/themeSlice";
import { logout } from "@/store/slices/authSlice";
import api from "../../api/axios";
import { setAxiosToken } from "../../api/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import {
    Home, User, CalendarCheck, Bell, BarChartBig,
    Moon, Sun, LogOut, UserCircle, Settings, ListTodo, PlaySquare,
    Trophy
} from "lucide-react";

import EmployeeSettingsModal from "../../modals/employee/EmployeeSettingsModal";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");
const notificationSound = new Audio('/sounds/notification-ting.mp3');

const EmployeeNavbar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const [notifCount, setNotifCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const mobileMenuRef = useRef(null);

    const pathnameRef = useRef(location.pathname);
    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        const unlockAudio = () => {
            notificationSound.volume = 0;
            notificationSound.play().then(() => {
                notificationSound.pause();
                notificationSound.currentTime = 0;
                notificationSound.volume = 1;
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('touchstart', unlockAudio);
            }).catch(e => console.log("Still waiting for user interaction..."));
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    const { user, token } = useSelector((state) => state.auth);
    const themeMode = useSelector((state) => state.theme.mode);

    useEffect(() => {
        if (!user || !token) return;

        const fetchInitialUnreadCount = async () => {
            try {
                const response = await api.get('/employee/notifications');
                if (response.data.success) {
                    const unread = response.data.data.filter(n => !n.isRead).length;
                    setNotifCount(unread);
                }
            } catch (error) {
                console.error("Failed to fetch initial notifications count:", error);
            }
        };

        if (pathnameRef.current !== '/employee/notifications') {
            fetchInitialUnreadCount();
        }

        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleNewNotification = () => {
            try {
                notificationSound.currentTime = 0;
                notificationSound.play().catch(err => {
                    console.warn("🔇 BROWSER BLOCKED AUDIO!", err);
                });
            } catch (e) {
                console.error("Error playing sound:", e);
            }

            if (pathnameRef.current !== '/employee/notifications') {
                setNotifCount(prev => prev + 1);
                toast(t('navbar.new_notif_toast'), { icon: '🔔' });
            }
        };

        socket.on("new_notification", handleNewNotification);
        socket.on("leaderboard_refresh", handleNewNotification);
        socket.on('new_notification_for_user', handleNewNotification);

        return () => {
            socket.off("new_notification", handleNewNotification);
            socket.off("leaderboard_refresh", handleNewNotification);
            socket.off('new_notification_for_user', handleNewNotification);
        };
    }, [user, token, t]);

    useEffect(() => {
        if (location.pathname === '/employee/notifications') {
            setNotifCount(0);
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
        const toastId = toast.loading(t('navbar.logging_out'));
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Backend logout failed, forcing local logout:", error);
        } finally {
            toast.dismiss(toastId);
            setAxiosToken(null);
            dispatch(logout());
            navigate("/", { replace: true });

            setTimeout(() => {
                toast.success(t('navbar.logout_success'), { duration: 3000 });
            }, 100);
        }
    };

    const desktopNavClasses = ({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium text-sm ${isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;

    const mobileNavClasses = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`;

    const navItems = [
        { path: "/employee/dashboard", icon: <Home className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.dashboard') },
        { path: "/employee/assignments", icon: <CalendarCheck className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.assignments') },
        { path: "/employee/optional", icon: <ListTodo className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.tasks') },
        { path: "/employee/media", icon: <PlaySquare className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.media') },
        { path: "/employee/leaderboard", icon: <Trophy className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.leaderboard') || 'Leaderboard' },
        { path: "/employee/report", icon: <BarChartBig className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.report') },
        {
            path: "/employee/notifications",
            icon: <Bell className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />,
            label: t('navbar.notifications'),
            badge: notifCount
        },
        {
            path: "/employee/profile",
            // 🔥 UPGRADED: Uses profile picture if available, falls back to User icon
            icon: user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="w-6 h-6 lg:w-5 lg:h-5 rounded-full object-cover shrink-0 border border-border/50" />
            ) : (
                <User className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />
            ),
            label: t('navbar.profile')
        },
    ];

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-sm h-16">
                <div className="max-w-400 mx-auto px-4 lg:px-6 h-full flex items-center justify-between">

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                            <span className="text-primary-foreground font-bold text-base">W</span>
                        </div>
                        <h1 className="font-display font-bold text-lg text-foreground tracking-tight hidden sm:block">{t('navbar.brand')}</h1>
                    </div>

                    <nav className="hidden xl:flex items-center gap-1.5 flex-1 justify-center">
                        {navItems.map((item) => (
                            <NavLink key={item.path} to={item.path} className={desktopNavClasses}>
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

                    <div className="flex items-center justify-end gap-2 shrink-0 sm:border-l border-border sm:pl-4">
                        <button onClick={() => dispatch(toggleTheme())} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors" title={t('navbar.theme_tooltip')}>
                            {themeMode === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        </button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors" title={t('navbar.settings')}>
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={handleLogout} className="hidden xl:flex p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors" title={t('navbar.logout')}>
                            <LogOut className="w-5 h-5" />
                        </button>

                        <div className="relative xl:hidden" ref={mobileMenuRef}>
                            {/* 🔥 UPGRADED: Mobile Dropdown Toggle uses Profile Picture */}
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 rounded-full hover:bg-muted transition-colors">
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-border" />
                                ) : (
                                    <UserCircle className="w-7 h-7 text-muted-foreground" />
                                )}
                            </button>

                            {isMobileMenuOpen && (
                                <div className="absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-50">

                                    {/* 🔥 UPGRADED: Enhanced Menu Header with Avatar */}
                                    <div className="px-3 py-2.5 mb-1 border-b border-border flex items-center gap-3">
                                        {user?.profilePicture ? (
                                            <img src={user.profilePicture} alt="Profile" className="w-9 h-9 rounded-full object-cover shrink-0 border border-border" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 text-primary" />
                                            </div>
                                        )}
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-foreground truncate">{user?.name || "Employee"}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</p>
                                        </div>
                                    </div>

                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/report'); }}
                                    >
                                        <BarChartBig className="w-4 h-4 text-primary" /> {t('navbar.report') || 'Daily Report'}
                                    </button>

                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/leaderboard'); }}
                                    >
                                        <Trophy className="w-4 h-4 text-primary" /> {t('navbar.leaderboard') || 'Leaderboard'}
                                    </button>

                                    <NavLink to="/employee/profile" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                        <User className="w-4 h-4" /> {t('navbar.profile')}
                                    </NavLink>

                                    <div className="my-1 border-t border-border" />

                                    <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                        <div className="flex items-center gap-3">
                                            {themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                            <span>{themeMode === 'dark' ? t('navbar.dark_mode') : t('navbar.light_mode')}</span>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                        <Settings className="w-4 h-4" /> {t('navbar.settings')}
                                    </button>

                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-1">
                                        <LogOut className="w-4 h-4" /> {t('navbar.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Taskbar filters out Profile, LEADERBOARD, and Report for a clean 5-item look with Media */}
            <nav className="xl:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto overflow-y-hidden">
                {navItems.filter(item => !["/employee/profile", "/employee/leaderboard", "/employee/report"].includes(item.path)).map((item) => (
                    <NavLink key={item.path} to={item.path} className={mobileNavClasses} title={item.label}>
                        <div className="relative mt-1">
                            {item.icon}
                            {item.badge > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full border-2 border-card">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    </NavLink>
                ))}
            </nav>

            <EmployeeSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
        </>
    );
};

export default EmployeeNavbar;