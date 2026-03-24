import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toggleTheme } from "@/store/slices/themeSlice";
import { logout } from "@/store/slices/authSlice";
import api from "../../api/axios";
import { setAxiosToken } from "../../api/axios";
import { io } from "socket.io-client";

import {
    LayoutDashboard, User, Calendar, BellRing, FileText,
    Moon, Sun, LogOut, UserCircle, Settings, ClipboardList
} from "lucide-react";

import EmployeeSettingsModal from "../../modals/employee/EmployeeSettingsModal";

// 1. Setup global socket and audio OUTSIDE the component to prevent re-renders
const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
const notificationSound = new Audio('/sounds/notification-ting.mp3');

const EmployeeNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const [notifCount, setNotifCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const mobileMenuRef = useRef(null);

    // 2. Use a ref to track the path without triggering useEffect
    const pathnameRef = useRef(location.pathname);
    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);
    useEffect(() => {
        // Unlock the ACTUAL global audio instance on first interaction
        const unlockAudio = () => {
            notificationSound.volume = 0; // Mute it so the user doesn't hear the unlock

            notificationSound.play().then(() => {
                // It worked! Instantly pause and reset it for the real notifications
                notificationSound.pause();
                notificationSound.currentTime = 0;
                notificationSound.volume = 1; // Turn volume back up to 100%

                // Cleanup listeners so this only runs once
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('touchstart', unlockAudio);
                console.log("Audio successfully unlocked!");
            }).catch(e => console.log("Still waiting for user interaction..."));
        };

        // Attach to the whole document
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);
    const { user, token } = useSelector((state) => state.auth);
    const themeMode = useSelector((state) => state.theme.mode);

    // 3. --- ONE COMBINED Fetch & Socket useEffect ---
    useEffect(() => {
        if (!user || !token) return;

        // --- FETCH INITIAL COUNT ---
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

        // --- SETUP SOCKET (Aligned perfectly with Admin logic) ---
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        // --- HANDLE THE INCOMING NOTIFICATION ---
        const handleNewNotification = () => {
            // A. Play Audio
            try {
                notificationSound.currentTime = 0;
                notificationSound.play().catch(err => {
                    console.warn("🔇 BROWSER BLOCKED AUDIO! Click anywhere on the Employee page first to allow sound.", err);
                });
            } catch (e) {
                console.error("Error playing sound:", e);
            }

            // B. Increment badge checking the REF
            if (pathnameRef.current !== '/employee/notifications') {
                setNotifCount(prev => prev + 1);
            }
        };

        socket.on("new_notification", handleNewNotification);

        return () => {
            socket.off("new_notification", handleNewNotification);
        };
    }, [user, token]);

    // Auto-Clear Badge when navigating to the alerts page
    useEffect(() => {
        if (location.pathname === '/employee/notifications') {
            setNotifCount(0);
        }
    }, [location.pathname]);

    // Click Outside Mobile Menu
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
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Backend logout failed, forcing local logout:", error);
        } finally {
            setAxiosToken(null);
            dispatch(logout());
            navigate("/");
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
        { path: "/employee/dashboard", icon: <LayoutDashboard className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: "Dashboard" },
        { path: "/employee/assignments", icon: <Calendar className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: "Assigned Schools" },
        { path: "/employee/optional", icon: <ClipboardList className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: "Tasks" },
        { path: "/employee/report", icon: <FileText className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: "Daily Report" },
        {
            path: "/employee/notifications",
            icon: <BellRing className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />,
            label: "Notifications",
            badge: notifCount
        },
        { path: "/employee/profile", icon: <User className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: "My Profile" },
    ];

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-sm h-16">
                <div className="max-w-400 mx-auto px-4 lg:px-6 h-full flex items-center justify-between">

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                            <span className="text-primary-foreground font-bold text-base">W</span>
                        </div>
                        <h1 className="font-display font-bold text-lg text-foreground tracking-tight hidden sm:block">WorkForce</h1>
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
                        <button onClick={() => dispatch(toggleTheme())} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors" title="Toggle Theme">
                            {themeMode === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        </button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors" title="Settings">
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={handleLogout} className="hidden xl:flex p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors" title="Log Out">
                            <LogOut className="w-5 h-5" />
                        </button>

                        <div className="relative xl:hidden" ref={mobileMenuRef}>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                                <UserCircle className="w-7 h-7 text-muted-foreground" />
                            </button>

                            {isMobileMenuOpen && (
                                <div className="absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                                    <div className="px-3 py-2 mb-1 border-b border-border">
                                        <p className="text-sm font-bold text-foreground truncate">{user?.name || "Employee"}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{user?.email || "employee@workforce.com"}</p>
                                    </div>

                                    <NavLink to="/employee/profile" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                        <User className="w-4 h-4" /> My Profile
                                    </NavLink>
                                    <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                        <div className="flex items-center gap-3">
                                            {themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                            <span>{themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                        <Settings className="w-4 h-4" /> Settings
                                    </button>

                                    <div className="my-1 border-t border-border" />

                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                                        <LogOut className="w-4 h-4" /> Log out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <nav className="xl:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto overflow-y-hidden">
                {navItems.filter(item => item.path !== "/employee/profile").map((item) => (
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