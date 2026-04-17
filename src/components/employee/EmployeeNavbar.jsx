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
    Trophy, BookOpen, X, HelpCircle, MessageCircle, PhoneIncoming, PhoneOff, Phone, Video
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

// --- GLOBAL AUDIO SINGLETON ---
if (!window.__GLOBAL_AUDIO__) {
    window.__GLOBAL_AUDIO__ = {
        notification: new Audio('/sounds/notification-ting.mp3'),
        sos: new Audio('/sounds/beep.mp3'),
        message: new Audio('/sounds/message.mp3'),
        incoming: new Audio('/sounds/incoming.mp3'),
        hangup: new Audio('/sounds/hangup.mp3'),
        sent: new Audio('/sounds/sent.mp3'),
        calling: new Audio('/sounds/calling.mp3'),
        ringing: new Audio('/sounds/ringing.mp3'),
    };
}
const globalAudio = window.__GLOBAL_AUDIO__;
const playAudio = (type) => { try { const snd = globalAudio[type]; if (snd) { snd.currentTime = 0; snd.play().catch(e => console.warn(`Audio blocked:`, e)); } } catch (e) { } };
const pauseAudio = (type) => { try { const snd = globalAudio[type]; if (snd) { snd.pause(); snd.currentTime = 0; } } catch (e) { } };

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const HQ_VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 } };

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

    // --- ADVANCED CALL WAITING & HOLD STATE ---
    const [remoteCallStatus, setRemoteCallStatus] = useState('active'); 
    const [waitingIncomingCall, setWaitingIncomingCall] = useState(null);
    const heldCallRef = useRef(null); 

    // Call Upgrade & Camera States
    const [currentCallType, setCurrentCallType] = useState('voice');
    const [localStreamState, setLocalStreamState] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [videoUpgradeStatus, setVideoUpgradeStatus] = useState('idle');
    const [facingMode, setFacingMode] = useState('user'); 

    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const currentPeerRef = useRef(null);

    const pathnameRef = useRef(location.pathname);
    useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);
    
    // GUARANTEE LATEST PEER IDENTITY FOR STALE CLOSURES
    useEffect(() => { currentPeerRef.current = callPeer; }, [callPeer]);

    useEffect(() => {
        if (location.pathname.includes('/notifications')) setNotifCount(0);
        if (location.pathname.includes('/chat')) setUnreadChatCount(0);
    }, [location.pathname]);

    useEffect(() => {
        const handleVisibilityChange = () => { if (!document.hidden && pathnameRef.current.includes('/chat')) setUnreadChatCount(0); };
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

    useEffect(() => {
        if (activeCall && !isCallAccepted && callPeer && remoteCallStatus === 'active') {
            const isPeerOnline = onlineUsers.includes(String(callPeer._id || callPeer.id));
            if (isPeerOnline) { pauseAudio('calling'); if (globalAudio.ringing) globalAudio.ringing.loop = true; playAudio('ringing'); } 
            else { pauseAudio('ringing'); if (globalAudio.calling) globalAudio.calling.loop = true; playAudio('calling'); }
        } else { pauseAudio('calling'); pauseAudio('ringing'); }
        return () => { pauseAudio('calling'); pauseAudio('ringing'); };
    }, [activeCall, isCallAccepted, callPeer, onlineUsers, remoteCallStatus]);

    const { user, token } = useSelector((state) => state.auth);
    const themeMode = useSelector((state) => state.theme.mode);

    // --- WEBRTC LOGIC ---
    const setupMedia = async (requestedType, specificFacingMode = 'user') => {
        if (localStreamRef.current) return { stream: localStreamRef.current, actualType: requestedType }; 

        try {
            if (!navigator.mediaDevices) throw new Error("Media devices not supported.");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: requestedType === 'video' ? { facingMode: specificFacingMode, ...HQ_VIDEO_CONSTRAINTS } : false 
            });
            localStreamRef.current = stream;
            setLocalStreamState(stream);
            setFacingMode(specificFacingMode);
            return { stream, actualType: requestedType };
        } catch (e) {
            if (requestedType === 'video') {
                toast.error("Camera access failed. Switching to voice call.", { id: 'cam-error' });
                try {
                    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    localStreamRef.current = audioOnlyStream;
                    setLocalStreamState(audioOnlyStream);
                    return { stream: audioOnlyStream, actualType: 'voice' };
                } catch (audioErr) {
                    toast.error("Microphone access denied.");
                    return { stream: null, actualType: null };
                }
            } else {
                toast.error("Microphone access denied.");
                return { stream: null, actualType: null };
            }
        }
    };

    const handleFlipCamera = async () => {
        if (currentCallType !== 'video' || !localStreamRef.current) return;
        try {
            const newMode = facingMode === 'user' ? 'environment' : 'user';
            localStreamRef.current.getVideoTracks().forEach(t => t.stop());

            const videoConstraints = { facingMode: { exact: newMode }, ...HQ_VIDEO_CONSTRAINTS };
            const fallbackConstraints = { facingMode: newMode, ...HQ_VIDEO_CONSTRAINTS };

            const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
                .catch(() => navigator.mediaDevices.getUserMedia({ video: fallbackConstraints })); 

            const newVideoTrack = stream.getVideoTracks()[0];
            const sender = pcRef.current?.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) await sender.replaceTrack(newVideoTrack);

            const audioTracks = localStreamRef.current.getAudioTracks();
            const newLocalStream = new MediaStream([...audioTracks, newVideoTrack]);
            
            localStreamRef.current = newLocalStream;
            setLocalStreamState(newLocalStream);
            setFacingMode(newMode);
        } catch (err) {
            toast.error("Could not switch camera");
        }
    };

    const attachPCListeners = (pc) => {
        pc.onicecandidate = (e) => {
            const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
            if (e.candidate && to) socket.emit('ice_candidate', { to, candidate: e.candidate, from: user.id || user._id });
        };
        
        pc.ontrack = (e) => {
            setRemoteStream((prevStream) => {
                const stream = prevStream || new MediaStream();
                if (!stream.getTracks().find(t => t.id === e.track.id)) { stream.addTrack(e.track); }
                return new MediaStream(stream.getTracks());
            });
        };
    };

    const cleanupCall = () => {
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        if (pcRef.current) pcRef.current.close();
        pcRef.current = null;
        localStreamRef.current = null;
        setLocalStreamState(null);
        setRemoteStream(null);
        setFacingMode('user');
        setActiveCall(false);
        setCallPeer(null);
        setGlobalIncomingCall(null);
        setWaitingIncomingCall(null);
        setIsMinimizedCall(false);
        setIsCallAccepted(false);
        setRemoteCallStatus('active');
        setVideoUpgradeStatus('idle');
        heldCallRef.current = null;
    };

    const answerIncomingCall = async (callData) => {
        const isVideoOffer = callData.callType === 'video' || (callData.signal && callData.signal.sdp && callData.signal.sdp.includes('m=video'));
        const requestedType = isVideoOffer ? 'video' : 'voice';

        const mediaResult = await setupMedia(requestedType);
        if (!mediaResult || !mediaResult.stream) return;
        setCurrentCallType(requestedType);

        const { stream } = mediaResult;
        setActiveCall(true);
        setCallPeer({ name: callData.callerName, _id: callData.from, profilePicture: callData.profilePicture });

        const pc = new RTCPeerConnection(iceServers);
        pcRef.current = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        attachPCListeners(pc);

        await pc.setRemoteDescription(new RTCSessionDescription(callData.signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer_call', { to: callData.from, signal: answer });
        
        setGlobalIncomingCall(null);
        setWaitingIncomingCall(null);
        pauseAudio('incoming');
        setIsCallAccepted(true);
    };

    const handleAcceptWaitingCall = async () => {
        if (!waitingIncomingCall || !pcRef.current) return;
        
        const currentActiveId = currentPeerRef.current?._id || currentPeerRef.current?.id;
        socket.emit('renegotiate', { to: currentActiveId, signal: { type: 'CUSTOM_EVENT', event: 'call_held' } });

        heldCallRef.current = {
            pc: pcRef.current,
            peer: currentPeerRef.current, // Use ref to prevent stale closures
            callType: currentCallType,
            isCallAccepted: isCallAccepted,
            remoteStream: remoteStream
        };

        pcRef.current = null;
        setRemoteStream(null);
        setIsCallAccepted(false);
        setRemoteCallStatus('active');

        await answerIncomingCall(waitingIncomingCall);
    };

    const handleRejectWaitingCall = () => {
        if (!waitingIncomingCall) return;
        socket.emit('renegotiate', { to: waitingIncomingCall.from, signal: { type: 'CUSTOM_EVENT', event: 'call_rejected_busy' } });
        setWaitingIncomingCall(null);
    };

    // --- BULLETPROOF HANGUP LOGIC ---
    const endCurrentCall = (skipEmit = false) => {
        const activePeer = currentPeerRef.current;
        const recipient = activePeer?._id || activePeer?.id;
        
        if (recipient && !skipEmit) {
            socket.emit('end_call', { to: recipient });
            socket.emit('renegotiate', { to: recipient, signal: { type: 'CUSTOM_EVENT', event: 'explicit_end', from: user.id || user._id } });
        }

        if (pcRef.current) pcRef.current.close();
        pcRef.current = null;
        setRemoteStream(null);
        playAudio('hangup');

        if (heldCallRef.current) {
            const held = heldCallRef.current;
            pcRef.current = held.pc;
            setCallPeer(held.peer);
            setCurrentCallType(held.callType);
            setIsCallAccepted(held.isCallAccepted);
            setRemoteStream(held.remoteStream);
            setRemoteCallStatus('active');
            
            socket.emit('renegotiate', { to: held.peer._id || held.peer.id, signal: { type: 'CUSTOM_EVENT', event: 'call_resumed' } });
            heldCallRef.current = null;
            toast.success(`Resumed call with ${held.peer.name}`);
        } else {
            cleanupCall();
        }
    };

    useEffect(() => {
        const handleInitiateCall = async (e) => {
            const peerToCall = e.detail;
            const requestedType = peerToCall.callType || 'voice';

            const mediaResult = await setupMedia(requestedType);
            if (!mediaResult || !mediaResult.stream) return;
            const { stream, actualType } = mediaResult;

            setCurrentCallType(actualType);
            setCallPeer(peerToCall);
            setActiveCall(true);
            setIsCallAccepted(false);
            setRemoteCallStatus('active');

            const pc = new RTCPeerConnection(iceServers);
            pcRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            attachPCListeners(pc);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call_user', {
                userToCall: peerToCall._id || peerToCall.id, from: user.id || user._id,
                callerName: user.name, profilePicture: user.profilePicture,
                signalData: offer, callType: actualType
            });
        };

        window.addEventListener('initiate_global_call', handleInitiateCall);
        return () => window.removeEventListener('initiate_global_call', handleInitiateCall);
    }, [user]);

    const handleRequestVideo = () => {
        const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
        socket.emit('video_upgrade_request', { to });
        setVideoUpgradeStatus('requesting');
        toast("Requesting video switch...", { icon: '⏳' });
    };

    const performVideoUpgrade = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', ...HQ_VIDEO_CONSTRAINTS } });
            const videoTrack = stream.getVideoTracks()[0];
            
            localStreamRef.current.addTrack(videoTrack);
            setLocalStreamState(new MediaStream(localStreamRef.current.getTracks()));
            setFacingMode('user');
            
            if (pcRef.current) {
                pcRef.current.addTrack(videoTrack, localStreamRef.current);
                const offer = await pcRef.current.createOffer();
                await pcRef.current.setLocalDescription(offer);
                const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
                socket.emit('renegotiate', { to, signal: offer });
            }
            setCurrentCallType('video');
        } catch (error) { toast.error("Could not access camera."); }
    };

    const handleAcceptVideo = async () => {
        const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
        socket.emit('video_upgrade_accepted', { to });
        setVideoUpgradeStatus('idle');
        await performVideoUpgrade();
    };

    const handleRejectVideo = () => {
        const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
        socket.emit('video_upgrade_rejected', { to });
        setVideoUpgradeStatus('idle');
    };

    // --- SOCKET LISTENERS ---
    useEffect(() => {
        if (!user || !token) return;

        const currentUserId = user.id || user._id;
        if (socket.connected) socket.emit("join_room", currentUserId);
        socket.on("connect", () => socket.emit("join_room", currentUserId));

        const handleIncomingChat = (data) => {
            if (!pathnameRef.current.includes('/chat')) {
                setUnreadChatCount(prev => prev + 1);
                playAudio('notification'); 
                toast.success(`New chat message received`, { icon: '💬', id: 'new-chat-toast' });
            }
        };

        const handleIncomingCall = (data) => {
            if (activeCall) {
                socket.emit('renegotiate', { to: data.from, signal: { type: 'CUSTOM_EVENT', event: 'call_waiting' } });
                setWaitingIncomingCall(data);
                playAudio('notification');
            } else {
                setGlobalIncomingCall(data);
                if (globalAudio.incoming) globalAudio.incoming.loop = true;
                playAudio('incoming');
            }
        };

        const handleCallAccepted = async (signal) => {
            setIsCallAccepted(true);
            setRemoteCallStatus('active');
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

        const handleRenegotiate = async ({ signal }) => {
            if (signal && signal.type === 'CUSTOM_EVENT') {
                if (signal.event === 'call_waiting') {
                    setRemoteCallStatus('busy');
                } else if (signal.event === 'call_held') {
                    setRemoteCallStatus('held');
                } else if (signal.event === 'call_resumed') {
                    setRemoteCallStatus('active');
                } else if (signal.event === 'call_rejected_busy') {
                    toast.error("User is busy on another call.");
                    cleanupCall();
                } else if (signal.event === 'explicit_end') {
                    // SAFE HANGUP ROUTING
                    const senderId = signal.from;
                    const activeId = currentPeerRef.current?._id || currentPeerRef.current?.id;
                    const heldId = heldCallRef.current?.peer?._id || heldCallRef.current?.peer?.id;

                    if (String(senderId) === String(activeId)) {
                        if (heldCallRef.current) {
                            toast("Current call ended. Restoring held call...");
                            endCurrentCall(true);
                        } else {
                            cleanupCall();
                            pauseAudio('incoming');
                            playAudio('hangup');
                        }
                    } else if (String(senderId) === String(heldId)) {
                        toast(`${heldCallRef.current.peer.name} ended the held call.`);
                        if (heldCallRef.current.pc) heldCallRef.current.pc.close();
                        heldCallRef.current = null;
                    }
                }
                return;
            }

            if (pcRef.current) {
                try {
                    if (signal.type === 'offer') {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                        const answer = await pcRef.current.createAnswer();
                        await pcRef.current.setLocalDescription(answer);
                        const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
                        if(to) socket.emit('renegotiate', { to, signal: answer });
                    } else if (signal.type === 'answer') {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                    }
                } catch (e) {}
            }
        };

        socket.on("receive_message", handleIncomingChat);
        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("renegotiate", handleRenegotiate);
        
        socket.on("call_ended", () => {
            // If we have multiple calls, ignore standard broadcast and wait for 'explicit_end' tunnel
            if (!heldCallRef.current) {
                cleanupCall(); 
                pauseAudio('incoming'); 
                playAudio('hangup');
            }
        });
        
        socket.on("video_upgrade_request", () => { setVideoUpgradeStatus('receiving_request'); playAudio('notification'); });
        socket.on("video_upgrade_rejected", () => { setVideoUpgradeStatus('idle'); toast.error("Video call request rejected"); });
        socket.on("video_upgrade_accepted", async () => { setVideoUpgradeStatus('idle'); toast.success("Video call request accepted"); await performVideoUpgrade(); });
        socket.on("online_users_updated", setOnlineUsers);

        return () => {
            socket.off("receive_message");
            socket.off("incoming_call");
            socket.off("call_accepted");
            socket.off("ice_candidate");
            socket.off("renegotiate");
            socket.off("call_ended");
            socket.off("video_upgrade_request");
            socket.off("video_upgrade_rejected");
            socket.off("video_upgrade_accepted");
            socket.off("online_users_updated");
        };
    }, [user, token, activeCall]); // Re-bind on activeCall to capture state, but rely on currentPeerRef!

    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        try { await api.post('/auth/logout'); } catch (error) { }
        finally { toast.remove(); sessionStorage.setItem('justLoggedOut', 'true'); setAxiosToken(null); dispatch(logout()); }
    };

    const desktopNavClasses = ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium text-sm whitespace-nowrap shrink-0 ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
    const mobileNavClasses = ({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

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
            {activeCall && (
                <CallOverlay
                    peer={callPeer}
                    onHangup={() => endCurrentCall(false)}
                    isMinimized={isMinimizedCall}
                    setIsMinimized={setIsMinimizedCall}
                    localStream={localStreamState}
                    remoteStream={remoteStream}
                    isCallAccepted={isCallAccepted}
                    isOnline={onlineUsers.includes(String(callPeer?._id || callPeer?.id))}
                    callType={currentCallType}
                    onRequestVideo={handleRequestVideo}
                    onAcceptVideo={handleAcceptVideo}
                    onRejectVideo={handleRejectVideo}
                    videoUpgradeStatus={videoUpgradeStatus}
                    onFlipCamera={handleFlipCamera}
                    facingMode={facingMode}
                    remoteCallStatus={remoteCallStatus}
                    waitingCall={waitingIncomingCall}
                    onAcceptWaitingCall={handleAcceptWaitingCall}
                    onRejectWaitingCall={handleRejectWaitingCall}
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

            {globalIncomingCall && !activeCall && (
                <div className="fixed inset-0 z-100000 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                    <div className="bg-card dark:bg-[#13151A] p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-80 text-center animate-in zoom-in-95 border border-border">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.4)] overflow-hidden border-2 border-primary/50">
                            {globalIncomingCall.profilePicture ? <img src={globalIncomingCall.profilePicture} alt="Caller" className="w-full h-full object-cover" /> : <PhoneIncoming className="w-10 h-10 text-primary" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{globalIncomingCall.callerName}</h2>
                            <p className="text-sm text-muted-foreground mt-1 capitalize">Incoming {globalIncomingCall.callType || 'voice'} call...</p>
                        </div>
                        <div className="flex items-center gap-6 w-full justify-center mt-2">
                            <button onClick={() => { socket.emit('end_call', { to: globalIncomingCall.from }); setGlobalIncomingCall(null); pauseAudio('incoming'); }} className="w-14 h-14 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
                                <PhoneOff className="w-6 h-6" />
                            </button>
                            <button onClick={() => answerIncomingCall(globalIncomingCall)} className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
                                {globalIncomingCall.callType === 'video' ? <Video className="w-6 h-6 fill-current" /> : <Phone className="w-6 h-6 fill-current" />}
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