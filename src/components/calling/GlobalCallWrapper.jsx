import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { PhoneOff, Phone, Video, User } from "lucide-react";
import CallOverlay from "../../pages/shared/CallOverlay";
import { Capacitor, registerPlugin } from '@capacitor/core';

// Safe lazy getter - only registers once, handles hot-reloads safely
const getNativeSettings = () => {
    if (!window.__NativeSettings) {
        try {
            window.__NativeSettings = registerPlugin('NativeSettingsPlugin');
        } catch (e) {
            // Already registered - get the existing instance
            window.__NativeSettings = Capacitor.Plugins?.NativeSettingsPlugin;
        }
    }
    return window.__NativeSettings;
};

const getValidSignal = (signal) => {
    let parsed = signal;

    // 1. Unpack stringified JSON
    while (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
            break;
        }
    }

    // 2. If it's STILL a broken string, try regex fallback extraction
    if (typeof parsed === 'string') {
        const typeMatch = parsed.match(/"type"\s*:\s*"([^"]+)"/);
        const sdpMatch = parsed.match(/"sdp"\s*:\s*"([^]*?)"/);
        if (typeMatch && sdpMatch) {
            parsed = { type: typeMatch[1], sdp: sdpMatch[1] };
        }
    }

    // 3. The Ultimate SDP Sanitizer
    if (parsed && typeof parsed === 'object' && parsed.sdp) {
        // Step A: Convert double-escaped literal strings (\\r\\n) back into actual newline characters
        let cleanSdp = parsed.sdp
            .replace(/\\r\\n/g, '\n') // Handle escaped \r\n
            .replace(/\\n/g, '\n')    // Handle escaped \n
            .replace(/\\r/g, '\n');   // Handle escaped \r

        // Step B: WebRTC strictly requires \r\n (CRLF) for every line. 
        // We strip all existing \r to standardize on \n, then replace all \n with \r\n
        parsed.sdp = cleanSdp.replace(/\r/g, '').replace(/\n/g, '\r\n');

        // Step C: Ensure the SDP ends with exactly one newline, as per the WebRTC spec
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

    const [isCallAccepted, setIsCallAccepted] = useState(false);
    const [callPeer, setCallPeer] = useState(null);
    const [currentCallType, setCurrentCallType] = useState('voice');

    const [localStreamState, setLocalStreamState] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [remoteCallStatus, setRemoteCallStatus] = useState('active');
    const [videoUpgradeStatus, setVideoUpgradeStatus] = useState('idle');
    const [facingMode, setFacingMode] = useState('user');
    const [isMinimized, setIsMinimized] = useState(false);

    const pcRef = useRef(null);
    const localStreamRef = useRef(null);

    // 🚀 THE FIX: Define the missing Refs here
    const incomingPayloadRef = useRef(incomingPayload);
    const iceCandidateQueue = useRef([]);

    // Keep the Ref in sync with the prop to avoid stale closures
    useEffect(() => {
        incomingPayloadRef.current = incomingPayload;
    }, [incomingPayload]);

    // Helper to always get the correct target ID regardless of who called who
    const getTargetId = () => incomingPayload?.isOutgoing ? (incomingPayload.peer._id || incomingPayload.peer.id) : incomingPayload?.from;

    useEffect(() => {
        if (!incomingPayload) return;

        if (incomingPayload.isOutgoing) {
            setCallPeer({
                _id: incomingPayload.peer._id || incomingPayload.peer.id,
                name: incomingPayload.peer.name,
                profilePicture: incomingPayload.peer.profilePicture || incomingPayload.peer.groupIcon
            });
            setCurrentCallType(incomingPayload.callType || 'voice');
            initiateOutgoingCall(incomingPayload.peer, incomingPayload.callType);
        }
        else {
            setCallPeer({
                _id: incomingPayload.from,
                name: incomingPayload.callerName,
                profilePicture: incomingPayload.profilePicture
            });
            setCurrentCallType(incomingPayload.callType === 'video' || (incomingPayload.signal && incomingPayload.signal.sdp && incomingPayload.signal.sdp.includes('m=video')) ? 'video' : 'voice');

            if (window.__GLOBAL_AUDIO__?.incoming) {
                window.__GLOBAL_AUDIO__.incoming.loop = true;
                window.__GLOBAL_AUDIO__.incoming.play().catch(() => { });
            }
        }
    }, [incomingPayload]);

    const initiateOutgoingCall = async (peer, requestedType) => {
        try {
            if (window.__GLOBAL_AUDIO__?.ringing) {
                window.__GLOBAL_AUDIO__.ringing.loop = true;
                window.__GLOBAL_AUDIO__.ringing.play().catch(() => { });
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: requestedType === 'video' ? { facingMode: 'user', ...HQ_VIDEO_CONSTRAINTS } : false
            });

            localStreamRef.current = stream;
            setLocalStreamState(stream);

            const pc = new RTCPeerConnection(iceServers);
            pcRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate) socket.emit('ice_candidate', { to: peer._id || peer.id, candidate: e.candidate, from: user.id || user._id });
            };

            pc.ontrack = (e) => {
                if (e.streams && e.streams[0]) setRemoteStream(e.streams[0]);
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call_user', {
                userToCall: peer._id || peer.id,
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

    const answerIncomingCall = async () => {
        try {
            // 🛡️ THE DUMMY CHECK: If user clicks accept before the socket delivers the real SDP, make them wait!
            const checkSignal = getValidSignal(incomingPayloadRef.current?.signal);
            if (!checkSignal || Object.keys(checkSignal).length === 0) {
                toast.loading(t('toast.connecting') || "Securing connection, please wait...", { id: 'securing' });
                return; // Stop execution. They can click accept again when the socket arrives.
            }
            toast.dismiss('securing');

            if (window.__GLOBAL_AUDIO__?.incoming) window.__GLOBAL_AUDIO__.incoming.pause();

            // 🛡️ SMART POLLING: Wait for the Activity/WebView to fully grant hardware access
            let attempts = 0;
            while (!navigator.mediaDevices?.getUserMedia && attempts < 25) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Media devices unavailable");
            }

            let stream;
            // 🛡️ AUDIO FALLBACK: The Inner Try/Catch
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: currentCallType === 'video' ? { facingMode: 'user', ...HQ_VIDEO_CONSTRAINTS } : false
                });
            } catch (mediaError) {
                console.error(`🚨 MEDIA BLOCK: ${mediaError.name} - ${mediaError.message}`);

                if (currentCallType === 'video') {
                    toast("Camera blocked by lockscreen. Connecting voice only.", { icon: '🔒' });
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

            const pc = new RTCPeerConnection(iceServers);
            pcRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Use incomingPayloadRef to prevent stale closures
            pc.onicecandidate = (e) => {
                if (e.candidate) socket.emit('ice_candidate', { to: incomingPayloadRef.current?.from, candidate: e.candidate, from: user?.id || user?._id });
            };

            pc.ontrack = (e) => {
                if (e.streams && e.streams[0]) setRemoteStream(e.streams[0]);
            };

            const validSignal = getValidSignal(incomingPayloadRef.current?.signal);
            await pc.setRemoteDescription(new RTCSessionDescription(validSignal));

            // 🛡️ ICE QUEUE: Drain ICE candidates that arrived while we were polling/waiting
            for (const candidate of iceCandidateQueue.current) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
            }
            iceCandidateQueue.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('answer_call', { to: incomingPayloadRef.current?.from, signal: answer });

        } catch (error) {
            console.error("🚨 CRITICAL CALL ACCEPT ERROR:", error);
            if (error.name === 'NotAllowedError') {
                toast.error(t('toast.unlock_to_answer') || "Please unlock your phone to answer.");
            } else {
                toast.error(t('toast.camera_access_failed') || "Camera/Mic access failed or connection dropped.");
            }
            handleHangup();
        }
    };

    const handleHangup = () => {
        if (window.__GLOBAL_AUDIO__?.incoming) window.__GLOBAL_AUDIO__.incoming.pause();
        if (window.__GLOBAL_AUDIO__?.calling) window.__GLOBAL_AUDIO__.calling.pause();
        if (window.__GLOBAL_AUDIO__?.ringing) window.__GLOBAL_AUDIO__.ringing.pause();

        if (window.__GLOBAL_AUDIO__?.hangup) {
            window.__GLOBAL_AUDIO__.hangup.currentTime = 0;
            window.__GLOBAL_AUDIO__.hangup.play().catch(() => { });
        }

        const targetId = getTargetId();
        if (targetId) socket.emit('end_call', { to: targetId });

        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        if (pcRef.current) pcRef.current.close();

        clearCallNotification();
        clearCall();
    };

    // --- MID-CALL VIDEO UPGRADE LOGIC ---
    const handleRequestVideo = () => {
        socket.emit('video_upgrade_request', { to: getTargetId() });
        setVideoUpgradeStatus('requesting');
        toast(t('toast.requesting_video') || "Requesting video...", { icon: '⏳' });
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
                socket.emit('renegotiate', { to: getTargetId(), signal: offer });
            }
            setCurrentCallType('video');
        } catch (error) {
            toast.error(t('toast.camera_access_error') || "Camera access denied");
        }
    };

    const handleAcceptVideo = async () => {
        socket.emit('video_upgrade_accepted', { to: getTargetId() });
        setVideoUpgradeStatus('idle');
        await performVideoUpgrade();
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
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: newMode }, ...HQ_VIDEO_CONSTRAINTS } })
                .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode, ...HQ_VIDEO_CONSTRAINTS } }));

            const newVideoTrack = stream.getVideoTracks()[0];
            const sender = pcRef.current?.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) await sender.replaceTrack(newVideoTrack);

            const audioTracks = localStreamRef.current.getAudioTracks();
            const newLocalStream = new MediaStream([...audioTracks, newVideoTrack]);

            localStreamRef.current = newLocalStream;
            setLocalStreamState(newLocalStream);
            setFacingMode(newMode);
        } catch (err) {
            toast.error(t('toast.camera_switch_failed') || "Failed to switch camera");
        }
    };

    // --- SOCKET EVENT LISTENERS ---
    useEffect(() => {
        if (!socket) return;

        const handleCallAccepted = async (signal) => {
            if (window.__GLOBAL_AUDIO__?.ringing) window.__GLOBAL_AUDIO__.ringing.pause();
            if (window.__GLOBAL_AUDIO__?.calling) window.__GLOBAL_AUDIO__.calling.pause();

            setIsCallAccepted(true);
            if (pcRef.current) {
                try {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                    toast.success(t('toast.call_connected') || "Call Connected", { icon: '📞' });

                    // Drain ICE queue for outgoing calls too!
                    for (const candidate of iceCandidateQueue.current) {
                        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
                    }
                    iceCandidateQueue.current = [];
                } catch (e) {
                    console.error("Failed to set remote description", e);
                }
            }
        };

        const handleIceCandidate = async (data) => {
            if (data.candidate) {
                // Use .type to ensure it's a real initialized description
                if (pcRef.current && pcRef.current.remoteDescription?.type) {
                    try {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (e) { }
                } else {
                    // If WebRTC is still booting up (polling), queue the candidate!
                    iceCandidateQueue.current.push(data.candidate);
                }
            }
        };

        const handleCallEnded = () => {
            toast(t('toast.call_ended') || "Call Ended");
            handleHangup();
        };

        const handleRenegotiate = async ({ signal }) => {
            if (signal && signal.type === 'CUSTOM_EVENT') {
                if (signal.event === 'call_rejected_busy') {
                    toast.error(t('toast.user_busy') || "User is busy");
                    handleHangup();
                }
            } else if (pcRef.current) {
                try {
                    if (signal.type === 'offer') {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                        const answer = await pcRef.current.createAnswer();
                        await pcRef.current.setLocalDescription(answer);
                        socket.emit('renegotiate', { to: getTargetId(), signal: answer });
                    } else if (signal.type === 'answer') {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                    }
                } catch (e) { console.error(e); }
            }
        };

        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("call_ended", handleCallEnded);
        socket.on("renegotiate", handleRenegotiate);

        // VIDEO UPGRADE LISTENERS
        socket.on("video_upgrade_request", () => {
            setVideoUpgradeStatus('receiving_request');
            if (window.__GLOBAL_AUDIO__?.notification) window.__GLOBAL_AUDIO__.notification.play();
        });
        socket.on("video_upgrade_rejected", () => {
            setVideoUpgradeStatus('idle');
            toast.error(t('toast.video_rejected') || "Video request declined");
        });
        socket.on("video_upgrade_accepted", async () => {
            setVideoUpgradeStatus('idle');
            toast.success(t('toast.video_accepted') || "Video request accepted");
            await performVideoUpgrade();
        });

        return () => {
            socket.off("call_accepted", handleCallAccepted);
            socket.off("ice_candidate", handleIceCandidate);
            socket.off("call_ended", handleCallEnded);
            socket.off("renegotiate", handleRenegotiate);
            socket.off("video_upgrade_request");
            socket.off("video_upgrade_rejected");
            socket.off("video_upgrade_accepted");
        };
    }, [socket, t]);

    if (!callPeer) return null;

    if (!incomingPayload.isOutgoing && !isCallAccepted) {
        return (
            <div style={{ zIndex: 9999999, position: 'fixed', inset: 0 }} className="bg-[#0B0D12] flex flex-col items-center justify-between py-24 px-6 animate-in fade-in duration-500">
                <div className="flex flex-col items-center mt-12">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple"></div>
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple-delayed"></div>
                        <div className="w-36 h-36 sm:w-44 sm:h-44 bg-primary/10 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.3)] overflow-hidden border-4 border-white/10 relative z-10">
                            {callPeer.profilePicture ? (
                                <img src={callPeer.profilePicture} alt="Caller" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/20 to-primary/5">
                                    <User className="w-20 h-20 text-primary/60" />
                                </div>
                            )}
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white mt-10 tracking-tight text-center px-4">{callPeer.name}</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <p className="text-primary font-bold text-xs uppercase tracking-[0.3em]">
                            {currentCallType === 'video' ? (t('navbar.incoming_video') || "Incoming Video Call") : (t('navbar.incoming_voice') || "Incoming Voice Call")}
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
                        <button onClick={answerIncomingCall} className="w-20 h-20 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(16,185,129,0.7)] transition-all active:scale-90 text-white animate-bounce-subtle">
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
            peer={callPeer}
            onHangup={handleHangup}
            isMinimized={isMinimized}
            setIsMinimized={setIsMinimized}
            localStream={localStreamState}
            remoteStream={remoteStream}
            isCallAccepted={isCallAccepted}
            isOnline={true}
            callType={currentCallType}

            onRequestVideo={handleRequestVideo}
            onAcceptVideo={handleAcceptVideo}
            onRejectVideo={handleRejectVideo}
            videoUpgradeStatus={videoUpgradeStatus}
            onFlipCamera={handleFlipCamera}
            facingMode={facingMode}
            remoteCallStatus={remoteCallStatus}
            waitingCall={null}
            onAcceptWaitingCall={() => { }}
            onRejectWaitingCall={() => { }}
        />
    );
};

export default GlobalCallWrapper;