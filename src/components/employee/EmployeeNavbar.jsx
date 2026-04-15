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
    Trophy, BookOpen, X, HelpCircle, MessageCircle, PhoneIncoming, PhoneOff, Phone
} from "lucide-react";

import { Button } from "@/components/ui/button";
import EmployeeSettingsModal from "../../modals/employee/EmployeeSettingsModal";
import CallOverlay from "../../pages/shared/CallOverlay";

// --- GLOBAL SOCKET SINGLETON ---
if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
        autoConnect: true,
    });
}
const socket = window.__GLOBAL_SOCKET__;

// --- GLOBAL AUDIO SINGLETON (HMR SAFE) ---
if (!window.__GLOBAL_AUDIO__) window.__GLOBAL_AUDIO__ = {};

if (!window.__GLOBAL_AUDIO__.notification) window.__GLOBAL_AUDIO__.notification = new Audio('/sounds/notification-ting.mp3');
if (!window.__GLOBAL_AUDIO__.sos) window.__GLOBAL_AUDIO__.sos = new Audio('/sounds/beep.mp3');
if (!window.__GLOBAL_AUDIO__.message) window.__GLOBAL_AUDIO__.message = new Audio('/sounds/message.mp3');
if (!window.__GLOBAL_AUDIO__.incoming) window.__GLOBAL_AUDIO__.incoming = new Audio('/sounds/incoming.mp3');
if (!window.__GLOBAL_AUDIO__.hangup) window.__GLOBAL_AUDIO__.hangup = new Audio('/sounds/hangup.mp3');
if (!window.__GLOBAL_AUDIO__.sent) window.__GLOBAL_AUDIO__.sent = new Audio('/sounds/sent.mp3');
if (!window.__GLOBAL_AUDIO__.calling) window.__GLOBAL_AUDIO__.calling = new Audio('/sounds/calling.mp3');
if (!window.__GLOBAL_AUDIO__.ringing) window.__GLOBAL_AUDIO__.ringing = new Audio('/sounds/ringing.mp3');

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

