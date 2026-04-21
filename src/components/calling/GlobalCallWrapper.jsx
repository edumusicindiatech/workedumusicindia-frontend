import React, { useState, useEffect, useRef } from "react";
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
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
            break;
        }
    }

    if (typeof parsed === 'string') {
        const typeMatch = parsed.match(/"type"\s*:\s*"([^"]+)"/);
        const sdpMatch = parsed.match(/"sdp"\s*:\s*"([^]*?)"/);
        if (typeMatch && sdpMatch) {
            parsed = { type: typeMatch[1], sdp: sdpMatch[1] };
        }
    }

    if (parsed && typeof parsed === 'object' && parsed.sdp) {
        let cleanSdp = parsed.sdp
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n');

        parsed.sdp = cleanSdp.replace(/\r/g, '').replace(/\n/g, '\r\n');
        parsed.sdp = parsed.sdp.trim() + '\r\n';
    }

    return parsed;
};

const clearCallNotification = () => {
    if (Capacitor.isNativePlatform()) {
        getNativeSettings()?.cancelCallNotification().catch(e => console.log("Failed to clear notification", e));
    }
};

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const HQ_VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 } };

const GlobalCallWrapper = ({ incomingPayload, clearCall }) => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const socket = window.__GLOBAL_SOCKET__;

    // --- STATE ---
    const [isCallAccepted, setIsCallAccepted] = useState(false);

    // Multi-Call State Management
    const [activePeer, setActivePeer] = useState(null);
    const [heldPeer, setHeldPeer] = useState(null);
    const [waitingCall, setWaitingCall] = useState(null);
    const [isMeOnHold, setIsMeOnHold] = useState(false);

    // 🚀 NEW: WhatsApp-style Call Status State ('calling' vs 'ringing')
    const [outgoingCallStatus, setOutgoingCallStatus] = useState('calling');

    const [currentCallType, setCurrentCallType] = useState('voice');
    const [localStreamState, setLocalStreamState] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [remoteCallStatus, setRemoteCallStatus] = useState('active');
    const [videoUpgradeStatus, setVideoUpgradeStatus] = useState('idle');
    const [facingMode, setFacingMode] = useState('user');
    const [isMinimized, setIsMinimized] = useState(false);

    // --- REFS ---
    const pcsRef = useRef({});
    const localStreamRef = useRef(null);
    const incomingPayloadRef = useRef(incomingPayload);
    const activePeerRef = useRef(null);
    const iceCandidateQueue = useRef({});
    const videoUpgradeInitiatedByMe = useRef(false);
    const performVideoUpgradeRef = useRef(null);
    const getTargetIdRef = useRef(null);

    // Keep refs in sync
    useEffect(() => {
        incomingPayloadRef.current = incomingPayload;
    }, [incomingPayload]);

    useEffect(() => {
        activePeerRef.current = activePeer;
    }, [activePeer]);

    const getTargetId = () => activePeer?._id || activePeer?.id;

    // --- AUDIO HELPERS ---
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

    // --- FUNCTIONS ---

    const initiateOutgoingCall = async (peer, requestedType) => {
        try {
            // 🚀 Start with 'calling.mp3' by default until Server acknowledges 'ringing'
            setOutgoingCallStatus('calling');
            playAudio('calling', true);

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
                    to: peerId,
                    candidate: e.candidate,
                    from: user.id || user._id
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

    const answerIncomingCall = async (peerToAnswer = activePeer, signalData = incomingPayloadRef.current?.signal) => {
        try {
            const checkSignal = getValidSignal(signalData);
            if (!checkSignal || Object.keys(checkSignal).length === 0) {
                toast.loading(t('toast.connecting') || "Securing connection, please wait...", { id: 'securing' });
                return;
            }
            toast.dismiss('securing');

            stopAudio('incoming');
            stopAudio('incoming2');

            let attempts = 0;
            while (!navigator.mediaDevices?.getUserMedia && attempts < 25) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Media devices unavailable");
            }

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
                console.error(`🚨 MEDIA BLOCK: ${mediaError.name} - ${mediaError.message}`);
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
                    to: peerId,
                    candidate: e.candidate,
                    from: user?.id || user?._id
                });
            };

            pc.ontrack = (e) => {
                if (e.streams && e.streams[0]) setRemoteStream(new MediaStream(e.streams[0].getTracks()));
            };

            const validSignal = getValidSignal(signalData);
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

    const handleAcceptWaitingCall = async () => {
        if (!waitingCall || !activePeer) return;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.enabled = false);
        }

        socket.emit('hold_call', { to: activePeer._id || activePeer.id, from: user.id || user._id });
        setHeldPeer(activePeer);

        setActivePeer(waitingCall);
        setWaitingCall(null);
        stopAudio('incoming2');

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

        const currentPeerId = activePeer?._id || activePeer?.id;

        if (currentPeerId) {
            socket.emit('end_call', { to: currentPeerId });
            if (pcsRef.current[currentPeerId]) {
                pcsRef.current[currentPeerId].close();
                delete pcsRef.current[currentPeerId];
            }
        }

        // AUTO RESUME LOGIC
        if (heldPeer) {
            setActivePeer(heldPeer);
            setHeldPeer(null);

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.enabled = true);
            }

            socket.emit('resume_call', { to: heldPeer._id || heldPeer.id });
            toast(`Resumed call with ${heldPeer.name}`, { icon: '▶️' });
        } else {
            // Full teardown
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
            clearCallNotification();
            clearCall();
        }
    };

    // --- VIDEO UPGRADE & CAMERA LOGIC ---

    const handleRequestVideo = () => {
        videoUpgradeInitiatedByMe.current = true;
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
                    if (currentPeerId) {
                        socket.emit('renegotiate', { to: currentPeerId, signal: offer });
                    }
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

    // --- INITIAL CALL SETUP ---
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
                playAudio('incoming2', true);
                return;
            }

            setActivePeer(newCaller);
            setCurrentCallType(
                incomingPayload.callType === 'video' || (incomingPayload.signal?.sdp?.includes('m=video'))
                    ? 'video' : 'voice'
            );

            // 🚀 NEW: Tell caller we received the payload so they can switch from "Calling" to "Ringing"
            socket.emit('call_delivered', { to: peerId });
            playAudio('incoming', true);
        }
    }, [incomingPayload]);

    // --- SOCKET EVENT LISTENERS ---
    useEffect(() => {
        if (!socket) return;

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
                } catch (e) {
                    console.error("Failed to set remote description", e);
                }
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

        const handleCallEnded = () => {
            toast(t('toast.call_ended') || "Call Ended");
            handleHangup();
        };

        const handleRenegotiate = async ({ signal }) => {
            const currentPeerId = activePeerRef.current?._id || activePeerRef.current?.id;
            const pc = pcsRef.current[currentPeerId];

            if (pc) {
                try {
                    if (signal.type === 'offer') {
                        const hasVideo = signal.sdp && signal.sdp.includes('m=video');
                        if (hasVideo) setCurrentCallType('video');

                        await pc.setRemoteDescription(new RTCSessionDescription(signal));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        socket.emit('renegotiate', { to: currentPeerId, signal: answer });
                    } else if (signal.type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    }
                } catch (e) {
                    console.error("Renegotiation Error:", e);
                }
            }
        };

        // Multi-Call Events
        const handlePeerBusy = () => {
            playAudio('busy');
            toast.error(t('toast.user_busy') || "Person is on another call");
            setTimeout(() => handleHangup(), 3000);
        };

        const handleCallOnHold = () => {
            setIsMeOnHold(true);
            playAudio('hold', true);
            toast('Person put your call on hold', { icon: '⏸️' });
        };

        const handleCallResumed = () => {
            setIsMeOnHold(false);
            stopAudio('hold');
            toast('Call resumed', { icon: '▶️' });
        };

        // 🚀 NEW: Switch between Calling.mp3 and Ringing.mp3
        const handleCallStatus = ({ status }) => {
            console.log(`[DEBUG - USER A] Received call_status from server: ${status}`);
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

        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("call_ended", handleCallEnded);
        socket.on("renegotiate", handleRenegotiate);
        socket.on("peer_is_busy", handlePeerBusy);
        socket.on("call_on_hold", handleCallOnHold);
        socket.on("call_resumed", handleCallResumed);

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
            socket.off("call_accepted", handleCallAccepted);
            socket.off("ice_candidate", handleIceCandidate);
            socket.off("call_ended", handleCallEnded);
            socket.off("renegotiate", handleRenegotiate);
            socket.off("peer_is_busy", handlePeerBusy);
            socket.off("call_on_hold", handleCallOnHold);
            socket.off("call_resumed", handleCallResumed);
            socket.off("call_status", handleCallStatus);
            socket.off("call_delivered", handleCallDelivered);
            socket.off("video_upgrade_request");
            socket.off("video_upgrade_rejected");
            socket.off("video_upgrade_accepted");
        };
    }, [socket, t]);

    if (!activePeer) return null;

    if (!incomingPayload.isOutgoing && !isCallAccepted && !heldPeer) {
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
                </div>

                <div className="w-full max-w-sm flex items-center justify-around pb-12 animate-in slide-in-from-bottom-10 duration-700">
                    <div className="flex flex-col items-center gap-4">
                        <button onClick={handleHangup} className="w-20 h-20 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(244,63,94,0.7)] transition-all active:scale-90 text-white group">
                            <PhoneOff className="w-8 h-8 group-active:rotate-12 transition-transform" />
                        </button>
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{t('call.decline') || "Decline"}</span>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        <button onClick={() => answerIncomingCall(activePeer)} className="w-20 h-20 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(16,185,129,0.7)] transition-all active:scale-90 text-white animate-bounce-subtle">
                            {currentCallType === 'video' ? <Video className="w-8 h-8 fill-current" /> : <Phone className="w-8 h-8 fill-current" />}
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

            // 🚀 Pass dynamic status out to UI
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
            isMeOnHold={isMeOnHold}
            heldPeer={heldPeer}
        />
    );
};

export default GlobalCallWrapper;