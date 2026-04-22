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
    Trophy, BookOpen, HelpCircle, MessageCircle, Download
} from "lucide-react";

import EmployeeSettingsModal from "../../modals/employee/EmployeeSettingsModal";

if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
        autoConnect: true,
    });
}
const socket = window.__GLOBAL_SOCKET__;

if (!window.__GLOBAL_AUDIO__) {
    window.__GLOBAL_AUDIO__ = {
        notification: new Audio('/sounds/notification-ting.mp3'),
        message: new Audio('/sounds/message.mp3'),
        sent: new Audio('/sounds/sent.mp3'),
        calling: new Audio('/sounds/calling.mp3'),
        ringing: new Audio('/sounds/ringing.mp3'),
        incoming: new Audio('/sounds/incoming.mp3'),
        incoming2: new Audio('/sounds/incoming2.mp3'),
        hangup: new Audio('/sounds/hangup.mp3'),
        busy: new Audio('/sounds/busy.mp3'),
        hold: new Audio('/sounds/hold.mp3')
    };
}
const globalAudio = window.__GLOBAL_AUDIO__;

const playAudio = (type) => {
    try {
        const audioStore = window.__GLOBAL_AUDIO__;
        const snd = audioStore?.[type];
        if (snd && snd.paused) {
            snd.currentTime = 0;
            snd.play().catch(e => console.warn(`Audio blocked:`, e));
        }
    } catch (e) { }
};

