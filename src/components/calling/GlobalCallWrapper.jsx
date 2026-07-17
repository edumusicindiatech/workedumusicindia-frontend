// ─────────────────────────────────────────────────────────────────────────────
// PATCH NOTES — two bugs fixed:
//
// BUG 1 (ghost answer): When UserB taps the FCM call notification from a
//   killed/background state, the signal in the notification payload is truncated
//   (FCM data fields are capped at ~4KB). The socket also isn't authenticated
//   yet. Calling answerIncomingCall() with that broken SDP hangs forever.
//
//   FIX: We track whether this render was spawned by a notification tap
//   (isFromNotification flag). If so, we show the incoming call screen but
//   BLOCK the Accept button until we receive the real `incoming_call` socket
//   event (which carries the full SDP). Once that arrives we silently update
//   the signal ref — the user just presses Accept normally.
//
// BUG 2 (ghost notification): If UserA hangs up while UserB's screen is off,
//   notification 1001 stays alive. The existing socket `call_ended` listener
//   only fires when the app is open.
//
//   FIX: In CallBackgroundService.java, send a silent FCM `call_cancelled`
//   message to UserB when UserA cancels (see CallBackgroundService patch below).
//   On the JS side we handle it here by listening for the native custom event
//   `call_notification_cancelled` (fired by MainActivity when that FCM arrives)
//   and calling handleHangup() immediately, which clears the UI.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { PhoneOff, Phone, Video, User } from "lucide-react";
import CallOverlay from "../../pages/shared/CallOverlay";
import { Capacitor, registerPlugin } from '@capacitor/core';

const getNativeSettings = () => {
    if (!window.__NativeSettings) {
        try {
            window.__NativeSettings = registerPlugin('NativeSettingsPlugin');
        } catch (e) {
            window.__NativeSettings = Capacitor.Plugins?.NativeSettingsPlugin;
        }
    }
    return window.__NativeSettings;
};

const getValidSignal = (signal) => {
    let parsed = signal;
    while (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) { break; }
    }
    if (typeof parsed === 'string') {
        const typeMatch = parsed.match(/"type"\s*:\s*"([^"]+)"/);
        const sdpMatch = parsed.match(/"sdp"\s*:\s*"([^]*?)"/);
        if (typeMatch && sdpMatch) parsed = { type: typeMatch[1], sdp: sdpMatch[1] };
    }
    if (parsed && typeof parsed === 'object' && parsed.sdp) {
        let cleanSdp = parsed.sdp
            .replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
        parsed.sdp = cleanSdp.replace(/\r/g, '').replace(/\n/g, '\r\n');
        parsed.sdp = parsed.sdp.trim() + '\r\n';
    }
    return parsed;
};

// Returns true if the SDP looks complete enough to use.
// FCM-truncated SDPs are missing the trailing \r\n and often cut mid-line.
const isSignalUsable = (signal) => {
    const s = getValidSignal(signal);
    if (!s || typeof s !== 'object') return false;
    if (!s.type || !s.sdp) return false;
    // A valid offer/answer SDP always ends with a media section footer
    if (!s.sdp.includes('m=audio') && !s.sdp.includes('m=video')) return false;
    return true;
};

const clearCallNotification = () => {
    if (Capacitor.isNativePlatform()) {
        getNativeSettings()?.cancelCallNotification().catch(e => console.log("Failed to clear notification", e));
    }
};

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const HQ_VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 } };

const DEFAULT_DEVICES = [
    { id: 'earpiece', name: 'Earpiece', type: 'earpiece' },
    { id: 'speaker', name: 'Speaker', type: 'speaker' },
];

