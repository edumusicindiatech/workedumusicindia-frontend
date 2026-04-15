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
import CallOverlay from "../../pages/shared/CallOverlay";

// --- GLOBAL SOCKET SINGLETON ---
if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
        autoConnect: true,
    });
}
const socket = window.__GLOBAL_SOCKET__;

// --- GLOBAL AUDIO SINGLETON ---
if (!window.__GLOBAL_AUDIO__) {
    window.__GLOBAL_AUDIO__ = {
        notification: new Audio('/sounds/notification-ting.mp3'),
        sos: new Audio('/sounds/beep.mp3'),
        message: new Audio('/sounds/message.mp3'),
        incoming: new Audio('/sounds/incoming.mp3'),
        hangup: new Audio('/sounds/hangup.mp3'),
        sent: new Audio('/sounds/sent.mp3'),
        calling: new Audio('/sounds/calling.mp3'), // <-- ADDED
        ringing: new Audio('/sounds/ringing.mp3'), // <-- ADDED
    };
}
const globalAudio = window.__GLOBAL_AUDIO__;

const playAudio = (type) => {
    try {
        const snd = globalAudio[type];
        if (snd) {
            snd.currentTime = 0;
            snd.play().catch(e => console.warn(`Audio blocked for ${type}:`, e));
        }
    } catch (e) { }
};