const EmployeeNavbar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const [notifCount, setNotifCount] = useState(0);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const mobileMenuRef = useRef(null);
    const pathnameRef = useRef(location.pathname);

    const { user, token } = useSelector((state) => state.auth);
    const themeMode = useSelector((state) => state.theme.mode);

    useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);

    // Reset badges when visiting the specific route
    useEffect(() => {
        if (location.pathname.includes('/notifications')) setNotifCount(0);
        if (location.pathname.includes('/chat')) setUnreadChatCount(0);
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

    // 🚀 NEW: FETCH INITIAL UNREAD NOTIFICATIONS COUNT ON LOAD
    useEffect(() => {
        if (!user) return;
        const fetchUnreadCount = async () => {
            try {
                const res = await api.get('/employee/notifications');
                if (res.data.success) {
                    const unread = res.data.data.filter(n => !n.isRead).length;
                    setNotifCount(unread);
                }
            } catch (error) {
                console.error("Failed to fetch initial notifications");
            }
        };
        fetchUnreadCount();
    }, [user]);

    // 🚀 NEW: REAL-TIME SOCKET LISTENER FOR SYSTEM ALERTS & SOS
    useEffect(() => {
        if (!socket) return;

        const handleNewAlert = (data) => {
            // Ignore Silent Refresh pings
            if (data && data.type === "Silent_Refresh") return;

            if (!pathnameRef.current.includes('/notifications')) {
                setNotifCount(prev => prev + 1);
                playAudio('notification'); // Plays notification-ting.mp3
                toast(data?.title || "New System Alert", { icon: '🔔' });
            }
        };

        socket.on('new_notification', handleNewAlert);
        socket.on('sos_alert_received', handleNewAlert);

        return () => {
            socket.off('new_notification', handleNewAlert);
            socket.off('sos_alert_received', handleNewAlert);
        };
    }, []);

    useEffect(() => {
        if (!user || !token) return;

        const currentUserId = user.id || user._id;
        const joinUserRoom = () => {
            socket.emit("join_room", currentUserId);
            socket.emit("join_admin_room");
        };

        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleIncomingChat = (data) => {
            if (!data.isGroup) {
                socket.emit("message_delivered", {
                    senderId: data.senderId,
                    recipientId: currentUserId
                });
            }

            if (!pathnameRef.current.includes('/chat')) {
                setUnreadChatCount(prev => prev + 1);
                playAudio('message'); // 🚀 Plays message.mp3 for chats!
                toast.success(t('toast.new_chat'), { icon: '💬', id: 'new-chat-toast' });
            }
        };

        socket.on("receive_message", handleIncomingChat);

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off("receive_message", handleIncomingChat);
        };
    }, [user, token, t]);

    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        try { await api.post('/auth/logout'); } catch (error) { }
        finally { toast.remove(); sessionStorage.setItem('justLoggedOut', 'true'); setAxiosToken(null); dispatch(logout()); }
    };

    const handleDownloadApp = () => {
        setIsMobileMenuOpen(false);
        const downloadUrl = `${import.meta.env.VITE_BASE_URL || 'http://localhost:5000'}/api/app/download-latest`;
        toast.success(t('toast.download_starting') || "Downloading latest update...");

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            window.open(downloadUrl, '_system');
        } else {
            const link = document.createElement('a');
            link.href = downloadUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const desktopNavClasses = ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium text-sm whitespace-nowrap shrink-0 ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
    const mobileNavClasses = ({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

    const navItems = [
        { path: "/employee/dashboard", icon: <Home className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.dashboard') },
        { path: "/employee/assignments", icon: <CalendarCheck className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.assignments') },
        { path: "/employee/optional", icon: <ListTodo className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.tasks') },
        { path: "/employee/media", icon: <PlaySquare className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.media') },
        { path: "/employee/learning-hub", icon: <BookOpen className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.learning_hub') },
        { path: "/employee/leaderboard", icon: <Trophy className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.leaderboard') },
        { path: "/employee/report", icon: <BarChartBig className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.report') },
        { path: "/employee/help", icon: <HelpCircle className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.help') },
        { path: "/employee/notifications", icon: <Bell className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.notifications'), badge: notifCount },
        { path: "/employee/chat", icon: <MessageCircle className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.chat'), badge: unreadChatCount },
        { path: "/employee/profile", icon: user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-6 h-6 lg:w-5 lg:h-5 rounded-full object-cover shrink-0 border border-border/50" /> : <User className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.profile') },
    ];

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-sm h-16">
                <div className="max-w-400 mx-auto px-4 lg:px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm"><span className="text-primary-foreground font-bold text-base">{t('navbar.brand').charAt(0)}</span></div>
                        <h1 className="font-display font-bold text-base sm:text-lg text-foreground tracking-tight">
                            {t('navbar.brand')}
                        </h1>
                    </div>
                    <nav className="hidden xl:flex items-center gap-1.5 flex-1 justify-start overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {navItems.map((item) => (
                            <NavLink key={item.path} to={item.path} className={desktopNavClasses}>
                                <div className="relative flex items-center justify-center">
                                    {item.icon}
                                    {item.badge > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{item.badge > 99 ? '99+' : item.badge}</span>}
                                </div>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                    <div className="flex items-center justify-end gap-2 shrink-0 sm:border-l border-border sm:pl-4">
                        {/* 🔧 Desktop Download Button (Always Visible) */}
                        <button onClick={handleDownloadApp} className="hidden xl:flex p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title={t('navbar.download_app') || 'Download App'}>
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => dispatch(toggleTheme())} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"><div className="w-5 h-5">{themeMode === 'dark' ? <Moon /> : <Sun className="text-amber-500" />}</div></button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"><Settings className="w-5 h-5" /></button>
                        <button onClick={handleLogout} className="hidden xl:flex p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
                        <div className="relative xl:hidden" ref={mobileMenuRef}>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative p-1 rounded-full hover:bg-muted transition-colors">
                                {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-border" /> : <UserCircle className="w-7 h-7 text-muted-foreground" />}
                            </button>

                            <div className={`absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 origin-top-right transition-all duration-200 ease-out ${isMobileMenuOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}`}>
                                <div className="px-3 py-2.5 mb-1 border-b border-border flex items-center gap-3">
                                    {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-9 h-9 rounded-full object-cover shrink-0 border border-border" /> : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-primary" /></div>}
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold text-foreground truncate">{user?.name || t('navbar.employee')}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</p>
                                    </div>
                                </div>
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/learning-hub'); }}><BookOpen className="w-4 h-4 text-primary" /> {t('navbar.training_vault')}</button>
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/report'); }}><BarChartBig className="w-4 h-4 text-primary" /> {t('navbar.report')}</button>
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/leaderboard'); }}><Trophy className="w-4 h-4 text-primary" /> {t('navbar.leaderboard')}</button>
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/help'); }}><HelpCircle className="w-4 h-4 text-primary" /> {t('navbar.help')}</button>
                                <NavLink to="/employee/profile" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><User className="w-4 h-4" /> {t('navbar.profile')}</NavLink>
                                <button onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Settings className="w-4 h-4 text-primary" /> {t('navbar.settings')}</button>

                                <div className="my-1 border-t border-border" />

                                {/* --- NEW DOWNLOAD APP OPTION --- */}
                                <button onClick={handleDownloadApp} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                    <Download className="w-4 h-4 text-primary" /> {t('navbar.download_app') || 'Download App'}
                                </button>

                                <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><div className="flex items-center gap-3">{themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}<span>{themeMode === 'dark' ? t('navbar.dark_mode') : t('navbar.light_mode')}</span></div></button>
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-1"><LogOut className="w-4 h-4" /> {t('navbar.logout')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="xl:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto overflow-y-hidden">
                {navItems.filter(item => !["/employee/profile", "/employee/leaderboard", "/employee/report", "/employee/learning-hub", "/employee/help"].includes(item.path)).map((item) => (
                    <NavLink key={item.path} to={item.path} className={mobileNavClasses} title={item.label}>
                        <div className="relative mt-1">
                            {item.icon}
                            {item.badge > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{item.badge > 99 ? '99+' : item.badge}</span>}
                        </div>
                    </NavLink>
                ))}
            </nav>

            <EmployeeSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
        </>
    );
};

export default EmployeeNavbar;