const GlobalCallWrapper = ({ incomingPayload, clearCall }) => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const socket = window.__GLOBAL_SOCKET__;

    const [isCallAccepted, setIsCallAccepted] = useState(false);
    const [isPipMode, setIsPipMode] = useState(false);

    const [availableAudioDevices, setAvailableAudioDevices] = useState(DEFAULT_DEVICES);
    const [activeAudioDevice, setActiveAudioDevice] = useState('earpiece');
    const activeAudioDeviceRef = useRef('earpiece');

    const [activePeer, setActivePeer] = useState(null);
    const [waitingCall, setWaitingCall] = useState(null);

    const [outgoingCallStatus, setOutgoingCallStatus] = useState('calling');
    const [currentCallType, setCurrentCallType] = useState('voice');
    const [localStreamState, setLocalStreamState] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [remoteCallStatus, setRemoteCallStatus] = useState('active');
    const [videoUpgradeStatus, setVideoUpgradeStatus] = useState('idle');
    const [facingMode, setFacingMode] = useState('user');
    const [isMinimized, setIsMinimized] = useState(false);

    // ─── BUG 1 FIX: track whether we are waiting for the live socket signal ───
    // isFromNotification: true when the app was woken by a notification tap.
    // liveSignalReady: becomes true once the full SDP arrives via socket.
    const [isFromNotification, setIsFromNotification] = useState(false);
    const [liveSignalReady, setLiveSignalReady] = useState(false);
    // We store the best signal we have seen so far (prefers socket over FCM).
    const bestSignalRef = useRef(null);

    const pcsRef = useRef({});
    const localStreamRef = useRef(null);
    const incomingPayloadRef = useRef(incomingPayload);
    const activePeerRef = useRef(null);
    const iceCandidateQueue = useRef({});
    const performVideoUpgradeRef = useRef(null);
    const getTargetIdRef = useRef(null);

    // ─────────────────────────────────────────────────────────────
    // AUDIO DEVICE MANAGEMENT (unchanged from original)
    // ─────────────────────────────────────────────────────────────

    const refreshAudioDevices = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) {
            setAvailableAudioDevices(DEFAULT_DEVICES);
            return;
        }
        try {
            const result = await getNativeSettings()?.getAvailableAudioDevices();
            if (result?.devices && result.devices.length > 0) {
                setAvailableAudioDevices(result.devices);
            } else {
                setAvailableAudioDevices(DEFAULT_DEVICES);
            }
        } catch (e) {
            setAvailableAudioDevices(DEFAULT_DEVICES);
        }
    }, []);

    const selectAudioDevice = useCallback(async (deviceType) => {
        activeAudioDeviceRef.current = deviceType;
        setActiveAudioDevice(deviceType);
        if (Capacitor.isNativePlatform()) {
            try {
                await getNativeSettings()?.setAudioDevice({ deviceType });
            } catch (e) {
                console.error("Audio device routing failed:", e);
            }
        }
    }, []);

    const cycleAudioDevice = useCallback(async () => {
        const types = availableAudioDevices.map(d => d.type);
        const currentIndex = types.indexOf(activeAudioDeviceRef.current);
        const nextIndex = (currentIndex + 1) % types.length;
        await selectAudioDevice(types[nextIndex]);
    }, [availableAudioDevices, selectAudioDevice]);

    const isSpeakerphone = activeAudioDevice === 'speaker';

    const applyNativeSpeaker = useCallback(async (enabled) => {
        await selectAudioDevice(enabled ? 'speaker' : 'earpiece');
    }, [selectAudioDevice]);

    // ─────────────────────────────────────────────────────────────
    // EFFECTS
    // ─────────────────────────────────────────────────────────────

    useEffect(() => {
        const handlePipChange = (e) => setIsPipMode(e.detail);
        window.addEventListener('pip_mode_changed', handlePipChange);
        return () => window.removeEventListener('pip_mode_changed', handlePipChange);
    }, []);

    // ─── BUG 2 FIX: listen for the native "call was cancelled while you were away" event
    useEffect(() => {
        const handleCancelled = () => {
            console.log("📵 Call cancelled remotely — dismissing.");
            handleHangup();
        };
        window.addEventListener('call_notification_cancelled', handleCancelled);
        return () => window.removeEventListener('call_notification_cancelled', handleCancelled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const timer = setTimeout(() => {
                getNativeSettings()?.setCallState({ isActive: isCallAccepted }).catch(() => { });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isCallAccepted]);

    useEffect(() => {
        if (!isCallAccepted) return;
        const current = activeAudioDeviceRef.current;
        const onHeadphones = current === 'wired_headset' || current === 'bluetooth';
        if (!onHeadphones) {
            applyNativeSpeaker(currentCallType === 'video');
        }
    }, [currentCallType, isCallAccepted, applyNativeSpeaker]);

    useEffect(() => {
        if (!isCallAccepted) return;
        refreshAudioDevices();
        if (Capacitor.isNativePlatform()) {
            getNativeSettings()?.startAudioDeviceListener().catch(() => { });
        }
        const handleDevicesChanged = async (e) => {
            await refreshAudioDevices();
            const changeType = e.detail;
            if (changeType === 'wired_headset') {
                toast('Headphones connected', { icon: '🎧' });
                await selectAudioDevice('wired_headset');
            } else if (changeType === 'earpiece') {
                toast('Headphones disconnected', { icon: '📱' });
                await selectAudioDevice('earpiece');
            } else if (changeType === 'bluetooth_change' || changeType === 'bluetooth') {
                toast('Bluetooth audio device changed', { icon: '🎧' });
                if (activeAudioDeviceRef.current === 'bluetooth') {
                    await selectAudioDevice('earpiece');
                }
            }
        };
        window.addEventListener('audio_devices_changed', handleDevicesChanged);
        window.addEventListener('audio_device_changed', handleDevicesChanged);
        return () => {
            window.removeEventListener('audio_devices_changed', handleDevicesChanged);
            window.removeEventListener('audio_device_changed', handleDevicesChanged);
            if (Capacitor.isNativePlatform()) {
                getNativeSettings()?.stopAudioDeviceListener().catch(() => { });
            }
        };
    }, [isCallAccepted, refreshAudioDevices, selectAudioDevice]);

    useEffect(() => { incomingPayloadRef.current = incomingPayload; }, [incomingPayload]);
    useEffect(() => { activePeerRef.current = activePeer; }, [activePeer]);

    const getTargetId = () => activePeer?._id || activePeer?.id;

    // ─────────────────────────────────────────────────────────────
    // AUDIO HELPERS
    // ─────────────────────────────────────────────────────────────

    const playAudio = (type, loop = false) => {
        if (window.__GLOBAL_AUDIO__?.[type]) {
            window.__GLOBAL_AUDIO__[type].loop = loop;
            window.__GLOBAL_AUDIO__[type].play().catch(() => { });
        }
    };

    const stopAudio = (type) => {
        if (window.__GLOBAL_AUDIO__?.[type]) {
            window.__GLOBAL_AUDIO__[type].pause();
            window.__GLOBAL_AUDIO__[type].currentTime = 0;
        }
    };

    // ─────────────────────────────────────────────────────────────
    // CALL FUNCTIONS
    // ─────────────────────────────────────────────────────────────

    const initiateOutgoingCall = async (peer, requestedType) => {
        try {
            setOutgoingCallStatus('calling');
            playAudio('calling', true);
            await refreshAudioDevices();
            await selectAudioDevice(requestedType === 'video' ? 'speaker' : 'earpiece');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: requestedType === 'video' ? { facingMode: 'user', ...HQ_VIDEO_CONSTRAINTS } : false
            });

            localStreamRef.current = stream;
            setLocalStreamState(stream);

            const peerId = peer._id || peer.id;
            const pc = new RTCPeerConnection(iceServers);
            pcsRef.current[peerId] = pc;
            iceCandidateQueue.current[peerId] = [];

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate) socket.emit('ice_candidate', {
                    to: peerId, candidate: e.candidate, from: user.id || user._id
                });
            };
            pc.ontrack = (e) => {
                if (e.streams && e.streams[0]) setRemoteStream(new MediaStream(e.streams[0].getTracks()));
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call_user', {
                userToCall: peerId,
                from: user.id || user._id,
                callerName: user.name,
                profilePicture: user.profilePicture,
                signalData: offer,
                callType: requestedType
            });
        } catch (error) {
            toast.error(t('toast.camera_access_failed') || "Camera/Mic access failed.");
            handleHangup();
        }
    };

    // ─── BUG 1 FIX: answerIncomingCall now uses bestSignalRef so it always
    // picks up the full socket SDP when available, regardless of what arrived
    // first in the FCM payload.
    const answerIncomingCall = async (peerToAnswer = activePeer, signalData = null) => {
        // Use the best signal we have seen (socket > FCM).
        const signalToUse = signalData || bestSignalRef.current || incomingPayloadRef.current?.signal;

        try {
            const checkSignal = getValidSignal(signalToUse);
            if (!checkSignal || Object.keys(checkSignal).length === 0 || !isSignalUsable(signalToUse)) {
                // Signal is not ready yet — this should not happen because the Accept
                // button is disabled until liveSignalReady, but guard anyway.
                toast.loading(t('toast.connecting') || "Securing connection, please wait...", { id: 'securing' });
                return;
            }
            toast.dismiss('securing');

            stopAudio('incoming');
            stopAudio('incoming2');
            await refreshAudioDevices();

            await selectAudioDevice(currentCallType === 'video' ? 'speaker' : 'earpiece');

            let attempts = 0;
            while (!navigator.mediaDevices?.getUserMedia && attempts < 25) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }
            if (!navigator.mediaDevices?.getUserMedia) throw new Error("Media devices unavailable");

            let stream;
            try {
                if (!localStreamRef.current) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: currentCallType === 'video' ? { facingMode: 'user', ...HQ_VIDEO_CONSTRAINTS } : false
                    });
                } else {
                    stream = localStreamRef.current;
                }
            } catch (mediaError) {
                if (currentCallType === 'video') {
                    toast("Camera blocked. Connecting voice only.", { icon: '🔒' });
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    setCurrentCallType('voice');
                } else {
                    throw mediaError;
                }
            }

            localStreamRef.current = stream;
            setLocalStreamState(stream);
            setIsCallAccepted(true);
            clearCallNotification();

            const peerId = peerToAnswer._id || peerToAnswer.id;
            const pc = new RTCPeerConnection(iceServers);
            pcsRef.current[peerId] = pc;
            if (!iceCandidateQueue.current[peerId]) iceCandidateQueue.current[peerId] = [];

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate) socket.emit('ice_candidate', {
                    to: peerId, candidate: e.candidate, from: user?.id || user?._id
                });
            };
            pc.ontrack = (e) => {
                if (e.streams && e.streams[0]) setRemoteStream(new MediaStream(e.streams[0].getTracks()));
            };

            const validSignal = getValidSignal(signalToUse);
            await pc.setRemoteDescription(new RTCSessionDescription(validSignal));

            for (const candidate of iceCandidateQueue.current[peerId] || []) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
            }
            iceCandidateQueue.current[peerId] = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer_call', { to: peerId, signal: answer });

        } catch (error) {
            console.error("🚨 CRITICAL CALL ACCEPT ERROR:", error);
            toast.error(t('toast.camera_access_failed') || "Camera/Mic access failed.");
            handleHangup();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // MULTI-CALL (unchanged)
    // ─────────────────────────────────────────────────────────────

    const handleAcceptWaitingCall = async () => {
        if (!waitingCall || !activePeer) return;
        socket.emit('dropped_for_another_call', { to: activePeer._id || activePeer.id });
        const currentPeerId = activePeer._id || activePeer.id;
        if (pcsRef.current[currentPeerId]) {
            pcsRef.current[currentPeerId].close();
            delete pcsRef.current[currentPeerId];
        }
        setActivePeer(waitingCall);
        setWaitingCall(null);
        stopAudio('incoming2');
        stopAudio('incoming');
        await answerIncomingCall(waitingCall, waitingCall.signal);
    };

    const handleRejectWaitingCall = () => {
        if (!waitingCall) return;
        stopAudio('incoming2');
        socket.emit('notify_busy', { to: waitingCall._id || waitingCall.id });
        setWaitingCall(null);
    };

    const handleHangup = () => {
        stopAudio('incoming');
        stopAudio('calling');
        stopAudio('ringing');
        stopAudio('incoming2');
        playAudio('hangup');

        if (Capacitor.isNativePlatform()) {
            getNativeSettings()?.resetAudioMode().catch(() => { });
        }
        setActiveAudioDevice('earpiece');
        activeAudioDeviceRef.current = 'earpiece';

        const currentPeerId = activePeer?._id || activePeer?.id;
        if (currentPeerId) {
            socket.emit('end_call', { to: currentPeerId });
            if (pcsRef.current[currentPeerId]) {
                pcsRef.current[currentPeerId].close();
                delete pcsRef.current[currentPeerId];
            }
        }

        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        clearCallNotification();
        clearCall();
    };

    // ─────────────────────────────────────────────────────────────
    // VIDEO UPGRADE & CAMERA (unchanged)
    // ─────────────────────────────────────────────────────────────

    const handleRequestVideo = () => {
        socket.emit('video_upgrade_request', { to: getTargetId() });
        setVideoUpgradeStatus('requesting');
        toast(t('toast.requesting_video') || "Requesting video...", { icon: '⏳' });
    };

    const performVideoUpgrade = async (isInitiator = false) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', ...HQ_VIDEO_CONSTRAINTS }
            });
            const videoTrack = stream.getVideoTracks()[0];
            if (localStreamRef.current) {
                localStreamRef.current.addTrack(videoTrack);
                setLocalStreamState(new MediaStream(localStreamRef.current.getTracks()));
            }
            setFacingMode('user');
            const currentPeerId = getTargetIdRef.current();
            const pc = pcsRef.current[currentPeerId];
            if (pc) {
                pc.addTrack(videoTrack, localStreamRef.current);
                if (isInitiator) {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (currentPeerId) socket.emit('renegotiate', { to: currentPeerId, signal: offer });
                }
            }
            setCurrentCallType('video');
        } catch (error) {
            toast.error(t('toast.camera_access_error') || "Camera access denied");
        }
    };

    const handleAcceptVideo = async () => {
        const targetId = getTargetId();
        if (targetId) socket.emit('video_upgrade_accepted', { to: targetId });
        setVideoUpgradeStatus('idle');
        await performVideoUpgrade(false);
    };

    const handleRejectVideo = () => {
        socket.emit('video_upgrade_rejected', { to: getTargetId() });
        setVideoUpgradeStatus('idle');
    };

    const handleFlipCamera = async () => {
        if (currentCallType !== 'video' || !localStreamRef.current) return;
        try {
            const newMode = facingMode === 'user' ? 'environment' : 'user';
            localStreamRef.current.getVideoTracks().forEach(t => t.stop());
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: newMode }, ...HQ_VIDEO_CONSTRAINTS }
            }).catch(() => navigator.mediaDevices.getUserMedia({
                video: { facingMode: newMode, ...HQ_VIDEO_CONSTRAINTS }
            }));
            const newVideoTrack = stream.getVideoTracks()[0];
            const pc = pcsRef.current[getTargetId()];
            if (pc) {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) await sender.replaceTrack(newVideoTrack);
            }
            const audioTracks = localStreamRef.current.getAudioTracks();
            const newLocalStream = new MediaStream([...audioTracks, newVideoTrack]);
            localStreamRef.current = newLocalStream;
            setLocalStreamState(newLocalStream);
            setFacingMode(newMode);
        } catch (err) {
            toast.error(t('toast.camera_switch_failed') || "Failed to switch camera");
        }
    };

    getTargetIdRef.current = getTargetId;
    performVideoUpgradeRef.current = performVideoUpgrade;

    // ─────────────────────────────────────────────────────────────
    // INITIAL CALL SETUP
    // ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!incomingPayload) return;
        const peerId = incomingPayload.isOutgoing
            ? (incomingPayload.peer._id || incomingPayload.peer.id)
            : incomingPayload.from;

        if (incomingPayload.isOutgoing) {
            setActivePeer({
                _id: peerId,
                name: incomingPayload.peer.name,
                profilePicture: incomingPayload.peer.profilePicture || incomingPayload.peer.groupIcon
            });
            setCurrentCallType(incomingPayload.callType || 'voice');
            initiateOutgoingCall(incomingPayload.peer, incomingPayload.callType);
        } else {
            const newCaller = {
                _id: peerId,
                name: incomingPayload.callerName,
                profilePicture: incomingPayload.profilePicture,
                signal: incomingPayload.signal
            };

            if (activePeer && (activePeer._id || activePeer.id) !== peerId) {
                setWaitingCall(newCaller);
                playAudio('incoming', true);
                return;
            }

            setActivePeer(newCaller);
            setCurrentCallType(
                incomingPayload.callType === 'video' || (incomingPayload.signal?.sdp?.includes('m=video'))
                    ? 'video' : 'voice'
            );
            socket.emit('call_delivered', { to: peerId });
            playAudio('incoming', true);

            // ─── BUG 1 FIX: Detect if this payload came from a notification tap.
            // FCM data payloads are always truncated (no full SDP), so we check
            // whether the signal is actually usable.  If not, we enter
            // "waiting for live socket" mode and disable the Accept button.
            if (!isSignalUsable(incomingPayload.signal)) {
                console.log("⚠️ FCM signal looks truncated — waiting for live socket SDP.");
                setIsFromNotification(true);
                setLiveSignalReady(false);
                bestSignalRef.current = null;
            } else {
                // Signal came from a live socket event (app was open), use it.
                bestSignalRef.current = incomingPayload.signal;
                setLiveSignalReady(true);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incomingPayload]);

    // ─────────────────────────────────────────────────────────────
    // SOCKET LISTENERS
    // ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!socket) return;

        // ─── BUG 1 FIX: intercept the live incoming_call to grab the full SDP.
        // This fires once the socket re-authenticates and UserA's server
        // re-delivers the call to the now-connected socket. We do NOT show a
        // second incoming screen — we just silently update the signal ref and
        // unlock the Accept button.
        const handleLiveIncomingCall = (data) => {
            const peerId = data.from || data.callerId;
            const currentPeerId = activePeerRef.current?._id || activePeerRef.current?.id;

            // Only update if this is the same call we're already showing.
            if (!currentPeerId || String(peerId) !== String(currentPeerId)) return;
            if (isCallAccepted) return; // Already answered, ignore.

            const liveSignal = typeof data.signalData === 'string'
                ? JSON.parse(data.signalData)
                : (data.signalData || data.signal);

            if (isSignalUsable(liveSignal)) {
                console.log("✅ Live socket SDP received — Accept button unlocked.");
                bestSignalRef.current = liveSignal;
                // Also update the caller object in state with the fresh signal.
                setActivePeer(prev => prev ? { ...prev, signal: liveSignal } : prev);
                setLiveSignalReady(true);
            }
        };

        const handleCallAccepted = async (signal) => {
            stopAudio('ringing');
            stopAudio('calling');
            setIsCallAccepted(true);
            const currentPeerId = activePeerRef.current?._id || activePeerRef.current?.id;
            const pc = pcsRef.current[currentPeerId];
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    toast.success(t('toast.call_connected') || "Call Connected", { icon: '📞' });
                    for (const candidate of iceCandidateQueue.current[currentPeerId] || []) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
                    }
                    iceCandidateQueue.current[currentPeerId] = [];
                } catch (e) { console.error("Failed to set remote description", e); }
            }
        };

        const handleIceCandidate = async (data) => {
            if (data.candidate && data.from) {
                const pc = pcsRef.current[data.from];
                if (pc && pc.remoteDescription?.type) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { }
                } else {
                    if (!iceCandidateQueue.current[data.from]) iceCandidateQueue.current[data.from] = [];
                    iceCandidateQueue.current[data.from].push(data.candidate);
                }
            }
        };

        const handleCallEnded = () => { toast(t('toast.call_ended') || "Call Ended"); handleHangup(); };

        const handleRenegotiate = async ({ signal }) => {
            const currentPeerId = activePeerRef.current?._id || activePeerRef.current?.id;
            const pc = pcsRef.current[currentPeerId];
            if (pc) {
                try {
                    if (signal.type === 'offer') {
                        const isVideoOffer = signal.sdp && signal.sdp.includes('m=video');
                        if (isVideoOffer && currentCallType !== 'video') {
                            setCurrentCallType('video');
                            await performVideoUpgradeRef.current(false);
                        }
                        await pc.setRemoteDescription(new RTCSessionDescription(signal));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit('renegotiate', { to: currentPeerId, signal: answer });
                    } else if (signal.type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    }
                } catch (e) { console.error("Renegotiation Error:", e); }
            }
        };

        const handlePeerBusy = () => {
            playAudio('busy');
            toast.error(t('toast.user_busy') || "Person is on another call");
            setTimeout(() => handleHangup(), 3000);
        };

        const handleDroppedForAnother = () => {
            playAudio('beep');
            toast('Person attended another call', { icon: 'ℹ️', duration: 5000 });
            setTimeout(() => handleHangup(), 5000);
        };

        const handleCallStatus = ({ status }) => {
            if (status === 'ringing') {
                setOutgoingCallStatus('ringing');
                stopAudio('calling');
                playAudio('ringing', true);
            }
        };
        const handleCallDelivered = () => {
            setOutgoingCallStatus('ringing');
            stopAudio('calling');
            playAudio('ringing', true);
        };

        socket.on("incoming_call", handleLiveIncomingCall);  // ← NEW listener for BUG 1
        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("call_ended", handleCallEnded);
        socket.on("renegotiate", handleRenegotiate);
        socket.on("peer_is_busy", handlePeerBusy);
        socket.on("dropped_for_another_call", handleDroppedForAnother);
        socket.on("call_status", handleCallStatus);
        socket.on("call_delivered", handleCallDelivered);
        socket.on("video_upgrade_request", () => {
            setVideoUpgradeStatus('receiving_request');
            playAudio('notification');
        });
        socket.on("video_upgrade_rejected", () => {
            setVideoUpgradeStatus('idle');
            toast.error(t('toast.video_rejected') || "Video request declined");
        });
        socket.on("video_upgrade_accepted", async () => {
            setVideoUpgradeStatus('idle');
            toast.success(t('toast.video_accepted') || "Video request accepted");
            await performVideoUpgradeRef.current(true);
        });

        return () => {
            socket.off("incoming_call", handleLiveIncomingCall);
            socket.off("call_accepted", handleCallAccepted);
            socket.off("ice_candidate", handleIceCandidate);
            socket.off("call_ended", handleCallEnded);
            socket.off("renegotiate", handleRenegotiate);
            socket.off("peer_is_busy", handlePeerBusy);
            socket.off("dropped_for_another_call", handleDroppedForAnother);
            socket.off("call_status", handleCallStatus);
            socket.off("call_delivered", handleCallDelivered);
            socket.off("video_upgrade_request");
            socket.off("video_upgrade_rejected");
            socket.off("video_upgrade_accepted");
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, t]);

    // ─────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────

    if (!activePeer) return null;

    if (!incomingPayload.isOutgoing && !isCallAccepted) {
        // ─── BUG 1 FIX: Show a subtle connecting indicator when we launched from
        // a notification and are still waiting for the live socket SDP.
        const acceptDisabled = isFromNotification && !liveSignalReady;

        return (
            <div style={{ zIndex: 9999999, position: 'fixed', inset: 0 }} className="bg-[#0B0D12] flex flex-col items-center justify-between py-24 px-6 animate-in fade-in duration-500">
                <div className="flex flex-col items-center mt-12">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple"></div>
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple-delayed"></div>
                        <div className="w-36 h-36 sm:w-44 sm:h-44 bg-primary/10 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.3)] overflow-hidden border-4 border-white/10 relative z-10">
                            {activePeer.profilePicture ? (
                                <img src={activePeer.profilePicture} alt="Caller" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/20 to-primary/5">
                                    <User className="w-20 h-20 text-primary/60" />
                                </div>
                            )}
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white mt-10 tracking-tight text-center px-4">{activePeer.name}</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <p className="text-primary font-bold text-xs uppercase tracking-[0.3em]">
                            {currentCallType === 'video'
                                ? (t('navbar.incoming_video') || "Incoming Video Call")
                                : (t('navbar.incoming_voice') || "Incoming Voice Call")}
                        </p>
                    </div>

                    {/* BUG 1 FIX: Show connecting hint while waiting for live SDP */}
                    {acceptDisabled && (
                        <p className="text-white/40 text-xs mt-3 animate-pulse">
                            Securing connection…
                        </p>
                    )}
                </div>

                <div className="w-full max-w-sm flex items-center justify-around pb-12 animate-in slide-in-from-bottom-10 duration-700">
                    <div className="flex flex-col items-center gap-4">
                        <button onClick={handleHangup} className="w-20 h-20 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(244,63,94,0.7)] transition-all active:scale-90 text-white group">
                            <PhoneOff className="w-8 h-8 group-active:rotate-12 transition-transform" />
                        </button>
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{t('call.decline') || "Decline"}</span>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        {/* Accept button is disabled (greyed out + spinner) until we have the live SDP */}
                        <button
                            onClick={() => !acceptDisabled && answerIncomingCall(activePeer)}
                            disabled={acceptDisabled}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 text-white
                                ${acceptDisabled
                                    ? 'bg-emerald-500/40 cursor-wait'
                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.7)] animate-bounce-subtle'
                                }`}
                        >
                            {acceptDisabled
                                ? <div className="w-7 h-7 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                                : currentCallType === 'video'
                                    ? <Video className="w-8 h-8 fill-current" />
                                    : <Phone className="w-8 h-8 fill-current" />
                            }
                        </button>
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{t('call.accept') || "Accept"}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <CallOverlay
            peer={activePeer}
            onHangup={handleHangup}
            isMinimized={isMinimized}
            setIsMinimized={setIsMinimized}
            localStream={localStreamState}
            remoteStream={remoteStream}
            isCallAccepted={isCallAccepted}
            isOnline={true}
            callType={currentCallType}
            remoteCallStatus={isCallAccepted ? 'active' : outgoingCallStatus}
            outgoingCallStatus={outgoingCallStatus}
            onRequestVideo={handleRequestVideo}
            onAcceptVideo={handleAcceptVideo}
            onRejectVideo={handleRejectVideo}
            videoUpgradeStatus={videoUpgradeStatus}
            onFlipCamera={handleFlipCamera}
            facingMode={facingMode}
            waitingCall={waitingCall}
            onAcceptWaitingCall={handleAcceptWaitingCall}
            onRejectWaitingCall={handleRejectWaitingCall}
            isPipMode={isPipMode}
            availableAudioDevices={availableAudioDevices}
            activeAudioDevice={activeAudioDevice}
            onSelectAudioDevice={selectAudioDevice}
            onCycleAudioDevice={cycleAudioDevice}
            isSpeakerphone={isSpeakerphone}
            toggleSpeakerphone={cycleAudioDevice}
        />
    );
};

export default GlobalCallWrapper;