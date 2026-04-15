import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import {
    LayoutDashboard, Users, Radio, Shield, Megaphone,
    Moon, Sun, Settings, LogOut, TrendingUp, Bell, UserCircle, ClipboardCheck,
    CalendarDays, Film, Trophy, BookOpen, X, MessageCircle, PhoneIncoming, PhoneOff, Phone
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { logout } from "../../store/slices/authSlice";
import { toggleTheme } from "../../store/slices/themeSlice";
import AdminSettingsModal from "../../modals/admin/AdminSettingsModal";
import { Button } from "@/components/ui/button";

// --- GLOBAL SOCKET SINGLETON ---
if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
        autoConnect: true,
    });
}
const socket = window.__GLOBAL_SOCKET__;

// --- AUDIO SETUP ---
const notificationSound = new Audio('/sounds/notification-ting.mp3');
const sosBeepSound = new Audio('/sounds/beep.mp3');
const chatMessageSound = new Audio('/sounds/message.mp3');
const incomingAudio = new Audio('/sounds/incoming.mp3'); // NEW: Global ringtone

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
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [pendingMediaCount, setPendingMediaCount] = useState(0);

    // NEW: Global Incoming Call State
    const [globalIncomingCall, setGlobalIncomingCall] = useState(null);

    const mobileMenuRef = useRef(null);
    const pathnameRef = useRef(location.pathname);

    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        if (user?.preferences) setUserPreferences(user.preferences);
    }, [user?.preferences]);

    // --- BROWSER AUDIO UNLOCKING ---
    useEffect(() => {
        const unlockAudio = () => {
            const sounds = [notificationSound, sosBeepSound, chatMessageSound, incomingAudio];
            sounds.forEach(snd => {
                snd.volume = 0;
                snd.play().then(() => {
                    snd.pause();
                    snd.currentTime = 0;
                    snd.volume = 1;
                }).catch(() => { });
            });

            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    // --- 60 SEC AUTO HANGUP FOR GLOBAL CALLS ---
    useEffect(() => {
        if (globalIncomingCall) {
            const timer = setTimeout(() => {
                socket.emit('end_call', { to: globalIncomingCall.from });
                setGlobalIncomingCall(null);
                incomingAudio.pause();
                toast.error(`Missed call from ${globalIncomingCall.callerName}`);
            }, 60000);
            return () => clearTimeout(timer);
        }
    }, [globalIncomingCall]);

    useEffect(() => {
        if (!user) return;

        const fetchPendingMediaCount = async () => {
            try {
                const res = await api.get('/admin/employees');
                if (res.data.success) {
                    const totalPending = res.data.data.reduce((sum, emp) => sum + (emp.pendingCount || 0), 0);
                    setPendingMediaCount(totalPending);
                }
            } catch (error) { console.error("Failed to fetch pending media", error); }
        };
        fetchPendingMediaCount();
    }, [user, location.pathname]);

    useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            try {
                const res = await api.get('/admin/notifications');
                if (res.data.success) {
                    const unread = res.data.data.filter(n => !n.isRead && !n.isHidden).length;
                    setUnreadCount(unread);
                }
            } catch (error) { console.error("Failed to fetch global notifications count", error); }
        };

        if (pathnameRef.current !== '/admin/notifications') fetchUnreadCount();

        const currentUserId = user.id || user._id;

        const joinUserRoom = () => {
            socket.emit("join_room", currentUserId);
            socket.emit("join_admin_room");
        };

        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleIncomingChat = () => {
            if (pathnameRef.current !== '/admin/chat' || document.hidden) {
                setUnreadChatCount(prev => prev + 1);
                try {
                    chatMessageSound.currentTime = 0;
                    chatMessageSound.play().catch(e => console.warn("Audio blocked", e));
                } catch (e) { }
                toast.success(`New chat message received`, { icon: '💬', id: 'admin-new-chat' });
            }
        };

        // --- NEW: LISTEN FOR INCOMING CALLS GLOBALLY ---
        const handleIncomingCall = (data) => {
            if (pathnameRef.current.includes('/chat')) return; // SharedChat handles it directly if on page
            setGlobalIncomingCall(data);
            try {
                incomingAudio.loop = true;
                incomingAudio.currentTime = 0;
                incomingAudio.play().catch(e => console.warn("Audio blocked", e));
            } catch (e) { }
        };

        const handleCallEnded = () => {
            setGlobalIncomingCall(null);
            try {
                incomingAudio.pause();
            } catch (e) { }
        };

        const handleNewNotification = (notif) => {
            try {
                notificationSound.currentTime = 0;
                notificationSound.play().catch(err => { console.warn("🔇 BROWSER BLOCKED AUDIO!", err); });
            } catch (e) { }

            if (pathnameRef.current !== '/admin/notifications') {
                setUnreadCount(prev => prev + 1);
                toast(t('sidebar.new_alert_toast'), { icon: '🛡️' });
            }

            if (notif?.type === 'Media' || (notif?.title && notif.title.toLowerCase().includes('media'))) {
                setPendingMediaCount(prev => prev + 1);
            }
        };

        const handleIncomingSOS = (data) => {
            const { senderName, lat, lng } = data;

            try {
                sosBeepSound.currentTime = 0;
                sosBeepSound.play().catch(e => console.warn("Audio blocked", e));
            } catch (e) { }

            if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);

            if (pathnameRef.current !== '/admin/notifications') setUnreadCount(prev => prev + 1);

            toast.custom(
                (toastObj) => (
                    <div className={`${toastObj.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-red-600 shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className="ml-1 flex-1">
                                    <p className="text-lg font-black text-white drop-shadow-md">{t('sos_alert.title')}</p>
                                    <p className="mt-1 text-sm text-white/90 font-medium"><strong>{senderName}</strong> {t('sos_alert.description')}</p>
                                    <Button size="sm" className="mt-3 bg-white text-red-600 hover:bg-gray-100 font-bold shadow-sm w-full" onClick={() => window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')}>
                                        {t('sos_alert.btn_view_location')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-l border-red-700/50">
                            <button onClick={() => toast.dismiss(toastObj.id)} className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ),
                { duration: 30000, id: `admin-sos-alert-${senderName}`, position: "top-right" }
            );
        };

        socket.on("receive_message", handleIncomingChat);
        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_ended", handleCallEnded);
        socket.on("new_notification", handleNewNotification);
        socket.on("admin_leaderboard_refresh", handleNewNotification);
        socket.on("sos_alert_received", handleIncomingSOS);

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off("receive_message", handleIncomingChat);
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_ended", handleCallEnded);
            socket.off("new_notification", handleNewNotification);
            socket.off("admin_leaderboard_refresh", handleNewNotification);
            socket.off("sos_alert_received", handleIncomingSOS);
        };
    }, [user, t]);

    useEffect(() => {
        if (location.pathname === '/admin/notifications') setUnreadCount(0);
        if (location.pathname === '/admin/chat') setUnreadChatCount(0);
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
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Backend logout cleanup failed:", error);
        } finally {
            toast.remove();
            sessionStorage.setItem('justLoggedOut', 'true');
            dispatch(logout());
        }
    };

    const desktopNavClasses = ({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm whitespace-nowrap shrink-0 ${isActive
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
            {/* --- DESKTOP TOP NAVBAR --- */}
            <nav className="hidden 2xl:flex fixed top-0 w-full h-16 bg-card border-b border-border z-50 items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-3 shrink-0 mr-2">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-foreground tracking-tight leading-none">{t('sidebar.brand')}</h1>
                    </div>
                </div>

                <div className="flex items-center justify-start flex-1 min-w-0 gap-1 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <NavLink to="/admin/dashboard" className={desktopNavClasses} title={t('sidebar.dashboard')}>
                        <LayoutDashboard className="w-4.5 h-4.5" /> {t('sidebar.dashboard')}
                    </NavLink>
                    <NavLink to="/admin/employees" className={desktopNavClasses} title={t('sidebar.roster')}>
                        <Users className="w-4.5 h-4.5" /> {t('sidebar.roster')}
                    </NavLink>
                    <NavLink to="/admin/attendance" className={desktopNavClasses} title={t('sidebar.attendance')}>
                        <Radio className="w-4.5 h-4.5" /> {t('sidebar.attendance')}
                    </NavLink>
                    <NavLink to="/admin/learning-hub" className={desktopNavClasses} title={t('sidebar.learning_hub') || 'Training Vault'}>
                        <BookOpen className="w-4.5 h-4.5" /> {t('sidebar.learning_hub') || 'Learn'}
                    </NavLink>
                    <NavLink to="/admin/progress" className={desktopNavClasses} title={t('sidebar.progress')}>
                        <TrendingUp className="w-4.5 h-4.5" /> {t('sidebar.progress')}
                    </NavLink>
                    <NavLink to="/admin/leaderboard" className={desktopNavClasses} title={t('sidebar.leaderboard') || 'Leaderboard'}>
                        <Trophy className="w-4.5 h-4.5" /> {t('sidebar.leaderboard') || 'Leaderboard'}
                    </NavLink>
                    <NavLink to="/admin/reports" className={desktopNavClasses} title={t('sidebar.reports')}>
                        <ClipboardCheck className="w-4.5 h-4.5" /> {t('sidebar.reports')}
                    </NavLink>
                    <NavLink to="/admin/media" className={desktopNavClasses} title={t('sidebar.media') || 'Media Gallery'}>
                        <div className="relative flex items-center justify-center">
                            <Film className="w-4.5 h-4.5" />
                            {pendingMediaCount > 0 && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse border-2 border-card" />}
                        </div>
                        {t('sidebar.media') || 'Media'}
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
                    
                    <NavLink to="/admin/chat" className={desktopNavClasses} title="Chat Hub">
                        <div className="relative flex items-center justify-center">
                            <MessageCircle className="w-4.5 h-4.5" />
                            {unreadChatCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">
                                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                                </span>
                            )}
                        </div>
                        Chat Hub
                    </NavLink>

                    <NavLink to="/admin/communication" className={desktopNavClasses} title={t('sidebar.broadcast')}>
                        <Megaphone className="w-4.5 h-4.5" /> {t('sidebar.broadcast')}
                    </NavLink>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 border-l border-border pl-4 ml-2">
                    <button onClick={() => dispatch(toggleTheme())} className="p-2 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors" title={t('sidebar.theme')}>
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    </button>
                    <button onClick={() => navigate('/admin/profile')} className="p-1 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors flex items-center justify-center w-9 h-9 overflow-hidden border border-border/50" title={t('sidebar.profile') || 'My Profile'}>
                        {user?.profilePicture ? <img src={user.profilePicture} alt="Admin" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-muted-foreground md:cursor-pointer hover:text-foreground hover:bg-muted rounded-full transition-colors" title={t('sidebar.settings')}>
                        <Settings className="w-5 h-5" />
                    </button>
                    <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive md:cursor-pointer hover:bg-destructive/10 rounded-full transition-colors" title={t('sidebar.logout')}>
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            {/* --- MOBILE TOP NAVBAR --- */}
            <header className="2xl:hidden fixed top-0 left-0 w-full h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                        <Shield className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h1 className="font-bold text-lg text-foreground tracking-tight">{t('sidebar.brand')}</h1>
                </div>

                <div className="relative" ref={mobileMenuRef}>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative p-1 rounded-full hover:bg-muted transition-colors flex items-center justify-center w-10 h-10 overflow-hidden ring-2 ring-transparent focus:ring-primary/20 border border-border/50">
                        {user?.profilePicture ? <img src={user.profilePicture} alt="Admin" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-7 h-7 text-muted-foreground" />}
                        {unreadChatCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-card" />}
                    </button>

                    {isMobileMenuOpen && (
                        <div className="absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                            <div className="px-3 py-2 mb-1 border-b border-border">
                                <p className="text-sm font-bold text-foreground truncate">{adminName}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{adminEmail}</p>
                            </div>

                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/learning-hub'); }}
                            >
                                <BookOpen className="w-4 h-4 text-primary" /> {t('sidebar.learning_hub') || 'Training Vault'}
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/leaderboard'); }}
                            >
                                <Trophy className="w-4 h-4 text-primary" /> {t('sidebar.leaderboard') || 'Leaderboard'}
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/reports'); }}
                            >
                                <ClipboardCheck className="w-4 h-4 text-primary" /> {t('sidebar.reports')}
                            </button>

                            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/media'); }}
                            >
                                <div className="flex items-center gap-3">
                                    <Film className="w-4 h-4 text-primary" /> {t('sidebar.media') || 'Media Gallery'}
                                </div>
                                {pendingMediaCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm animate-pulse" />}
                            </button>

                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/leave-requests'); }}
                            >
                                <CalendarDays className="w-4 h-4 text-primary" /> {t('sidebar.leave')}
                            </button>
                            
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/communication'); }}
                            >
                                <Megaphone className="w-4 h-4 text-primary" /> {t('sidebar.broadcast')}
                            </button>

                            <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                    <span>{theme === 'dark' ? t('sidebar.light_mode') : t('sidebar.dark_mode')}</span>
                                </div>
                            </button>

                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/profile'); }}
                            >
                                {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-4 h-4 rounded-full object-cover" /> : <UserCircle className="w-4 h-4 text-primary" />}
                                {t('sidebar.profile') || 'My Profile'}
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

            {/* --- MOBILE BOTTOM NAVBAR --- */}
            <nav className="2xl:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe">
                <NavLink to="/admin/dashboard" className={mobileNavClasses}>
                    <LayoutDashboard className="w-6 h-6" />
                </NavLink>
                <NavLink to="/admin/employees" className={mobileNavClasses}>
                    <Users className="w-6 h-6" />
                </NavLink>
                <NavLink to="/admin/progress" className={mobileNavClasses}>
                    <TrendingUp className="w-6 h-6" />
                </NavLink>
                <NavLink to="/admin/attendance" className={mobileNavClasses}>
                    <Radio className="w-6 h-6" />
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
                
                <NavLink to="/admin/chat" className={mobileNavClasses}>
                    <div className="relative flex items-center justify-center">
                        <MessageCircle className="w-6 h-6" />
                        {unreadChatCount > 0 && (
                            <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">
                                {unreadChatCount > 99 ? '99+' : unreadChatCount}
                            </span>
                        )}
                    </div>
                </NavLink>
            </nav>

            {/* --- GLOBAL INCOMING CALL MODAL --- */}
            {globalIncomingCall && (
                <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                    <div className="bg-card dark:bg-[#13151A] p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-80 text-center animate-in zoom-in-95 border border-border">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.4)]">
                            <PhoneIncoming className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{globalIncomingCall.callerName}</h2>
                            <p className="text-sm text-muted-foreground mt-1">is calling you...</p>
                        </div>
                        <div className="flex items-center gap-6 w-full justify-center mt-2">
                            <button onClick={() => {
                                socket.emit('end_call', { to: globalIncomingCall.from });
                                setGlobalIncomingCall(null);
                                incomingAudio.pause();
                            }} className="w-14 h-14 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
                                <PhoneOff className="w-6 h-6" />
                            </button>
                            <button onClick={() => {
                                incomingAudio.pause();
                                setGlobalIncomingCall(null);
                                navigate('/admin/chat', { state: { incomingCall: globalIncomingCall, autoAccept: true } });
                            }} className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
                                <Phone className="w-6 h-6 fill-current" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

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