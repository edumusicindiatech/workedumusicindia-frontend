import React, { useState, useEffect, useRef } from "react";
import {
    Mic, MicOff, Volume2, VolumeX, PhoneOff,
    Maximize2, ChevronLeft, User, Video, VideoOff, Lock, SwitchCamera
} from "lucide-react";

const CallOverlay = ({ 
    peer, onHangup, isMinimized, setIsMinimized, localStream, remoteStream, 
    isCallAccepted, isOnline, callType, onRequestVideo, onAcceptVideo, 
    onRejectVideo, videoUpgradeStatus, onFlipCamera, facingMode
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isLoudspeaker, setIsLoudspeaker] = useState(false);
    const [timer, setTimer] = useState(0);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const minimizedRemoteVideoRef = useRef(null);

    const [position, setPosition] = useState({ x: 20, y: 80 });
    const dragRef = useRef(null);
    const isDragging = useRef(false);

    useEffect(() => {
        const assignStreams = () => {
            if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
            if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
            if (minimizedRemoteVideoRef.current && remoteStream) minimizedRemoteVideoRef.current.srcObject = remoteStream;
        };
        assignStreams();
    }, [localStream, remoteStream, callType, isCallAccepted, isMinimized]);

    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
        }
    }, [isMuted, localStream]);

    useEffect(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoMuted;
            });
        }
    }, [isVideoMuted, localStream]);

    useEffect(() => {
        let interval;
        if (isCallAccepted) {
            interval = setInterval(() => { setTimer((prev) => prev + 1); }, 1000);
        }
        return () => clearInterval(interval);
    }, [isCallAccepted]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const statusText = isCallAccepted ? "" : (isOnline ? "Ringing..." : "Calling...");

    // FIX: Combined Mouse & Touch Drag Logic with screen boundaries
    const handleDragStart = (e) => {
        isDragging.current = false;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const startX = clientX - position.x;
        const startY = clientY - position.y;
        const initialClickX = clientX;
        const initialClickY = clientY;

        const onDragMove = (moveEvent) => {
            const moveClientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveClientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

            if (Math.abs(moveClientX - initialClickX) > 5 || Math.abs(moveClientY - initialClickY) > 5) {
                isDragging.current = true;
            }

            // Boundary logic to prevent dragging off-screen
            const widgetWidth = dragRef.current?.offsetWidth || 144;
            const widgetHeight = dragRef.current?.offsetHeight || 200;

            let newX = moveClientX - startX;
            let newY = moveClientY - startY;

            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + widgetWidth > window.innerWidth) newX = window.innerWidth - widgetWidth;
            if (newY + widgetHeight > window.innerHeight) newY = window.innerHeight - widgetHeight;

            setPosition({ x: newX, y: newY });
        };

        const onDragEnd = () => {
            document.removeEventListener("mousemove", onDragMove);
            document.removeEventListener("mouseup", onDragEnd);
            document.removeEventListener("touchmove", onDragMove);
            document.removeEventListener("touchend", onDragEnd);
            setTimeout(() => { isDragging.current = false; }, 50);
        };

        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
        document.addEventListener("touchmove", onDragMove, { passive: false });
        document.addEventListener("touchend", onDragEnd);
    };

    const handleMaximize = (e) => {
        if (isDragging.current) { e.stopPropagation(); return; }
        setIsMinimized(false);
    };

    return (
        <>
            <div className={`fixed inset-0 z-1000000 bg-[#0b141a] flex flex-col animate-in fade-in duration-300 ${isMinimized ? 'hidden' : 'flex'}`}>
                
                {videoUpgradeStatus === 'receiving_request' && (
                    <div className="absolute inset-0 z-9999999 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                        <div className="bg-[#1f2c33] border border-white/20 shadow-2xl p-6 rounded-3xl flex flex-col items-center animate-in zoom-in-95 max-w-xs w-[90%]">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 border border-blue-500/50 animate-pulse">
                                <Video className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-white text-xl font-bold mb-1 text-center">{peer?.name}</p>
                            <p className="text-white/70 text-sm mb-8 text-center">is requesting to switch to a video call.</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={(e) => { e.stopPropagation(); onRejectVideo(); }} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95">Decline</button>
                                <button onClick={(e) => { e.stopPropagation(); onAcceptVideo(); }} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95">Accept</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-999999 flex flex-col items-start gap-3 pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMinimized(true); }} 
                            className="p-2.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer bg-black/40 backdrop-blur-md border border-white/10 shadow-sm"
                            title="Minimize Call"
                        >
                            <ChevronLeft className="text-white w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 rounded-full flex items-center gap-1.5 shadow-sm">
                            <Lock className="w-3.5 h-3.5 text-white/80" />
                            <span className="text-white/90 font-medium text-[11px] sm:text-xs tracking-wide">End-to-end encrypted</span>
                        </div>
                    </div>
                    {isCallAccepted && (
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full ml-12">
                            <span className="text-white font-semibold text-sm tracking-widest">{formatTime(timer)}</span>
                        </div>
                    )}
                </div>

                {callType === 'video' ? (
                    <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                        {isCallAccepted ? (
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center z-10 absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none">
                                <div className="w-32 h-32 rounded-full bg-primary/20 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl mb-6 animate-pulse">
                                    {peer?.profilePicture ? <img src={peer.profilePicture} className="w-full h-full object-cover" /> : <User className="text-primary w-16 h-16" />}
                                </div>
                                <h2 className="text-white text-3xl font-bold mb-2">{peer?.name || "Unknown"}</h2>
                                <p className="text-white/70 text-lg tracking-wide">{statusText}</p>
                            </div>
                        )}
                        <div className={`absolute transition-all duration-500 ${isCallAccepted ? 'bottom-40 right-6 w-28 h-40 md:w-36 md:h-48 rounded-xl border-2 border-white/20 shadow-2xl bg-black overflow-hidden z-20' : 'inset-0 w-full h-full opacity-50 bg-black z-20 pointer-events-none'}`}>
                            {isVideoMuted ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900"><VideoOff className="w-8 h-8 text-white/50" /></div>
                            ) : (
                                <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} />
                            )}

                            {/* FIX: FLIP CAMERA BUTTON - Removed hover hide, added z-50 to ensure clickability */}
                            {isCallAccepted && !isVideoMuted && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onFlipCamera(); }} 
                                    className="absolute bottom-2 left-2 p-2 bg-black/50 active:bg-black/80 rounded-full text-white backdrop-blur-md z-50 shadow-md transition-colors cursor-pointer"
                                    title="Flip Camera"
                                >
                                    <SwitchCamera size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-20 pointer-events-none z-10 relative">
                        <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full bg-primary/10 border-2 border-white/5 flex items-center justify-center overflow-hidden shadow-2xl mb-6 ${!isCallAccepted ? 'animate-pulse' : ''}`}>
                            {peer?.profilePicture ? <img src={peer.profilePicture} className="w-full h-full object-cover" /> : <User className="text-primary w-20 h-20" />}
                        </div>
                        <h2 className="text-white text-3xl font-bold mb-2">{peer?.name || "Unknown"}</h2>
                        {!isCallAccepted && <p className="text-white/70 text-lg tracking-wide">{statusText}</p>}
                        
                        <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                        <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                    </div>
                )}

                <div className="absolute bottom-0 left-0 w-full h-32 md:h-40 bg-linear-to-t from-black/80 to-transparent flex items-center justify-center gap-4 md:gap-8 px-4 z-50 pointer-events-auto pb-4">
                    
                    {callType === 'video' ? (
                        <button onClick={() => setIsVideoMuted(!isVideoMuted)} className={`p-4 rounded-full transition-all shadow-lg ${isVideoMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                            {isVideoMuted ? <VideoOff size={24} /> : <Video size={24} />}
                        </button>
                    ) : (
                        <button onClick={onRequestVideo} disabled={videoUpgradeStatus === 'requesting'} className={`p-4 rounded-full transition-all shadow-lg ${videoUpgradeStatus === 'requesting' ? 'bg-white/5 text-white/30 cursor-wait' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`} title="Request Video Upgrade">
                            <Video size={24} />
                        </button>
                    )}

                    <button onClick={() => setIsLoudspeaker(!isLoudspeaker)} className={`p-4 rounded-full transition-all shadow-lg hidden sm:block ${isLoudspeaker ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                        <Volume2 size={24} />
                    </button>
                    
                    <button onClick={onHangup} className="p-5 md:p-6 bg-rose-500 hover:bg-rose-600 rounded-full text-white transition-transform active:scale-90 shadow-xl border border-rose-400 mx-2">
                        <PhoneOff size={28} fill="currentColor" />
                    </button>
                    
                    <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-all shadow-lg ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>
                </div>
            </div>

            {/* WHATSAPP STYLE MINIMIZED VIEW */}
            {isMinimized && (
                <div 
                    ref={dragRef} 
                    onMouseDown={handleDragStart} 
                    onTouchStart={handleDragStart} 
                    style={{ left: `${position.x}px`, top: `${position.y}px` }} 
                    className="fixed z-1000000 w-36 bg-[#1f2c33]/95 backdrop-blur-md shadow-2xl rounded-2xl p-2 border border-white/10 cursor-move animate-in zoom-in-95 flex flex-col gap-2 touch-none"
                >
                    
                    {/* Maximize Area (Video or Image) */}
                    <div onClick={handleMaximize} className="w-full aspect-3/4 bg-black rounded-xl overflow-hidden relative cursor-pointer border border-white/5 flex items-center justify-center">
                        {callType === 'video' && isCallAccepted ? (
                            <video ref={minimizedRemoteVideoRef} autoPlay playsInline className="w-full h-full object-cover pointer-events-none" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800 pointer-events-none">
                                {peer?.profilePicture ? (
                                    <img src={peer.profilePicture} className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <User className="text-white/50 w-12 h-12" />
                                )}
                            </div>
                        )}

                        {/* Status / Timer Overlay */}
                        {isCallAccepted ? (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white shadow-sm whitespace-nowrap pointer-events-none">
                                {formatTime(timer)}
                            </div>
                        ) : (
                            <span className="absolute bottom-2 bg-black/50 px-2 py-0.5 rounded-full text-[10px] text-white font-medium tracking-wide whitespace-nowrap pointer-events-none">{statusText}</span>
                        )}
                    </div>

                    {/* Minimized Controls */}
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