import React, { useState, useEffect, useRef } from "react";
import {
    Mic, MicOff, Volume2, VolumeX, PhoneOff,
    Maximize2, ChevronLeft, User, Monitor, Video, VideoOff, Lock
} from "lucide-react";

const CallOverlay = ({ 
    peer, onHangup, isMinimized, setIsMinimized, localStream, remoteStream, 
    isCallAccepted, isOnline, isScreenSharing, onToggleScreenShare, callType,
    onRequestVideo, onAcceptVideo, onRejectVideo, videoUpgradeStatus
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isLoudspeaker, setIsLoudspeaker] = useState(false);
    const [timer, setTimer] = useState(0);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [position, setPosition] = useState({ x: 20, y: 80 });
    const dragRef = useRef(null);
    const isDragging = useRef(false);

    useEffect(() => {
        if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
    }, [localStream, callType]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    }, [remoteStream, callType]);

    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
        }
    }, [isMuted, localStream]);

    // FIX APPLIED HERE: Protect screen sharing track from being muted
    useEffect(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                if (isScreenSharing) {
                    track.enabled = true; // Force on for screen share
                } else {
                    track.enabled = !isVideoMuted;
                }
            });
        }
    }, [isVideoMuted, localStream, isScreenSharing]);

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

    const statusText = isCallAccepted ? formatTime(timer) : (isOnline ? "Ringing..." : "Calling...");

    const handleMouseDown = (e) => {
        isDragging.current = false;
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;
        const initialClickX = e.clientX;
        const initialClickY = e.clientY;

        const onMouseMove = (moveEvent) => {
            if (Math.abs(moveEvent.clientX - initialClickX) > 5 || Math.abs(moveEvent.clientY - initialClickY) > 5) {
                isDragging.current = true;
            }
            setPosition({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            setTimeout(() => { isDragging.current = false; }, 50);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const handleMaximize = (e) => {
        if (isDragging.current) { e.stopPropagation(); return; }
        setIsMinimized(false);
    };

    return (
        <>
            <div className={`fixed inset-0 z-1000000 bg-[#0b141a] flex flex-col animate-in fade-in duration-300 ${isMinimized ? 'hidden' : 'flex'}`}>
                
                {/* --- REDESIGNED VIDEO UPGRADE REQUEST MODAL --- */}
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

                {/* --- TOP LEFT CONTROLS (BACK & ENCRYPTION) --- */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-999999 flex items-center gap-3 pointer-events-auto">
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
                                <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isScreenSharing ? '' : 'transform scale-x-[-1]'}`} />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-20 pointer-events-none z-10 relative">
                        <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full bg-primary/10 border-2 border-white/5 flex items-center justify-center overflow-hidden shadow-2xl mb-6 ${!isCallAccepted ? 'animate-pulse' : ''}`}>
                            {peer?.profilePicture ? <img src={peer.profilePicture} className="w-full h-full object-cover" /> : <User className="text-primary w-20 h-20" />}
                        </div>
                        <h2 className="text-white text-3xl font-bold mb-2">{peer?.name || "Unknown"}</h2>
                        <p className="text-white/70 text-lg tracking-wide">{statusText}</p>
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

                    <button onClick={onToggleScreenShare} className={`p-4 rounded-full transition-all shadow-lg ${isScreenSharing ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`}>
                        <Monitor size={24} />
                    </button>
                    
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

            {isMinimized && (
                <div ref={dragRef} onMouseDown={handleMouseDown} style={{ left: `${position.x}px`, top: `${position.y}px` }} className="fixed z-1000000 w-48 bg-[#1f2c33]/90 backdrop-blur-md shadow-2xl rounded-2xl p-3 border border-white/10 cursor-move animate-in zoom-in-95">
                    <div className="flex flex-col items-center gap-2" onClick={(e) => { if (e.target === e.currentTarget) handleMaximize(e); }}>
                        <div onClick={handleMaximize} className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden mb-1 cursor-pointer hover:opacity-80 border border-white/10">
                            {peer?.profilePicture ? <img src={peer.profilePicture} className="w-full h-full object-cover" /> : <User className="text-primary w-6 h-6" />}
                        </div>
                        <span className="text-white text-xs font-medium pointer-events-none tracking-wide">{statusText}</span>

                        <div className="flex items-center gap-3 mt-1 pointer-events-auto">
                            {callType === 'video' && (
                                <button onClick={(e) => { e.stopPropagation(); setIsVideoMuted(!isVideoMuted); }} className={`p-2 rounded-full transition-colors ${isVideoMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                                    {isVideoMuted ? <VideoOff size={14} /> : <Video size={14} />}
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onHangup(); }} className="p-2 bg-rose-500 hover:bg-rose-600 rounded-full transition-colors shadow-sm">
                                <PhoneOff size={14} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CallOverlay;