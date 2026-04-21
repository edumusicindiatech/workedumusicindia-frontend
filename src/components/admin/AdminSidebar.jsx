import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import {
    LayoutDashboard, Users, Radio, Shield, Megaphone,
    Moon, Sun, Settings, LogOut, TrendingUp, Bell, UserCircle, ClipboardCheck,
    CalendarDays, Film, Trophy, BookOpen, MessageCircle
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { logout } from "../../store/slices/authSlice";
import { toggleTheme } from "../../store/slices/themeSlice";
import AdminSettingsModal from "../../modals/admin/AdminSettingsModal";

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

        // 🚀 ADDED FIX FOR BUG 3: All Call Sounds
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

const AdminSidebar = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { user, token } = useSelector((state) => state.auth);
    const theme = useSelector((state) => state.theme?.mode || 'light');

    const adminName = user?.name || t('sidebar.admin_fallback_name');
    const adminEmail = user?.email || "edumusicindia.tech@gmail.com";

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [userPreferences, setUserPreferences] = useState(user?.preferences || null);

    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [pendingMediaCount, setPendingMediaCount] = useState(0);

    const mobileMenuRef = useRef(null);
    const pathnameRef = useRef(location.pathname);

    useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);
    useEffect(() => { if (user?.preferences) setUserPreferences(user.preferences); }, [user?.preferences]);

    useEffect(() => {
        if (location.pathname.includes('/notifications')) setUnreadCount(0);
        if (location.pathname.includes('/chat')) setUnreadChatCount(0);
    }, [location.pathname]);

    useEffect(() => {
        const handleVisibilityChange = () => { if (!document.hidden && pathnameRef.current.includes('/chat')) setUnreadChatCount(0); };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user) return;
        const fetchPendingMediaCount = async () => {
            try {
                const res = await api.get('/admin/employees');
                if (res.data.success) {
                    const totalPending = res.data.data.reduce((sum, emp) => sum + (emp.pendingCount || 0), 0);
                    setPendingMediaCount(totalPending);
                }
            } catch (error) { }
        };
        fetchPendingMediaCount();
    }, [user, location.pathname]);

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
            // 🚀 NEW: Tell sender it was delivered (Double Grey Tick) globally, even if we are on the Dashboard!
            if (!data.isGroup) {
                socket.emit("message_delivered", {
                    senderId: data.senderId,
                    recipientId: currentUserId
                });
            }

            if (!pathnameRef.current.includes('/chat')) {
                setUnreadChatCount(prev => prev + 1);
                playAudio('notification');
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
        finally { toast.remove(); sessionStorage.setItem('justLoggedOut', 'true'); dispatch(logout()); }
    };

    const desktopNavClasses = ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm whitespace-nowrap shrink-0 ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
    const mobileNavClasses = ({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

    return (
        <>
            <nav className="hidden 2xl:flex fixed top-0 w-full h-16 bg-card border-b border-border z-50 items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-3 shrink-0 mr-2">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                        <span className="text-primary-foreground font-bold text-base">
                            {t('sidebar.brand').charAt(0)}
                        </span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-foreground tracking-tight leading-none">
                            {t('sidebar.brand')}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center justify-start flex-1 min-w-0 gap-1 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <NavLink to="/admin/dashboard" className={desktopNavClasses} title={t('sidebar.dashboard')}><LayoutDashboard className="w-4.5 h-4.5" /> {t('sidebar.dashboard')}</NavLink>
                    <NavLink to="/admin/employees" className={desktopNavClasses} title={t('sidebar.roster')}><Users className="w-4.5 h-4.5" /> {t('sidebar.roster')}</NavLink>
                    <NavLink to="/admin/attendance" className={desktopNavClasses} title={t('sidebar.attendance')}><Radio className="w-4.5 h-4.5" /> {t('sidebar.attendance')}</NavLink>
                    <NavLink to="/admin/learning-hub" className={desktopNavClasses} title={t('sidebar.learning_hub')}><BookOpen className="w-4.5 h-4.5" /> {t('sidebar.learning_hub')}</NavLink>
                    <NavLink to="/admin/progress" className={desktopNavClasses} title={t('sidebar.progress')}><TrendingUp className="w-4.5 h-4.5" /> {t('sidebar.progress')}</NavLink>
                    <NavLink to="/admin/leaderboard" className={desktopNavClasses} title={t('sidebar.leaderboard')}><Trophy className="w-4.5 h-4.5" /> {t('sidebar.leaderboard')}</NavLink>
                    <NavLink to="/admin/reports" className={desktopNavClasses} title={t('sidebar.reports')}><ClipboardCheck className="w-4.5 h-4.5" /> {t('sidebar.reports')}</NavLink>
                    <NavLink to="/admin/media" className={desktopNavClasses} title={t('sidebar.media')}>
                        <div className="relative flex items-center justify-center">
                            <Film className="w-4.5 h-4.5" />
                            {pendingMediaCount > 0 && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse border-2 border-card" />}
                        </div>
                        {t('sidebar.media')}
                    </NavLink>
                    <NavLink to="/admin/leave-requests" className={desktopNavClasses} title={t('sidebar.leave')}><CalendarDays className="w-4.5 h-4.5" /> {t('sidebar.leave')}</NavLink>
                    <NavLink to="/admin/notifications" className={desktopNavClasses} title={t('sidebar.alerts')}>
                        <div className="relative flex items-center justify-center">
                            <Bell className="w-4.5 h-4.5" />
                            {unreadCount > 0 && <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                        </div>
                        {t('sidebar.alerts')}
                    </NavLink>
                    <NavLink to="/admin/chat" className={desktopNavClasses} title={t('sidebar.chat_hub')}>
                        <div className="relative flex items-center justify-center">
                            <MessageCircle className="w-4.5 h-4.5" />
                            {unreadChatCount > 0 && <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}
                        </div>
                        {t('sidebar.chat_hub')}
                    </NavLink>
                    <NavLink to="/admin/communication" className={desktopNavClasses} title={t('sidebar.broadcast')}><Megaphone className="w-4.5 h-4.5" /> {t('sidebar.broadcast')}</NavLink>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 border-l border-border pl-4 ml-2">
                    <button onClick={() => dispatch(toggleTheme())} className="p-2 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors" title={t('sidebar.theme')}>{theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}</button>
                    <button onClick={() => navigate('/admin/profile')} className="p-1 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors flex items-center justify-center w-9 h-9 overflow-hidden border border-border/50" title={t('sidebar.profile')}>
                        {user?.profilePicture ? <img src={user.profilePicture} alt="Admin" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-muted-foreground md:cursor-pointer hover:text-foreground hover:bg-muted rounded-full transition-colors" title={t('sidebar.settings')}><Settings className="w-5 h-5" /></button>
                    <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive md:cursor-pointer hover:bg-destructive/10 rounded-full transition-colors" title={t('sidebar.logout')}><LogOut className="w-5 h-5" /></button>
                </div>
            </nav>

            <header className="2xl:hidden fixed top-0 left-0 w-full h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                        <span className="text-primary-foreground font-bold text-sm">
                            {t('sidebar.brand').charAt(0)}
                        </span>
                    </div>
                    <h1 className="font-bold text-lg text-foreground tracking-tight">
                        {t('sidebar.brand')}
                    </h1>
                </div>

                <div className="relative" ref={mobileMenuRef}>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative p-1 rounded-full hover:bg-muted transition-colors flex items-center justify-center w-10 h-10 overflow-hidden ring-2 ring-transparent focus:ring-primary/20 border border-border/50">
                        {user?.profilePicture ? <img src={user.profilePicture} alt="Admin" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-7 h-7 text-muted-foreground" />}
                    </button>

                    <div className={`absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 origin-top-right transition-all duration-200 ease-out ${isMobileMenuOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}`}>
                        <div className="px-3 py-2 mb-1 border-b border-border">
                            <p className="text-sm font-bold text-foreground truncate">{adminName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{adminEmail}</p>
                        </div>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/learning-hub'); }}><BookOpen className="w-4 h-4 text-primary" /> {t('sidebar.learning_hub')}</button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/leaderboard'); }}><Trophy className="w-4 h-4 text-primary" /> {t('sidebar.leaderboard')}</button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/reports'); }}><ClipboardCheck className="w-4 h-4 text-primary" /> {t('sidebar.reports')}</button>
                        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/media'); }}>
                            <div className="flex items-center gap-3"><Film className="w-4 h-4 text-primary" /> {t('sidebar.media_gallery')}</div>
                            {pendingMediaCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm animate-pulse" />}
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/leave-requests'); }}><CalendarDays className="w-4 h-4 text-primary" /> {t('sidebar.leave')}</button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/communication'); }}><Megaphone className="w-4 h-4 text-primary" /> {t('sidebar.broadcast')}</button>
                        <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <div className="flex items-center gap-3">{theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}<span>{theme === 'dark' ? t('sidebar.light_mode') : t('sidebar.dark_mode')}</span></div>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/profile'); }}>
                            {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-4 h-4 rounded-full object-cover" /> : <UserCircle className="w-4 h-4 text-primary" />}{t('sidebar.profile')}
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }}><Settings className="w-4 h-4 text-primary" /> {t('sidebar.settings')}</button>
                        <div className="my-1 border-t border-border" />
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"><LogOut className="w-4 h-4" /> {t('sidebar.logout')}</button>
                    </div>
                </div>
            </header>

            <nav className="2xl:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto overflow-y-hidden">
                <NavLink to="/admin/dashboard" className={mobileNavClasses}><LayoutDashboard className="w-6 h-6" /></NavLink>
                <NavLink to="/admin/employees" className={mobileNavClasses}><Users className="w-6 h-6" /></NavLink>
                <NavLink to="/admin/progress" className={mobileNavClasses}><TrendingUp className="w-6 h-6" /></NavLink>
                <NavLink to="/admin/attendance" className={mobileNavClasses}><Radio className="w-6 h-6" /></NavLink>
                <NavLink to="/admin/notifications" className={mobileNavClasses}>
                    <div className="relative flex items-center justify-center">
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </div>
                </NavLink>
                <NavLink to="/admin/chat" className={mobileNavClasses}>
                    <div className="relative flex items-center justify-center">
                        <MessageCircle className="w-6 h-6" />
                        {unreadChatCount > 0 && <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}
                    </div>
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