const EmployeeNavbar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const [notifCount, setNotifCount] = useState(0);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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

    // --- BROWSER AUDIO UNLOCKING ---
    useEffect(() => {
        const unlockAudio = () => {
            Object.values(globalAudio).forEach(snd => {
                if (snd) {
                    snd.volume = 0;
                    snd.play().then(() => {
                        snd.pause();
                        snd.currentTime = 0;
                        snd.volume = 1;
                    }).catch(() => { });
                }
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

    // --- VISIBILITY LISTENER TO CLEAR BADGES ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && pathnameRef.current.includes('/chat')) {
                setUnreadChatCount(0);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // --- 60 SEC AUTO HANGUP FOR GLOBAL CALLS ---
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
                if (globalAudio.ringing) globalAudio.ringing.loop = true; // Safety Check
                playAudio('ringing');
            } else {
                pauseAudio('ringing');
                if (globalAudio.calling) globalAudio.calling.loop = true; // Safety Check
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

    const { user, token } = useSelector((state) => state.auth);
    const themeMode = useSelector((state) => state.theme.mode);

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

    // --- SOCKET LOGIC ---
    useEffect(() => {
        if (!user || !token) return;

        const fetchInitialUnreadCount = async () => {
            try {
                const response = await api.get('/employee/notifications');
                if (response.data.success) {
                    const unread = response.data.data.filter(n => !n.isRead).length;
                    setNotifCount(unread);
                }
            } catch (error) { }
        };

        if (pathnameRef.current !== '/employee/notifications') fetchInitialUnreadCount();

        const currentUserId = user.id || user._id;
        if (socket.connected) socket.emit("join_room", currentUserId);
        socket.on("connect", () => socket.emit("join_room", currentUserId));

        const handleIncomingChat = () => {
            if (pathnameRef.current !== '/employee/chat' || document.hidden) {
                setUnreadChatCount(prev => prev + 1);
                toast.success(`New chat message received`, { icon: '💬', id: 'new-chat-toast' });
            }
        };

        const handleIncomingCall = (data) => {
            setGlobalIncomingCall(data);
            if (globalAudio.incoming) globalAudio.incoming.loop = true; // Safety Check
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

        const handleNewNotification = () => {
            playAudio('notification');
            if (pathnameRef.current !== '/employee/notifications') {
                setNotifCount(prev => prev + 1);
                toast(t('navbar.new_notif_toast'), { icon: '🔔' });
            }
        };

        const handleIncomingSOS = (data) => {
            const { senderName, lat, lng } = data;
            playAudio('sos');
            if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
            if (pathnameRef.current !== '/employee/notifications') setNotifCount(prev => prev + 1);

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
                            <button onClick={() => toast.dismiss(toastObj.id)} className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-700 focus:outline-none transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                    </div>
                ), { duration: 30000, id: `emp-sos-alert-${senderName}`, position: "top-right" }
            );
        };

        socket.on("receive_message", handleIncomingChat);
        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("call_ended", handleCallEndedGlobal);
        socket.on("new_notification", handleNewNotification);
        socket.on("leaderboard_refresh", handleNewNotification);
        socket.on('new_notification_for_user', handleNewNotification);
        socket.on("sos_alert_received", handleIncomingSOS);
        socket.on("online_users_updated", setOnlineUsers);

        return () => {
            socket.off("receive_message", handleIncomingChat);
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_accepted", handleCallAccepted);
            socket.off("ice_candidate", handleIceCandidate);
            socket.off("call_ended", handleCallEndedGlobal);
            socket.off("new_notification", handleNewNotification);
            socket.off("leaderboard_refresh", handleNewNotification);
            socket.off('new_notification_for_user', handleNewNotification);
            socket.off("sos_alert_received", handleIncomingSOS);
            socket.off("online_users_updated", setOnlineUsers);
        };
    }, [user, token, t]);

    useEffect(() => {
        if (location.pathname === '/employee/notifications') setNotifCount(0);
        if (location.pathname === '/employee/chat') setUnreadChatCount(0);
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
            setAxiosToken(null);
            dispatch(logout());
        }
    };

    const desktopNavClasses = ({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium text-sm whitespace-nowrap shrink-0 ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

    const mobileNavClasses = ({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

    const navItems = [
        { path: "/employee/dashboard", icon: <Home className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.dashboard') },
        { path: "/employee/assignments", icon: <CalendarCheck className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.assignments') },
        { path: "/employee/optional", icon: <ListTodo className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.tasks') },
        { path: "/employee/media", icon: <PlaySquare className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.media') },
        { path: "/employee/learning-hub", icon: <BookOpen className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.learning_hub') || 'Learn' },
        { path: "/employee/leaderboard", icon: <Trophy className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.leaderboard') || 'Leaderboard' },
        { path: "/employee/report", icon: <BarChartBig className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.report') },
        { path: "/employee/help", icon: <HelpCircle className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.help') || 'Help & FAQs' },
        { path: "/employee/notifications", icon: <Bell className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.notifications'), badge: notifCount },
        { path: "/employee/chat", icon: <MessageCircle className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: 'Chat', badge: unreadChatCount },
        { path: "/employee/profile", icon: user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-6 h-6 lg:w-5 lg:h-5 rounded-full object-cover shrink-0 border border-border/50" /> : <User className="w-6 h-6 lg:w-5 lg:h-5 shrink-0" />, label: t('navbar.profile') },
    ];

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
                    remoteAudioRef={remoteAudioRef} // <--- ADD THIS PROP
                />
            )}

            <header className="fixed top-0 left-0 w-full z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-sm h-16">
                <div className="max-w-400 mx-auto px-4 lg:px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm"><span className="text-primary-foreground font-bold text-base">W</span></div>
                        <h1 className="font-display font-bold text-lg text-foreground tracking-tight hidden sm:block">{t('navbar.brand')}</h1>
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
                        <button onClick={() => dispatch(toggleTheme())} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"><div className="w-5 h-5">{themeMode === 'dark' ? <Moon /> : <Sun className="text-amber-500" />}</div></button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"><Settings className="w-5 h-5" /></button>
                        <button onClick={handleLogout} className="hidden xl:flex p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
                        <div className="relative xl:hidden" ref={mobileMenuRef}>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative p-1 rounded-full hover:bg-muted transition-colors">
                                {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-border" /> : <UserCircle className="w-7 h-7 text-muted-foreground" />}
                            </button>
                            {isMobileMenuOpen && (
                                <div className="absolute top-12 right-0 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                                    <div className="px-3 py-2.5 mb-1 border-b border-border flex items-center gap-3">
                                        {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-9 h-9 rounded-full object-cover shrink-0 border border-border" /> : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-primary" /></div>}
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-foreground truncate">{user?.name || "Employee"}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</p>
                                        </div>
                                    </div>
                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/learning-hub'); }}><BookOpen className="w-4 h-4 text-primary" /> {t('navbar.learning_hub') || 'Training Vault'}</button>
                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/report'); }}><BarChartBig className="w-4 h-4 text-primary" /> {t('navbar.report') || 'Daily Report'}</button>
                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/leaderboard'); }}><Trophy className="w-4 h-4 text-primary" /> {t('navbar.leaderboard') || 'Leaderboard'}</button>
                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => { setIsMobileMenuOpen(false); navigate('/employee/help'); }}><HelpCircle className="w-4 h-4 text-primary" /> {t('navbar.help') || 'Help & FAQs'}</button>
                                    <NavLink to="/employee/profile" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><User className="w-4 h-4" /> {t('navbar.profile')}</NavLink>
                                    <div className="my-1 border-t border-border" />
                                    <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><div className="flex items-center gap-3">{themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}<span>{themeMode === 'dark' ? t('navbar.dark_mode') : t('navbar.light_mode')}</span></div></button>
                                    <button onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Settings className="w-4 h-4" /> {t('navbar.settings')}</button>
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-1"><LogOut className="w-4 h-4" /> {t('navbar.logout')}</button>
                                </div>
                            )}
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

            <EmployeeSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
        </>
    );
};

export default EmployeeNavbar;