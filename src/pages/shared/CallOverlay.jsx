import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    Mic, MicOff, Volume2, VolumeX, PhoneOff,
    ChevronLeft, User, Video, VideoOff, Lock, SwitchCamera, Phone,
    Headphones, Bluetooth, Smartphone, Speaker
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Audio device icon + label helper
// ─────────────────────────────────────────────────────────────
const DEVICE_META = {
    earpiece:     { icon: Smartphone,  color: 'text-white',       label: 'Earpiece'  },
    speaker:      { icon: Volume2,     color: 'text-amber-400',   label: 'Speaker'   },
    wired_headset:{ icon: Headphones,  color: 'text-emerald-400', label: 'Headphones'},
    bluetooth:    { icon: Bluetooth,   color: 'text-blue-400',    label: 'Bluetooth' },
};

const getDeviceMeta = (type) => DEVICE_META[type] || DEVICE_META['earpiece'];

// ─────────────────────────────────────────────────────────────
// Audio Device Picker — bottom sheet style
// ─────────────────────────────────────────────────────────────
const AudioDevicePicker = ({ devices, activeDevice, onSelect, onClose }) => (
    <div
        className="absolute inset-0 z-[9999998] flex items-end justify-center pointer-events-auto"
        onClick={onClose}
    >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Sheet */}
        <div
            className="relative w-full max-w-sm mx-auto bg-[#1f2c33] rounded-t-3xl border-t border-white/10 shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4 text-center">
                Audio Output
            </p>

            <div className="flex flex-col gap-2">
                {devices.map((device) => {
                    const meta = getDeviceMeta(device.type);
                    const IconComponent = meta.icon;
                    const isActive = activeDevice === device.type;

                    return (
                        <button
                            key={device.id}
                            onClick={() => { onSelect(device.type); onClose(); }}
                            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl transition-all active:scale-98 ${
                                isActive
                                    ? 'bg-white/15 border border-white/20'
                                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-white/20' : 'bg-white/10'
                            }`}>
                                <IconComponent
                                    size={20}
                                    className={isActive ? meta.color : 'text-white/60'}
                                />
                            </div>
                            <div className="flex-1 text-left">
                                <p className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-white/70'}`}>
                                    {device.name}
                                </p>
                                {device.type === 'earpiece' && (
                                    <p className="text-white/30 text-xs">Phone speaker</p>
                                )}
                                {device.type === 'speaker' && (
                                    <p className="text-white/30 text-xs">Loud speaker</p>
                                )}
                                {device.type === 'wired_headset' && (
                                    <p className="text-white/30 text-xs">Wired headphones</p>
                                )}
                                {device.type === 'bluetooth' && (
                                    <p className="text-white/30 text-xs">Wireless</p>
                                )}
                            </div>
                            {isActive && (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────
// Main CallOverlay Component
// ─────────────────────────────────────────────────────────────
const CallOverlay = ({
    peer, onHangup, isMinimized, setIsMinimized, localStream, remoteStream,
    isCallAccepted, isOnline, callType, onRequestVideo, onAcceptVideo,
    onRejectVideo, videoUpgradeStatus, onFlipCamera, facingMode,
    remoteCallStatus, outgoingCallStatus, waitingCall, onAcceptWaitingCall, onRejectWaitingCall,
    isPipMode,
    // 🔧 New audio device props
    availableAudioDevices = [],
    activeAudioDevice = 'earpiece',
    onSelectAudioDevice,
    onCycleAudioDevice,
    // Legacy compat
    isSpeakerphone,
    toggleSpeakerphone,
}) => {
    const { t } = useTranslation();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [timer, setTimer] = useState(0);
    const [showAudioPicker, setShowAudioPicker] = useState(false);

    const [controlsVisible, setControlsVisible] = useState(true);
    const activityTimerRef = useRef(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const pipRemoteVideoRef = useRef(null);

    const [minPosition, setMinPosition] = useState({ x: 20, y: 80 });
    const minDragRef = useRef(null);
    const isMinDragging = useRef(false);

    const [pipPosition, setPipPosition] = useState({ x: window.innerWidth - 140, y: window.innerHeight - 200 });
    const pipDragRef = useRef(null);
    const isPipDragging = useRef(false);

    // Current audio device display
    const activeDeviceMeta = getDeviceMeta(activeAudioDevice);
    const ActiveDeviceIcon = activeDeviceMeta.icon;

    // Has more than 2 devices = show picker instead of cycle
    const hasMultipleDevices = availableAudioDevices.length > 2;

    const handleAudioButtonPress = useCallback((e) => {
        e.stopPropagation();
        resetActivityTimer();
        if (hasMultipleDevices) {
            setShowAudioPicker(true);
        } else {
            // Only 2 options (earpiece + speaker) — simple toggle
            if (onCycleAudioDevice) onCycleAudioDevice();
            else if (toggleSpeakerphone) toggleSpeakerphone();
        }
    }, [hasMultipleDevices, onCycleAudioDevice, toggleSpeakerphone]);

    // ─────────────────────────────────────────────────────────────
    const resetActivityTimer = useCallback(() => {
        setControlsVisible(true);
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        if (isCallAccepted) {
            activityTimerRef.current = setTimeout(() => setControlsVisible(false), 5000);
        }
    }, [isCallAccepted]);

    useEffect(() => {
        resetActivityTimer();
        return () => { if (activityTimerRef.current) clearTimeout(activityTimerRef.current); };
    }, [resetActivityTimer]);

    useEffect(() => {
        if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
        if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
        if (pipRemoteVideoRef.current && remoteStream) pipRemoteVideoRef.current.srcObject = remoteStream;
    }, [localStream, remoteStream, callType, isCallAccepted, isMinimized, remoteCallStatus, isPipMode]);

    useEffect(() => {
        if (localStream) localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }, [isMuted, localStream]);

    useEffect(() => {
        if (localStream) localStream.getVideoTracks().forEach(track => { track.enabled = !isVideoMuted; });
    }, [isVideoMuted, localStream]);

    useEffect(() => {
        let interval;
        if (isCallAccepted && remoteCallStatus === 'active') {
            interval = setInterval(() => setTimer(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isCallAccepted, remoteCallStatus]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    let statusText = "";
    if (!isCallAccepted) {
        statusText = outgoingCallStatus === 'ringing'
            ? (t('call.ringing') || "Ringing...")
            : (t('call.calling') || "Calling...");
    }
    if (remoteCallStatus === 'busy') statusText = t('call.busy');

    // ─────────────────────────────────────────────────────────────
    // DRAG HANDLERS
    // ─────────────────────────────────────────────────────────────
    const createDragHandler = (positionState, setPositionState, dragRefElement, dragFlag) => (e) => {
        if (isPipMode) return;
        dragFlag.current = false;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const startX = clientX - positionState.x;
        const startY = clientY - positionState.y;
        const initialClickX = clientX;
        const initialClickY = clientY;

        const onDragMove = (moveEvent) => {
            const moveClientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveClientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
            if (Math.abs(moveClientX - initialClickX) > 5 || Math.abs(moveClientY - initialClickY) > 5) {
                dragFlag.current = true;
                setControlsVisible(true);
            }
            const widgetWidth = dragRefElement.current?.offsetWidth || 100;
            const widgetHeight = dragRefElement.current?.offsetHeight || 150;
            let newX = Math.max(10, Math.min(moveClientX - startX, window.innerWidth - widgetWidth - 10));
            let newY = Math.max(10, Math.min(moveClientY - startY, window.innerHeight - widgetHeight - 10));
            setPositionState({ x: newX, y: newY });
        };

        const onDragEnd = () => {
            document.removeEventListener("mousemove", onDragMove);
            document.removeEventListener("mouseup", onDragEnd);
            document.removeEventListener("touchmove", onDragMove);
            document.removeEventListener("touchend", onDragEnd);
            setTimeout(() => { dragFlag.current = false; }, 50);
        };

        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
        document.addEventListener("touchmove", onDragMove, { passive: false });
        document.addEventListener("touchend", onDragEnd);
    };

    const handleMinDragStart = createDragHandler(minPosition, setMinPosition, minDragRef, isMinDragging);
    const handlePipDragStart = createDragHandler(pipPosition, setPipPosition, pipDragRef, isPipDragging);

    const handleMaximize = (e) => {
        if (isMinDragging.current || isPipMode) { e.stopPropagation(); return; }
        setIsMinimized(false);
    };

    // ─────────────────────────────────────────────────────────────
    // NATIVE PIP MODE — bare video only, no controls
    // ─────────────────────────────────────────────────────────────
    if (isPipMode) {
        return (
            <div className="fixed inset-0 z-[1000000] bg-black flex items-center justify-center overflow-hidden">
                {callType === 'video' ? (
                    <video ref={pipRemoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-[#0b141a]">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-white/20 mb-2">
                            {peer?.profilePicture
                                ? <img src={peer.profilePicture} className="w-full h-full object-cover" />
                                : <User className="text-primary w-8 h-8" />
                            }
                        </div>
                        <p className="text-white text-xs font-semibold truncate max-w-[80px] text-center">{peer?.name}</p>
                        <p className="text-emerald-400 text-[10px] mt-1">{formatTime(timer)}</p>
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // FULL SCREEN CALL VIEW
    // ─────────────────────────────────────────────────────────────
    return (
        <>
            <div
                className={`fixed inset-0 z-[1000000] bg-[#0b141a] flex flex-col animate-in fade-in duration-300 ${isMinimized ? 'hidden' : 'flex'}`}
                onMouseMove={resetActivityTimer}
                onClick={resetActivityTimer}
                onTouchStart={resetActivityTimer}
            >
                {/* AUDIO DEVICE PICKER SHEET */}
                {showAudioPicker && (
                    <AudioDevicePicker
                        devices={availableAudioDevices}
                        activeDevice={activeAudioDevice}
                        onSelect={onSelectAudioDevice || (() => {})}
                        onClose={() => setShowAudioPicker(false)}
                    />
                )}

                {/* VIDEO UPGRADE REQUEST MODAL */}
                {videoUpgradeStatus === 'receiving_request' && (
                    <div className="absolute inset-0 z-[9999999] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                        <div className="bg-[#1f2c33] border border-white/20 shadow-2xl p-6 rounded-3xl flex flex-col items-center animate-in zoom-in-95 max-w-xs w-[90%]">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 border border-blue-500/50 animate-pulse">
                                <Video className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-white text-xl font-bold mb-1 text-center">{peer?.name}</p>
                            <p className="text-white/70 text-sm mb-8 text-center">{t('call.video_request_desc')}</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={(e) => { e.stopPropagation(); onRejectVideo(); }} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95">{t('call.decline')}</button>
                                <button onClick={(e) => { e.stopPropagation(); onAcceptVideo(); }} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95">{t('call.accept')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* INCOMING WAITING CALL POPUP */}
                {waitingCall && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999999] bg-card border border-border shadow-2xl p-4 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-10 fade-in duration-300 pointer-events-auto max-w-sm w-[90%]">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0 border border-primary/30">
                            {waitingCall.profilePicture ? <img src={waitingCall.profilePicture} className="w-full h-full object-cover" /> : <User className="text-primary w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-foreground font-bold text-[15px] truncate">{waitingCall.callerName}</p>
                            <p className="text-muted-foreground text-[12px] capitalize font-medium">{t('call.incoming_type', { type: waitingCall.callType })}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); onRejectWaitingCall(); }} className="w-10 h-10 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-95">
                                <PhoneOff className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onAcceptWaitingCall(); }} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-95">
                                {waitingCall.callType === 'video' ? <Video className="w-4 h-4 fill-current" /> : <Phone className="w-4 h-4 fill-current" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* TOP HEADER */}
                <div className={`absolute top-4 left-4 sm:top-6 sm:left-6 z-[999999] flex flex-col items-start gap-3 pointer-events-auto transition-all duration-500 ease-in-out ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMinimized(true); }}
                            className="p-2.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer bg-black/40 backdrop-blur-md border border-white/10 shadow-sm"
                        >
                            <ChevronLeft className="text-white w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 rounded-full flex items-center gap-1.5 shadow-sm">
                            <Lock className="w-3.5 h-3.5 text-white/80" />
                            <span className="text-white/90 font-medium text-[11px] sm:text-xs tracking-wide">{t('call.encrypted')}</span>
                        </div>
                    </div>
                </div>

                {/* TIMER */}
                {isCallAccepted && (
                    <div className="absolute top-5 sm:top-7 right-5 sm:right-7 z-[999999] pointer-events-none">
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                            {remoteCallStatus === 'held' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                            <span className={`text-white font-semibold text-sm tracking-widest ${remoteCallStatus === 'held' ? 'opacity-70' : ''}`}>{formatTime(timer)}</span>
                        </div>
                    </div>
                )}

                {/* REMOTE ON HOLD */}
                {remoteCallStatus === 'held' && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                            <Phone className="text-amber-500 w-10 h-10" />
                        </div>
                        <h2 className="text-white text-2xl font-bold mb-2 text-center px-4">{t('call.on_hold_title', { name: peer?.name })}</h2>
                        <p className="text-white/60 text-sm">{t('call.on_hold_desc')}</p>
                    </div>
                )}

                {/* MAIN VIDEO / AUDIO AREA */}
                {callType === 'video' ? (
                    <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
                        {isCallAccepted ? (
                            <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover transition-opacity duration-500 ${remoteCallStatus === 'held' ? 'opacity-0' : 'opacity-100'}`} />
                        ) : (
                            <div className="flex flex-col items-center justify-center z-10 absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none">
                                <div className="w-32 h-32 rounded-full bg-primary/20 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl mb-6 animate-pulse">
                                    {peer?.profilePicture ? <img src={peer.profilePicture} className="w-full h-full object-cover" /> : <User className="text-primary w-16 h-16" />}
                                </div>
                                <h2 className="text-white text-3xl font-bold mb-2">{peer?.name || t('call.unknown')}</h2>
                                <p className="text-white/70 text-lg tracking-wide">{statusText}</p>
                            </div>
                        )}

                        {/* DRAGGABLE LOCAL VIDEO */}
                        <div
                            ref={pipDragRef}
                            onMouseDown={handlePipDragStart}
                            onTouchStart={handlePipDragStart}
                            style={{ left: `${pipPosition.x}px`, top: `${pipPosition.y}px` }}
                            className={`absolute w-28 h-40 md:w-36 md:h-48 rounded-xl border-2 border-white/20 shadow-2xl bg-black overflow-hidden z-40 cursor-move touch-none ${!isCallAccepted ? 'hidden' : ''} ${remoteCallStatus === 'held' ? 'opacity-50 blur-sm' : 'opacity-100'}`}
                        >
                            {isVideoMuted ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 pointer-events-none"><VideoOff className="w-8 h-8 text-white/50" /></div>
                            ) : (
                                <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover pointer-events-none ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} />
                            )}
                            {isCallAccepted && !isVideoMuted && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onFlipCamera(); }}
                                    className={`absolute bottom-2 left-2 p-2 bg-black/50 active:bg-black/80 rounded-full text-white backdrop-blur-md z-50 shadow-md transition-all duration-300 cursor-pointer ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                                >
                                    <SwitchCamera size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-20 pointer-events-none z-10 relative">
                        <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full bg-primary/10 border-2 border-white/5 flex items-center justify-center overflow-hidden shadow-2xl mb-6 ${!isCallAccepted || remoteCallStatus === 'held' ? 'animate-pulse' : ''}`}>
                            {peer?.profilePicture ? <img src={peer.profilePicture} className="w-full h-full object-cover" /> : <User className="text-primary w-20 h-20" />}
                        </div>
                        <h2 className="text-white text-3xl font-bold mb-2">{peer?.name || t('call.unknown')}</h2>
                        {!isCallAccepted && <p className="text-white/70 text-lg tracking-wide">{statusText}</p>}
                        {isCallAccepted && remoteCallStatus === 'active' && <p className="text-emerald-400 font-medium">{t('call.in_call')}</p>}
                        <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                        <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                    </div>
                )}

                {/* BOTTOM CONTROL BAR */}
                <div className={`absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center justify-end z-50 pointer-events-none transition-all duration-500 ease-in-out ${controlsVisible ? 'opacity-100 translate-y-0 h-48 md:h-56' : 'opacity-0 translate-y-full h-0'}`}>
                    <div className="flex items-end justify-center gap-4 md:gap-6 px-4 pb-8 pointer-events-auto">

                        {/* Video toggle or upgrade */}
                        {callType === 'video' ? (
                            <div className="flex flex-col items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setIsVideoMuted(!isVideoMuted); resetActivityTimer(); }} className={`p-4 rounded-full transition-all shadow-lg ${isVideoMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                                    {isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}
                                </button>
                                <span className="text-white/40 text-[9px] font-medium uppercase tracking-wider">{isVideoMuted ? 'Cam Off' : 'Camera'}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onRequestVideo(); resetActivityTimer(); }} disabled={videoUpgradeStatus === 'requesting'} className={`p-4 rounded-full transition-all shadow-lg ${videoUpgradeStatus === 'requesting' ? 'bg-white/5 text-white/30 cursor-wait' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                                    <Video size={22} />
                                </button>
                                <span className="text-white/40 text-[9px] font-medium uppercase tracking-wider">Video</span>
                            </div>
                        )}

                        {/* 🔧 AUDIO DEVICE BUTTON — shows current device icon, opens picker if 3+ devices */}
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={handleAudioButtonPress}
                                className={`p-4 rounded-full transition-all shadow-lg relative ${
                                    activeAudioDevice === 'speaker'
                                        ? 'bg-white text-black'
                                        : activeAudioDevice === 'wired_headset' || activeAudioDevice === 'bluetooth'
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                                }`}
                                title={`Audio: ${activeDeviceMeta.label}`}
                            >
                                <ActiveDeviceIcon
                                    size={22}
                                    className={
                                        activeAudioDevice === 'speaker' ? 'text-black' :
                                        activeAudioDevice === 'wired_headset' ? 'text-emerald-400' :
                                        activeAudioDevice === 'bluetooth' ? 'text-blue-400' :
                                        'text-white'
                                    }
                                />
                                {/* Dot indicator when non-default device active */}
                                {(activeAudioDevice === 'wired_headset' || activeAudioDevice === 'bluetooth') && (
                                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 border border-[#0b141a]" />
                                )}
                            </button>
                            <span className="text-white/40 text-[9px] font-medium uppercase tracking-wider">
                                {activeDeviceMeta.label}
                            </span>
                        </div>

                        {/* HANGUP */}
                        <button onClick={(e) => { e.stopPropagation(); onHangup(); }} className="p-5 md:p-6 bg-rose-500 hover:bg-rose-600 rounded-full text-white transition-transform active:scale-90 shadow-xl border border-rose-400 mx-1">
                            <PhoneOff size={28} fill="currentColor" />
                        </button>

                        {/* MUTE */}
                        <div className="flex flex-col items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); resetActivityTimer(); }} className={`p-4 rounded-full transition-all shadow-lg ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>
                            <span className="text-white/40 text-[9px] font-medium uppercase tracking-wider">{isMuted ? 'Muted' : 'Mute'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                MINIMIZED WIDGET
            ───────────────────────────────────────────────────────────── */}
            {isMinimized && !isPipMode && (
                <div
                    ref={minDragRef}
                    onMouseDown={handleMinDragStart}
                    onTouchStart={handleMinDragStart}
                    style={{ left: `${minPosition.x}px`, top: `${minPosition.y}px` }}
                    className="fixed z-[1000000] w-36 bg-[#1f2c33]/95 backdrop-blur-md shadow-2xl rounded-2xl p-2 border border-white/10 cursor-move animate-in zoom-in-95 flex flex-col gap-2 touch-none"
                >
                    <div onClick={handleMaximize} className="w-full aspect-[3/4] bg-black rounded-xl overflow-hidden relative cursor-pointer border border-white/5 flex items-center justify-center">
                        {callType === 'video' && isCallAccepted && remoteCallStatus === 'active' ? (
                            <video ref={pipRemoteVideoRef} autoPlay playsInline className="w-full h-full object-cover pointer-events-none" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 pointer-events-none">
                                {peer?.profilePicture ? (
                                    <img src={peer.profilePicture} className={`w-full h-full object-cover opacity-80 ${remoteCallStatus === 'held' ? 'blur-sm' : ''}`} />
                                ) : (
                                    <User className="text-white/50 w-12 h-12" />
                                )}
                                {remoteCallStatus === 'held' && (
                                    <span className="absolute text-amber-500 font-bold text-xs bg-black/60 px-2 py-1 rounded">
                                        {t('call.on_hold_badge')}
                                    </span>
                                )}
                            </div>
                        )}
                        {isCallAccepted && remoteCallStatus === 'active' ? (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white shadow-sm whitespace-nowrap pointer-events-none">
                                {formatTime(timer)}
                            </div>
                        ) : (
                            <span className="absolute bottom-2 bg-black/50 px-2 py-0.5 rounded-full text-[10px] text-white font-medium tracking-wide whitespace-nowrap pointer-events-none">
                                {statusText}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-2 pointer-events-auto pb-1">
                        {callType === 'video' && (
                            <button onClick={(e) => { e.stopPropagation(); setIsVideoMuted(!isVideoMuted); }} className={`p-2.5 rounded-full transition-colors ${isVideoMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                                {isVideoMuted ? <VideoOff size={14} /> : <Video size={14} />}
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className={`p-2.5 rounded-full transition-colors ${isMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onHangup(); }} className="p-2.5 bg-rose-500 hover:bg-rose-600 rounded-full transition-colors shadow-sm">
                            <PhoneOff size={14} className="text-white" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default CallOverlay;