const pauseAudio = (type) => {
    try {
        const snd = globalAudio[type];
        if (snd) {
            snd.pause();
            snd.currentTime = 0;
        }
    } catch (e) { }
};

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

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

    // --- GLOBAL WEBRTC CALL STATE ---
    const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(false);
    const [callPeer, setCallPeer] = useState(null);
    const [isMinimizedCall, setIsMinimizedCall] = useState(false);
    const [isCallAccepted, setIsCallAccepted] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);

    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const mobileMenuRef = useRef(null);

    const pathnameRef = useRef(location.pathname);

    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        if (user?.preferences) setUserPreferences(user.preferences);
    }, [user?.preferences]);

    useEffect(() => {
        const unlockAudio = () => {
            Object.values(globalAudio).forEach(snd => {
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

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && pathnameRef.current.includes('/chat')) {
                setUnreadChatCount(0);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (globalIncomingCall && !activeCall) {
            const timer = setTimeout(() => {
                socket.emit('end_call', { to: globalIncomingCall.from });
                setGlobalIncomingCall(null);
                pauseAudio('incoming');
                toast.error(`Missed call from ${globalIncomingCall.callerName}`);
            }, 60000);
            return () => clearTimeout(timer);
        }
    }, [globalIncomingCall, activeCall]);

    // --- OUTGOING CALL AUDIO TRACKER ---
    useEffect(() => {
        if (activeCall && !isCallAccepted && callPeer) {
            const isPeerOnline = onlineUsers.includes(String(callPeer._id || callPeer.id));
            if (isPeerOnline) {
                pauseAudio('calling');
                globalAudio.ringing.loop = true;
                playAudio('ringing');
            } else {
                pauseAudio('ringing');
                globalAudio.calling.loop = true;
                playAudio('calling');
            }
        } else {
            pauseAudio('calling');
            pauseAudio('ringing');
        }

        return () => {
            pauseAudio('calling');
            pauseAudio('ringing');
        };
    }, [activeCall, isCallAccepted, callPeer, onlineUsers]);

    // --- WEBRTC LOGIC ---
    const setupMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (e) {
            toast.error("Microphone access denied.");
            return null;
        }
    };

    const cleanupCall = () => {
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        if (pcRef.current) pcRef.current.close();
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

        pcRef.current = null;
        localStreamRef.current = null;
        setActiveCall(false);
        setCallPeer(null);
        setGlobalIncomingCall(null);
        setIsMinimizedCall(false);
        setIsCallAccepted(false);
    };

    const handleAcceptCall = async () => {
        if (!globalIncomingCall) return;
        const callData = globalIncomingCall;

        const stream = await setupMedia();
        if (!stream) return;

        setActiveCall(true);
        setCallPeer({
            name: callData.callerName,
            _id: callData.from,
            profilePicture: callData.profilePicture
        });

        const pc = new RTCPeerConnection(iceServers);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if (e.candidate) socket.emit('ice_candidate', { to: callData.from, candidate: e.candidate, from: user.id || user._id });
        };

        pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };

        await pc.setRemoteDescription(new RTCSessionDescription(callData.signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer_call', { to: callData.from, signal: answer });
        setGlobalIncomingCall(null);
        pauseAudio('incoming');
        setIsCallAccepted(true); // Timer starts immediately for receiver
    };

    const endCurrentCall = () => {
        const recipient = globalIncomingCall?.from || callPeer?._id || callPeer?.id;
        if (recipient) socket.emit('end_call', { to: recipient });
        cleanupCall();
        playAudio('hangup');
    };

    // Listen for SharedChat asking to start a call
    useEffect(() => {
        const handleInitiateCall = async (e) => {
            const peerToCall = e.detail;
            const stream = await setupMedia();
            if (!stream) return;

            setCallPeer(peerToCall);
            setActiveCall(true);
            setIsCallAccepted(false); // Wait for peer to accept

            const pc = new RTCPeerConnection(iceServers);
            pcRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate) socket.emit('ice_candidate', { to: peerToCall._id || peerToCall.id, candidate: e.candidate, from: user.id || user._id });
            };

            pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call_user', {
                userToCall: peerToCall._id || peerToCall.id,
                from: user.id || user._id,
                callerName: user.name,
                profilePicture: user.profilePicture,
                signalData: offer
            });
        };

        window.addEventListener('initiate_global_call', handleInitiateCall);
        return () => window.removeEventListener('initiate_global_call', handleInitiateCall);
    }, [user]);

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

    // --- SOCKET LOGIC ---
    useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            try {
                const res = await api.get('/admin/notifications');
                if (res.data.success) {
                    const unread = res.data.data.filter(n => !n.isRead && !n.isHidden).length;
                    setUnreadCount(unread);
                }
            } catch (error) { }
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
                toast.success(`New chat message received`, { icon: '💬', id: 'admin-new-chat' });
            }
        };

        const handleIncomingCall = (data) => {
            setGlobalIncomingCall(data);
            globalAudio.incoming.loop = true;
            playAudio('incoming');
        };

        const handleCallAccepted = async (signal) => {
            setIsCallAccepted(true); // Timer starts for caller
            if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                toast.success("Call connected", { icon: '📞' });
            }
        };

        const handleIceCandidate = async (data) => {
            if (pcRef.current && data.candidate) {
                try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { }
            }
        };

        const handleCallEndedGlobal = () => {
            cleanupCall();
            pauseAudio('incoming');
            playAudio('hangup');
        };

        const handleNewNotification = (notif) => {
            playAudio('notification');
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
            playAudio('sos');
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
                            <button onClick={() => toast.dismiss(toastObj.id)} className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-700 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                    </div>
                ), { duration: 30000, id: `admin-sos-alert-${senderName}`, position: "top-right" }
            );
        };

        socket.on("receive_message", handleIncomingChat);
        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("call_ended", handleCallEndedGlobal);
        socket.on("new_notification", handleNewNotification);
        socket.on("admin_leaderboard_refresh", handleNewNotification);
        socket.on("sos_alert_received", handleIncomingSOS);
        socket.on("online_users_updated", setOnlineUsers);

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off("receive_message", handleIncomingChat);
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_accepted", handleCallAccepted);
            socket.off("ice_candidate", handleIceCandidate);
            socket.off("call_ended", handleCallEndedGlobal);
            socket.off("new_notification", handleNewNotification);
            socket.off("admin_leaderboard_refresh", handleNewNotification);
            socket.off("sos_alert_received", handleIncomingSOS);
            socket.off("online_users_updated", setOnlineUsers);
        };
    }, [user, t]);

    useEffect(() => {
        if (location.pathname === '/admin/notifications') setUnreadCount(0);
        if (location.pathname === '/admin/chat') setUnreadChatCount(0);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) setIsMobileMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        try { await api.post('/auth/logout'); } catch (error) { }
        finally {
            toast.remove();
            sessionStorage.setItem('justLoggedOut', 'true');
            dispatch(logout());
        }
    };

    const desktopNavClasses = ({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm whitespace-nowrap shrink-0 ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

    const mobileNavClasses = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

    return (
        <>
            <audio ref={remoteAudioRef} autoPlay className="hidden" />

            {activeCall && (
                <CallOverlay
                    peer={callPeer}
                    onHangup={endCurrentCall}
                    isMinimized={isMinimizedCall}
                    setIsMinimized={setIsMinimizedCall}
                    localStream={localStreamRef.current}
                    isCallAccepted={isCallAccepted}
                    isOnline={onlineUsers.includes(String(callPeer?._id || callPeer?.id))}
                />
            )}

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
                    <NavLink to="/admin/dashboard" className={desktopNavClasses} title={t('sidebar.dashboard')}><LayoutDashboard className="w-4.5 h-4.5" /> {t('sidebar.dashboard')}</NavLink>
                    <NavLink to="/admin/employees" className={desktopNavClasses} title={t('sidebar.roster')}><Users className="w-4.5 h-4.5" /> {t('sidebar.roster')}</NavLink>
                    <NavLink to="/admin/attendance" className={desktopNavClasses} title={t('sidebar.attendance')}><Radio className="w-4.5 h-4.5" /> {t('sidebar.attendance')}</NavLink>
                    <NavLink to="/admin/learning-hub" className={desktopNavClasses} title={t('sidebar.learning_hub') || 'Training Vault'}><BookOpen className="w-4.5 h-4.5" /> {t('sidebar.learning_hub') || 'Learn'}</NavLink>
                    <NavLink to="/admin/progress" className={desktopNavClasses} title={t('sidebar.progress')}><TrendingUp className="w-4.5 h-4.5" /> {t('sidebar.progress')}</NavLink>
                    <NavLink to="/admin/leaderboard" className={desktopNavClasses} title={t('sidebar.leaderboard') || 'Leaderboard'}><Trophy className="w-4.5 h-4.5" /> {t('sidebar.leaderboard') || 'Leaderboard'}</NavLink>
                    <NavLink to="/admin/reports" className={desktopNavClasses} title={t('sidebar.reports')}><ClipboardCheck className="w-4.5 h-4.5" /> {t('sidebar.reports')}</NavLink>
                    <NavLink to="/admin/media" className={desktopNavClasses} title={t('sidebar.media') || 'Media Gallery'}>
                        <div className="relative flex items-center justify-center">
                            <Film className="w-4.5 h-4.5" />
                            {pendingMediaCount > 0 && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse border-2 border-card" />}
                        </div>
                        {t('sidebar.media') || 'Media'}
                    </NavLink>
                    <NavLink to="/admin/leave-requests" className={desktopNavClasses} title={t('sidebar.leave')}><CalendarDays className="w-4.5 h-4.5" /> {t('sidebar.leave')}</NavLink>
                    <NavLink to="/admin/notifications" className={desktopNavClasses} title={t('sidebar.alerts')}>
                        <div className="relative flex items-center justify-center">
                            <Bell className="w-4.5 h-4.5" />
                            {unreadCount > 0 && <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                        </div>
                        {t('sidebar.alerts')}
                    </NavLink>

                    <NavLink to="/admin/chat" className={desktopNavClasses} title="Chat Hub">
                        <div className="relative flex items-center justify-center">
                            <MessageCircle className="w-4.5 h-4.5" />
                            {unreadChatCount > 0 && <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm border border-card animate-in zoom-in duration-300">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}
                        </div>
                        Chat Hub
                    </NavLink>

                    <NavLink to="/admin/communication" className={desktopNavClasses} title={t('sidebar.broadcast')}><Megaphone className="w-4.5 h-4.5" /> {t('sidebar.broadcast')}</NavLink>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 border-l border-border pl-4 ml-2">
                    <button onClick={() => dispatch(toggleTheme())} className="p-2 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors" title={t('sidebar.theme')}>{theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}</button>
                    <button onClick={() => navigate('/admin/profile')} className="p-1 text-muted-foreground hover:text-foreground md:cursor-pointer hover:bg-muted rounded-full transition-colors flex items-center justify-center w-9 h-9 overflow-hidden border border-border/50" title={t('sidebar.profile') || 'My Profile'}>
                        {user?.profilePicture ? <img src={user.profilePicture} alt="Admin" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-muted-foreground md:cursor-pointer hover:text-foreground hover:bg-muted rounded-full transition-colors" title={t('sidebar.settings')}><Settings className="w-5 h-5" /></button>
                    <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive md:cursor-pointer hover:bg-destructive/10 rounded-full transition-colors" title={t('sidebar.logout')}><LogOut className="w-5 h-5" /></button>
                </div>
            </nav>

            {/* --- MOBILE TOP NAVBAR --- */}
            <header className="2xl:hidden fixed top-0 left-0 w-full h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm"><Shield className="w-4 h-4 text-primary-foreground" /></div>
                    <h1 className="font-bold text-lg text-foreground tracking-tight">{t('sidebar.brand')}</h1>
                </div>

                <div className="relative" ref={mobileMenuRef}>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative p-1 rounded-full hover:bg-muted transition-colors flex items-center justify-center w-10 h-10 overflow-hidden ring-2 ring-transparent focus:ring-primary/20 border border-border/50">
                        {user?.profilePicture ? <img src={user.profilePicture} alt="Admin" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-7 h-7 text-muted-foreground" />}
                    </button>

                    {isMobileMenuOpen && (
                        <div className="absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                            <div className="px-3 py-2 mb-1 border-b border-border">
                                <p className="text-sm font-bold text-foreground truncate">{adminName}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{adminEmail}</p>
                            </div>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/learning-hub'); }}><BookOpen className="w-4 h-4 text-primary" /> {t('sidebar.learning_hub') || 'Training Vault'}</button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/leaderboard'); }}><Trophy className="w-4 h-4 text-primary" /> {t('sidebar.leaderboard') || 'Leaderboard'}</button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/reports'); }}><ClipboardCheck className="w-4 h-4 text-primary" /> {t('sidebar.reports')}</button>
                            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/media'); }}>
                                <div className="flex items-center gap-3"><Film className="w-4 h-4 text-primary" /> {t('sidebar.media') || 'Media Gallery'}</div>
                                {pendingMediaCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm animate-pulse" />}
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/leave-requests'); }}><CalendarDays className="w-4 h-4 text-primary" /> {t('sidebar.leave')}</button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/communication'); }}><Megaphone className="w-4 h-4 text-primary" /> {t('sidebar.broadcast')}</button>
                            <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                <div className="flex items-center gap-3">{theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}<span>{theme === 'dark' ? t('sidebar.light_mode') : t('sidebar.dark_mode')}</span></div>
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/profile'); }}>
                                {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-4 h-4 rounded-full object-cover" /> : <UserCircle className="w-4 h-4 text-primary" />}{t('sidebar.profile') || 'My Profile'}
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }}><Settings className="w-4 h-4 text-primary" /> {t('sidebar.settings')}</button>
                            <div className="my-1 border-t border-border" />
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"><LogOut className="w-4 h-4" /> {t('sidebar.logout')}</button>
                        </div>
                    )}
                </div>
            </header>

            {/* --- MOBILE BOTTOM NAVBAR --- */}
            <nav className="2xl:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2 pb-safe">
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

            {/* --- GLOBAL INCOMING CALL MODAL --- */}
            {globalIncomingCall && !activeCall && (
                <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                    <div className="bg-card dark:bg-[#13151A] p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-80 text-center animate-in zoom-in-95 border border-border">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.4)] overflow-hidden border-2 border-primary/50">
                            {globalIncomingCall.profilePicture ? (
                                <img src={globalIncomingCall.profilePicture} alt="Caller" className="w-full h-full object-cover" />
                            ) : (
                                <PhoneIncoming className="w-10 h-10 text-primary" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{globalIncomingCall.callerName}</h2>
                            <p className="text-sm text-muted-foreground mt-1">is calling you...</p>
                        </div>
                        <div className="flex items-center gap-6 w-full justify-center mt-2">
                            <button onClick={() => {
                                socket.emit('end_call', { to: globalIncomingCall.from });
                                setGlobalIncomingCall(null);
                                pauseAudio('incoming');
                            }} className="w-14 h-14 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
                                <PhoneOff className="w-6 h-6" />
                            </button>
                            <button onClick={handleAcceptCall} className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
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