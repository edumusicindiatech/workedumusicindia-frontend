import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    Mic, MicOff, Volume2, VolumeX, PhoneOff,
    Maximize2, ChevronLeft, User, Video, VideoOff, Lock, SwitchCamera, PhoneIncoming, Phone
} from "lucide-react";

const CallOverlay = ({
    peer, onHangup, isMinimized, setIsMinimized, localStream, remoteStream,
    isCallAccepted, isOnline, callType, onRequestVideo, onAcceptVideo,
    onRejectVideo, videoUpgradeStatus, onFlipCamera, facingMode,
    remoteCallStatus, outgoingCallStatus, waitingCall, onAcceptWaitingCall, onRejectWaitingCall
}) => {
    const { t } = useTranslation();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isLoudspeaker, setIsLoudspeaker] = useState(false);
    const [timer, setTimer] = useState(0);

    // Auto-Hide Controls State
    const [controlsVisible, setControlsVisible] = useState(true);
    const activityTimerRef = useRef(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const minimizedRemoteVideoRef = useRef(null);

    // Minimized Widget Drag State
    const [minPosition, setMinPosition] = useState({ x: 20, y: 80 });
    const minDragRef = useRef(null);
    const isMinDragging = useRef(false);

    // Local Video (PiP) Drag State
    const [pipPosition, setPipPosition] = useState({ x: window.innerWidth - 140, y: window.innerHeight - 200 });
    const pipDragRef = useRef(null);
    const isPipDragging = useRef(false);

    // --- ACTIVITY MONITOR FOR AUTO-HIDE ---
    const resetActivityTimer = useCallback(() => {
        setControlsVisible(true);
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        if (isCallAccepted) {
            activityTimerRef.current = setTimeout(() => {
                setControlsVisible(false);
            }, 5000);
        }
    }, [isCallAccepted]);

    useEffect(() => {
        resetActivityTimer();
        return () => { if (activityTimerRef.current) clearTimeout(activityTimerRef.current); };
    }, [resetActivityTimer]);

    useEffect(() => {
        const assignStreams = () => {
            if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
            if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
            if (minimizedRemoteVideoRef.current && remoteStream) minimizedRemoteVideoRef.current.srcObject = remoteStream;
        };
        assignStreams();
    }, [localStream, remoteStream, callType, isCallAccepted, isMinimized, remoteCallStatus]);

    useEffect(() => {
        if (localStream) localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }, [isMuted, localStream]);

    useEffect(() => {
        if (localStream) localStream.getVideoTracks().forEach(track => { track.enabled = !isVideoMuted; });
    }, [isVideoMuted, localStream]);

    useEffect(() => {
        let interval;
        if (isCallAccepted && remoteCallStatus === 'active') {
            interval = setInterval(() => { setTimer((prev) => prev + 1); }, 1000);
        }
        return () => clearInterval(interval);
    }, [isCallAccepted, remoteCallStatus]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 🚀 UPDATED: WhatsApp style Calling vs Ringing logic
    let statusText = "";
    if (!isCallAccepted) {
        if (outgoingCallStatus === 'ringing') {
            statusText = t('call.ringing') || "Ringing...";
        } else {
            statusText = t('call.calling') || "Calling...";
        }
    }

    if (remoteCallStatus === 'busy') statusText = t('call.busy');

    // --- GENERIC DRAG HANDLER FOR PIP AND MINIMIZED WIDGET ---
    const createDragHandler = (positionState, setPositionState, dragRefElement, dragFlag) => (e) => {
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
                setControlsVisible(true); // Keep controls visible while dragging
            }

            const widgetWidth = dragRefElement.current?.offsetWidth || 100;
            const widgetHeight = dragRefElement.current?.offsetHeight || 150;

            let newX = moveClientX - startX;
            let newY = moveClientY - startY;

            if (newX < 10) newX = 10;
            if (newY < 10) newY = 10;
            if (newX + widgetWidth > window.innerWidth - 10) newX = window.innerWidth - widgetWidth - 10;
            if (newY + widgetHeight > window.innerHeight - 10) newY = window.innerHeight - widgetHeight - 10;

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
        if (isMinDragging.current) { e.stopPropagation(); return; }
        setIsMinimized(false);
    };

    return (
        <>
            <div
                className={`fixed inset-0 z-1000000 bg-[#0b141a] flex flex-col animate-in fade-in duration-300 ${isMinimized ? 'hidden' : 'flex'}`}
                onMouseMove={resetActivityTimer}
                onClick={resetActivityTimer}
                onTouchStart={resetActivityTimer}
            >

                {/* VIDEO UPGRADE REQUEST MODAL */}
                {videoUpgradeStatus === 'receiving_request' && (
                    <div className="absolute inset-0 z-9999999 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
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
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-9999999 bg-card border border-border shadow-2xl p-4 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-10 fade-in duration-300 pointer-events-auto max-w-sm w-[90%]">
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

                {/* TOP HEADER TAGS (AUTO-HIDES) */}
                <div className={`absolute top-4 left-4 sm:top-6 sm:left-6 z-999999 flex flex-col items-start gap-3 pointer-events-auto transition-all duration-500 ease-in-out ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMinimized(true); }}
                            className="p-2.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer bg-black/40 backdrop-blur-md border border-white/10 shadow-sm"
                            title={t('call.minimize_title')}
                        >
                            <ChevronLeft className="text-white w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 rounded-full flex items-center gap-1.5 shadow-sm">
                            <Lock className="w-3.5 h-3.5 text-white/80" />
                            <span className="text-white/90 font-medium text-[11px] sm:text-xs tracking-wide">{t('call.encrypted')}</span>
                        </div>
                    </div>
                </div>

                {/* TIMER OVERLAY (ALWAYS VISIBLE) */}
                {isCallAccepted && (
                    <div className="absolute top-5 sm:top-7 right-5 sm:right-7 z-999999 pointer-events-none">
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                            {remoteCallStatus === 'held' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                            <span className={`text-white font-semibold text-sm tracking-widest ${remoteCallStatus === 'held' ? 'opacity-70' : ''}`}>{formatTime(timer)}</span>
                        </div>
                    </div>
                )}

                {/* REMOTE ON HOLD OVERLAY */}
                {remoteCallStatus === 'held' && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                            <Phone className="text-amber-500 w-10 h-10" />
                        </div>
                        <h2 className="text-white text-2xl font-bold mb-2 text-center px-4">{t('call.on_hold_title', { name: peer?.name })}</h2>
                        <p className="text-white/60 text-sm">{t('call.on_hold_desc')}</p>
                    </div>
                )}

                {/* MAIN VIDEO AREA */}
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

                        {/* DRAGGABLE LOCAL VIDEO (PiP) */}
                        <div
                            ref={pipDragRef}
                            onMouseDown={handlePipDragStart}
                            onTouchStart={handlePipDragStart}
                            style={{
                                left: `${pipPosition.x}px`,
                                top: `${pipPosition.y}px`,
                                transition: isPipDragging.current ? 'none' : 'opacity 0.3s ease'
                            }}
                            className={`absolute w-28 h-40 md:w-36 md:h-48 rounded-xl border-2 border-white/20 shadow-2xl bg-black overflow-hidden z-40 cursor-move touch-none ${!isCallAccepted ? 'hidden' : ''} ${remoteCallStatus === 'held' ? 'opacity-50 blur-sm' : 'opacity-100'}`}
                        >
                            {isVideoMuted ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 pointer-events-none"><VideoOff className="w-8 h-8 text-white/50" /></div>
                            ) : (
                                <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover pointer-events-none ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} />
                            )}

                            {/* FLIP CAMERA BUTTON */}
                            {isCallAccepted && !isVideoMuted && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onFlipCamera(); }}
                                    className={`absolute bottom-2 left-2 p-2 bg-black/50 active:bg-black/80 rounded-full text-white backdrop-blur-md z-50 shadow-md transition-all duration-300 cursor-pointer ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                                    title={t('call.flip_camera')}
                                >
                                    <SwitchCamera size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    // MAIN VOICE AREA
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

                {/* BOTTOM CONTROL BAR (AUTO-HIDES) */}
                <div className={`absolute bottom-0 left-0 w-full bg-linear-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center justify-end z-50 pointer-events-none transition-all duration-500 ease-in-out ${controlsVisible ? 'opacity-100 translate-y-0 h-40 md:h-48' : 'opacity-0 translate-y-full h-0'}`}>

                    <div className="flex items-center justify-center gap-4 md:gap-8 px-4 pb-8 pointer-events-auto">
                        {callType === 'video' ? (
                            <button onClick={(e) => { e.stopPropagation(); setIsVideoMuted(!isVideoMuted); resetActivityTimer(); }} className={`p-4 rounded-full transition-all shadow-lg ${isVideoMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                                {isVideoMuted ? <VideoOff size={24} /> : <Video size={24} />}
                            </button>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); onRequestVideo(); resetActivityTimer(); }} disabled={videoUpgradeStatus === 'requesting'} className={`p-4 rounded-full transition-all shadow-lg ${videoUpgradeStatus === 'requesting' ? 'bg-white/5 text-white/30 cursor-wait' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`} title={t('call.request_video')}>
                                <Video size={24} />
                            </button>
                        )}

                        <button onClick={(e) => { e.stopPropagation(); setIsLoudspeaker(!isLoudspeaker); resetActivityTimer(); }} className={`p-4 rounded-full transition-all shadow-lg hidden sm:block ${isLoudspeaker ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                            <Volume2 size={24} />
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); onHangup(); }} className="p-5 md:p-6 bg-rose-500 hover:bg-rose-600 rounded-full text-white transition-transform active:scale-90 shadow-xl border border-rose-400 mx-2">
                            <PhoneOff size={28} fill="currentColor" />
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); resetActivityTimer(); }} className={`p-4 rounded-full transition-all shadow-lg ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* WHATSAPP STYLE MINIMIZED VIEW */}
            {isMinimized && (
                <div
                    ref={minDragRef}
                    onMouseDown={handleMinDragStart}
                    onTouchStart={handleMinDragStart}
                    style={{ left: `${minPosition.x}px`, top: `${minPosition.y}px` }}
                    className="fixed z-1000000 w-36 bg-[#1f2c33]/95 backdrop-blur-md shadow-2xl rounded-2xl p-2 border border-white/10 cursor-move animate-in zoom-in-95 flex flex-col gap-2 touch-none"
                >
                    <div onClick={handleMaximize} className="w-full aspect-3/4 bg-black rounded-xl overflow-hidden relative cursor-pointer border border-white/5 flex items-center justify-center">
                        {callType === 'video' && isCallAccepted && remoteCallStatus === 'active' ? (
                            <video ref={minimizedRemoteVideoRef} autoPlay playsInline className="w-full h-full object-cover pointer-events-none" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 pointer-events-none">
                                {peer?.profilePicture ? (
                                    <img src={peer.profilePicture} className={`w-full h-full object-cover opacity-80 ${remoteCallStatus === 'held' ? 'blur-sm' : ''}`} />
                                ) : (
                                    <User className="text-white/50 w-12 h-12" />
                                )}
                                {remoteCallStatus === 'held' && <span className="absolute text-amber-500 font-bold text-xs bg-black/60 px-2 py-1 rounded">{t('call.on_hold_badge')}</span>}
                            </div>
                        )}

                        {isCallAccepted && remoteCallStatus === 'active' ? (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white shadow-sm whitespace-nowrap pointer-events-none">
                                {formatTime(timer)}
                            </div>
                        ) : (
                            <span className="absolute bottom-2 bg-black/50 px-2 py-0.5 rounded-full text-[10px] text-white font-medium tracking-wide whitespace-nowrap pointer-events-none">{statusText}</span>
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