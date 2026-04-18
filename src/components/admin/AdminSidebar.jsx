import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import {
    LayoutDashboard, Users, Radio, Shield, Megaphone,
    Moon, Sun, Settings, LogOut, TrendingUp, Bell, UserCircle, ClipboardCheck,
    CalendarDays, Film, Trophy, BookOpen, X, MessageCircle, PhoneIncoming, PhoneOff, Phone, Video, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { logout } from "../../store/slices/authSlice";
import { toggleTheme } from "../../store/slices/themeSlice";
import AdminSettingsModal from "../../modals/admin/AdminSettingsModal";
import { Button } from "@/components/ui/button";
import CallOverlay from "../../pages/shared/CallOverlay";

if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
        autoConnect: true,
    });
}
const socket = window.__GLOBAL_SOCKET__;

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

const playAudio = (type) => {
    try {
        const audioStore = typeof globalAudio !== 'undefined' ? globalAudio : window.__GLOBAL_AUDIO__;
        const snd = audioStore?.[type];

        if (snd) {
            if (snd.paused) {
                snd.currentTime = 0;
                snd.play().catch(e => console.warn(`Audio blocked:`, e));
            }
        }
    } catch (e) { }
};

const pauseAudio = (type) => { try { const snd = globalAudio[type]; if (snd) { snd.pause(); snd.currentTime = 0; } } catch (e) { } };

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const HQ_VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 } };

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

    const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(false);
    const [callPeer, setCallPeer] = useState(null);
    const [isMinimizedCall, setIsMinimizedCall] = useState(false);
    const [isCallAccepted, setIsCallAccepted] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);

    const [remoteCallStatus, setRemoteCallStatus] = useState('active');
    const [waitingIncomingCall, setWaitingIncomingCall] = useState(null);
    const heldCallRef = useRef(null);

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
    useEffect(() => { currentPeerRef.current = callPeer; }, [callPeer]);
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
        if (globalIncomingCall && !activeCall) {
            const timer = setTimeout(() => {
                socket.emit('end_call', { to: globalIncomingCall.from });
                toast.error(t('toast.missed_call', { name: globalIncomingCall.callerName }));
                setGlobalIncomingCall(null);
                pauseAudio('incoming');
            }, 60000);
            return () => clearTimeout(timer);
        }
    }, [globalIncomingCall, activeCall, t]);

    useEffect(() => {
        if (activeCall && !isCallAccepted && callPeer && remoteCallStatus === 'active') {
            const isPeerOnline = onlineUsers.includes(String(callPeer._id || callPeer.id));
            if (isPeerOnline) { pauseAudio('calling'); if (globalAudio.ringing) globalAudio.ringing.loop = true; playAudio('ringing'); }
            else { pauseAudio('ringing'); if (globalAudio.calling) globalAudio.calling.loop = true; playAudio('calling'); }
        } else { pauseAudio('calling'); pauseAudio('ringing'); }
        return () => { pauseAudio('calling'); pauseAudio('ringing'); };
    }, [activeCall, isCallAccepted, callPeer, onlineUsers, remoteCallStatus]);

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
                toast.error(t('toast.camera_access_failed'), { id: 'cam-error' });
                try {
                    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    localStreamRef.current = audioOnlyStream;
                    setLocalStreamState(audioOnlyStream);
                    return { stream: audioOnlyStream, actualType: 'voice' };
                } catch (audioErr) {
                    toast.error(t('toast.mic_denied'));
                    return { stream: null, actualType: null };
                }
            } else {
                toast.error(t('toast.mic_denied'));
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
            toast.error(t('toast.camera_switch_failed'));
        }
    };

    const attachPCListeners = (pc) => {
        pc.iceQueue = [];
        pc.onicecandidate = (e) => {
            const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
            if (e.candidate && to) socket.emit('ice_candidate', { to, candidate: e.candidate, from: user.id || user._id });
        };
        pc.ontrack = (e) => {
            if (e.streams && e.streams[0]) {
                setRemoteStream(e.streams[0]);
            } else {
                setRemoteStream((prevStream) => {
                    const stream = prevStream || new MediaStream();
                    if (!stream.getTracks().find(t => t.id === e.track.id)) { stream.addTrack(e.track); }
                    return new MediaStream(stream.getTracks());
                });
            }
        };
    };

    const processIceQueue = async (pc) => {
        if (pc && pc.iceQueue && pc.iceQueue.length > 0) {
            for (const candidate of pc.iceQueue) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn(e); }
            }
            pc.iceQueue = [];
        }
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
        await processIceQueue(pc);
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
        heldCallRef.current = { pc: pcRef.current, peer: currentPeerRef.current, callType: currentCallType, isCallAccepted: isCallAccepted, remoteStream: remoteStream };
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
            toast.success(t('toast.resumed_call', { name: held.peer.name }));
        } else {
            cleanupCall();
        }
    };

    useEffect(() => {
        const handleInitiateCall = async (e) => {
            // --- NUMBERED TRACE LOGS ---
            console.log("🟢 1. Call Button Clicked! Target User:", e.detail);
            const peerToCall = e.detail;
            const requestedType = peerToCall.callType || 'voice';

            try {
                const mediaResult = await setupMedia(requestedType);
                if (!mediaResult || !mediaResult.stream) {
                    console.error("🔴 2. Camera/Mic Access Failed!");
                    return;
                }
                console.log("🟢 3. Camera/Mic Success! Setting up WebRTC...");

                const { stream, actualType } = mediaResult;
                setCurrentCallType(actualType);
                setIsCallAccepted(false);
                setRemoteCallStatus('active');
                setCallPeer(peerToCall);
                setActiveCall(true);

                const pc = new RTCPeerConnection(iceServers);
                pcRef.current = pc;
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
                attachPCListeners(pc);

                console.log("🟢 4. Creating WebRTC Offer...");
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const callPayload = {
                    userToCall: peerToCall._id || peerToCall.id,
                    from: user.id || user._id,
                    callerName: user.name,
                    profilePicture: user.profilePicture,
                    signalData: offer,
                    callType: actualType
                };

                console.log("🟢 5. FIRING SIGNAL TO BACKEND! Payload:", callPayload);
                socket.emit('call_user', callPayload);

            } catch (error) {
                console.error("❌ CRITICAL WEBRTC ERROR:", error);
            }
        };
        window.addEventListener('initiate_global_call', handleInitiateCall);
        return () => window.removeEventListener('initiate_global_call', handleInitiateCall);
    }, [user]);

    const handleRequestVideo = () => {
        const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
        socket.emit('video_upgrade_request', { to });
        setVideoUpgradeStatus('requesting');
        toast(t('toast.requesting_video'), { icon: '⏳' });
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
        } catch (error) { toast.error(t('toast.camera_access_error')); }
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

        const ringChannel = new BroadcastChannel('workedu_call_channel');

        const currentUserId = user.id || user._id;
        const joinUserRoom = () => { 
            console.log("🟢 [PHASE 1 TRACE] SOCKET CONNECTED! ID:", socket.id);
            console.log("🚪 [PHASE 1 TRACE] Joining room for user:", currentUserId);
            socket.emit("join_room", currentUserId); 
            socket.emit("join_admin_room"); 
        };
        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleIncomingChat = (data) => {
            if (!pathnameRef.current.includes('/chat')) {
                setUnreadChatCount(prev => prev + 1);
                playAudio('notification');
                toast.success(t('toast.new_chat'), { icon: '💬', id: 'admin-new-chat' });
            }
        };

        const handleIncomingCall = (data) => {
            // --- TRACE LOGS ---
            console.warn("🚨🚨🚨 [PHASE 1 TRACE] INCOMING CALL SIGNAL RECEIVED! 🚨🚨🚨", data);
            toast.success(`🚨 SIGNAL ARRIVED: Call from ${data.callerName || 'Unknown'}`, {
                duration: 8000,
                position: 'top-center',
                style: { background: '#000', color: '#0f0', border: '2px solid #0f0' }
            });

            // ADD VIBRATION
            if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);

            if (activeCall) {
                socket.emit('renegotiate', { to: data.from, signal: { type: 'CUSTOM_EVENT', event: 'call_waiting' } });
                setWaitingIncomingCall(data);
                playAudio('notification');
            } else {
                setGlobalIncomingCall(data);

                if (document.hasFocus()) {
                    if (globalAudio.incoming) globalAudio.incoming.loop = true;
                    playAudio('incoming');
                    ringChannel.postMessage({ type: 'SILENCE_RING', callId: data.from });
                } else {
                    let isClaimed = false;
                    const silenceListener = (event) => {
                        if (event.data.type === 'SILENCE_RING' && event.data.callId === data.from) {
                            isClaimed = true;
                        }
                    };

                    ringChannel.addEventListener('message', silenceListener);

                    setTimeout(() => {
                        ringChannel.removeEventListener('message', silenceListener);

                        if (!isClaimed) {
                            const lockKey = `ring_lock_${data.from}`;
                            if (!localStorage.getItem(lockKey)) {
                                localStorage.setItem(lockKey, 'true');
                                if (globalAudio.incoming) globalAudio.incoming.loop = true;
                                playAudio('incoming');

                                setTimeout(() => localStorage.removeItem(lockKey), 10000);
                            }
                        }
                    }, 50);
                }
            }
        };

        const handleCallAccepted = async (signal) => {
            setIsCallAccepted(true);
            setRemoteCallStatus('active');
            if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                await processIceQueue(pcRef.current);
                toast.success(t('toast.call_connected'), { icon: '📞' });
            }
        };
        const handleIceCandidate = async (data) => {
            if (pcRef.current && data.candidate) {
                const pc = pcRef.current;
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { }
                } else {
                    if (!pc.iceQueue) pc.iceQueue = [];
                    pc.iceQueue.push(data.candidate);
                }
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
                    toast.error(t('toast.user_busy'));
                    cleanupCall();
                } else if (signal.event === 'explicit_end') {
                    const senderId = signal.from;
                    const activeId = currentPeerRef.current?._id || currentPeerRef.current?.id;
                    const heldId = heldCallRef.current?.peer?._id || heldCallRef.current?.peer?.id;
                    if (String(senderId) === String(activeId)) {
                        if (heldCallRef.current) {
                            toast(t('toast.call_ended_restoring'));
                            endCurrentCall(true);
                        } else {
                            cleanupCall();
                            pauseAudio('incoming');
                            playAudio('hangup');
                        }
                    } else if (String(senderId) === String(heldId)) {
                        toast(t('toast.ended_held_call', { name: heldCallRef.current.peer.name }));
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
                        await processIceQueue(pcRef.current);
                        const answer = await pcRef.current.createAnswer();
                        await pcRef.current.setLocalDescription(answer);
                        const to = currentPeerRef.current?._id || currentPeerRef.current?.id;
                        if (to) socket.emit('renegotiate', { to, signal: answer });
                    } else if (signal.type === 'answer') {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                        await processIceQueue(pcRef.current);
                    }
                } catch (e) { }
            }
        };
        const handleNewNotification = (notif) => {
            playAudio('notification');
            if (!pathnameRef.current.includes('/notifications')) {
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
            if (!pathnameRef.current.includes('/notifications')) setUnreadCount(prev => prev + 1);
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
        const handleCallEnded = () => { if (!heldCallRef.current) { cleanupCall(); pauseAudio('incoming'); playAudio('hangup'); } };
        const handleVideoUpgradeRequest = () => { setVideoUpgradeStatus('receiving_request'); playAudio('notification'); };
        const handleVideoUpgradeRejected = () => { setVideoUpgradeStatus('idle'); toast.error(t('toast.video_rejected')); };
        const handleVideoUpgradeAccepted = async () => { setVideoUpgradeStatus('idle'); toast.success(t('toast.video_accepted')); await performVideoUpgrade(); };

        socket.on("receive_message", handleIncomingChat);
        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("renegotiate", handleRenegotiate);
        socket.on("call_ended", handleCallEnded);
        socket.on("video_upgrade_request", handleVideoUpgradeRequest);
        socket.on("video_upgrade_rejected", handleVideoUpgradeRejected);
        socket.on("video_upgrade_accepted", handleVideoUpgradeAccepted);
        socket.on("new_notification", handleNewNotification);
        socket.on("admin_leaderboard_refresh", handleNewNotification);
        socket.on("sos_alert_received", handleIncomingSOS);
        socket.on("online_users_updated", setOnlineUsers);

        return () => {
            ringChannel.close();
            socket.off("connect", joinUserRoom);
            socket.off("receive_message", handleIncomingChat);
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_accepted", handleCallAccepted);
            socket.off("ice_candidate", handleIceCandidate);
            socket.off("renegotiate", handleRenegotiate);
            socket.off("call_ended", handleCallEnded);
            socket.off("video_upgrade_request", handleVideoUpgradeRequest);
            socket.off("video_upgrade_rejected", handleVideoUpgradeRejected);
            socket.off("video_upgrade_accepted", handleVideoUpgradeAccepted);
            socket.off("new_notification", handleNewNotification);
            socket.off("admin_leaderboard_refresh", handleNewNotification);
            socket.off("sos_alert_received", handleIncomingSOS);
            socket.off("online_users_updated", setOnlineUsers);
        };
    }, [user, t, activeCall, token]);

    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        try { await api.post('/auth/logout'); } catch (error) { }
        finally { toast.remove(); sessionStorage.setItem('justLoggedOut', 'true'); dispatch(logout()); }
    };

    const desktopNavClasses = ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm whitespace-nowrap shrink-0 ${isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
    const mobileNavClasses = ({ isActive }) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

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

            {globalIncomingCall && !activeCall && (
                <div 
                    style={{ zIndex: 9999999 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in"
                >
                    {console.log("💎 [UI TRACE] Admin Call Modal attempting to render!")}
                    <div className="bg-card dark:bg-[#13151A] p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 w-80 text-center border border-white/10 animate-in zoom-in-95">
                        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(var(--primary),0.4)] overflow-hidden border-2 border-primary/50">
                            {globalIncomingCall.profilePicture ? (
                                <img src={globalIncomingCall.profilePicture} alt="Caller" className="w-full h-full object-cover" />
                            ) : (
                                <PhoneIncoming className="w-12 h-12 text-primary" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">
                                {globalIncomingCall.callerName}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1 capitalize tracking-wide">
                                {t('sidebar.incoming_call', { type: globalIncomingCall.callType || 'voice' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-8 w-full justify-center mt-2">
                            <button onClick={() => { socket.emit('end_call', { to: globalIncomingCall.from }); setGlobalIncomingCall(null); pauseAudio('incoming'); }} className="w-16 h-16 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 text-white">
                                <PhoneOff className="w-7 h-7" />
                            </button>
                            <button onClick={() => answerIncomingCall(globalIncomingCall)} className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 text-white">
                                {globalIncomingCall.callType === 'video' ? <Video className="w-7 h-7 fill-current" /> : <Phone className="w-7 h-7 fill-current" />}
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