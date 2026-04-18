import { useState, useEffect, useRef, useCallback } from "react";
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

// FIX: Play audio without constantly resetting if already playing
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

    // --- 1-on-1 CALL WAITING & HOLD STATE ---
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

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    const pathnameRef = useRef(location.pathname);
    useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);
    useEffect(() => { currentPeerRef.current = callPeer; }, [callPeer]);

    useEffect(() => {
        if (location.pathname.includes('/notifications')) setNotifCount(0);
        if (location.pathname.includes('/chat')) setUnreadChatCount(0);
    }, [location.pathname]);

    // --- BUG FIX: ADDED MISSING OUTBOUND AUDIO LOGIC HERE ---
    useEffect(() => {
        if (activeCall && !isCallAccepted && callPeer && remoteCallStatus === 'active') {
            const isPeerOnline = onlineUsers.includes(String(callPeer._id || callPeer.id));
            if (isPeerOnline) {
                pauseAudio('calling');
                if (globalAudio.ringing) globalAudio.ringing.loop = true;
                playAudio('ringing');
            } else {
                pauseAudio('ringing');
                if (globalAudio.calling) globalAudio.calling.loop = true;
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
    }, [activeCall, isCallAccepted, callPeer, onlineUsers, remoteCallStatus]);
    // --------------------------------------------------------

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

    // Handle clicks outside the mobile menu to close it smoothly
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            const peerToCall = e.detail;
            const requestedType = peerToCall.callType || 'voice';
            const mediaResult = await setupMedia(requestedType);
            if (!mediaResult || !mediaResult.stream) return;
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

        // 1. Initialize the communication channel for this tab
        const ringChannel = new BroadcastChannel('workedu_call_channel');

        const currentUserId = user.id || user._id;
        const joinUserRoom = () => { socket.emit("join_room", currentUserId); socket.emit("join_admin_room"); };
        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleIncomingChat = (data) => {
            if (!pathnameRef.current.includes('/chat')) {
                setUnreadChatCount(prev => prev + 1);
                playAudio('notification');
                toast.success(t('toast.new_chat'), { icon: '💬', id: 'new-chat-toast' });
            }
        };

        // 2. Updated Exclusive Ringer handleIncomingCall
        const handleIncomingCall = (data) => {
            if (activeCall) {
                socket.emit('renegotiate', { to: data.from, signal: { type: 'CUSTOM_EVENT', event: 'call_waiting' } });
                setWaitingIncomingCall(data);
                playAudio('notification');
            } else {
                setGlobalIncomingCall(data);

                // --- EXCLUSIVE RINGER LOGIC START ---
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
                // --- EXCLUSIVE RINGER LOGIC END ---
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
        socket.on("online_users_updated", setOnlineUsers);

        return () => {
            // 3. Close the channel when the component unmounts
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
            socket.off("online_users_updated", setOnlineUsers);
        };
    }, [user, token, activeCall, t]);

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
                        <button onClick={() => dispatch(toggleTheme())} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"><div className="w-5 h-5">{themeMode === 'dark' ? <Moon /> : <Sun className="text-amber-500" />}</div></button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="hidden xl:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"><Settings className="w-5 h-5" /></button>
                        <button onClick={handleLogout} className="hidden xl:flex p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
                        <div className="relative xl:hidden" ref={mobileMenuRef}>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative p-1 rounded-full hover:bg-muted transition-colors">
                                {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-border" /> : <UserCircle className="w-7 h-7 text-muted-foreground" />}
                            </button>

                            {/* Smooth Transition wrapper for Mobile Menu */}
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
                                <div className="my-1 border-t border-border" />
                                <button onClick={() => { dispatch(toggleTheme()); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><div className="flex items-center gap-3">{themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}<span>{themeMode === 'dark' ? t('navbar.dark_mode') : t('navbar.light_mode')}</span></div></button>
                                <button onClick={() => { setIsMobileMenuOpen(false); setIsSettingsModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Settings className="w-4 h-4" /> {t('navbar.settings')}</button>
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

            {globalIncomingCall && !activeCall && (
                <div className="fixed inset-0 z-100000 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                    <div className="bg-card dark:bg-[#13151A] p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-80 text-center animate-in zoom-in-95 border border-border">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.4)] overflow-hidden border-2 border-primary/50">
                            {globalIncomingCall.profilePicture ? (
                                <img src={globalIncomingCall.profilePicture} alt="Caller" className="w-full h-full object-cover" />
                            ) : (
                                <PhoneIncoming className="w-10 h-10 text-primary" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">
                                {globalIncomingCall.callerName}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1 capitalize">
                                {t('navbar.incoming_call', { type: globalIncomingCall.callType || 'voice' })}
                            </p>
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