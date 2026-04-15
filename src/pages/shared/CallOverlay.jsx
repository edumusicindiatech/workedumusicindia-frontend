import React, { useState, useEffect, useRef } from "react";
import {
    Mic, MicOff, Volume2, VolumeX, PhoneOff,
    Maximize2, ChevronLeft, User
} from "lucide-react";

const CallOverlay = ({ peer, onHangup, isMinimized, setIsMinimized, localStream, isCallAccepted, isOnline }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isLoudspeaker, setIsLoudspeaker] = useState(false);
    const [timer, setTimer] = useState(0);

    // Draggable state for minimized view
    const [position, setPosition] = useState({ x: 20, y: 80 });
    const dragRef = useRef(null);
    const isDragging = useRef(false);

    // --- MUTE LOGIC ---
    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
        }
    }, [isMuted, localStream]);

    // --- CALL TIMER LOGIC (ONLY RUNS WHEN ACCEPTED) ---
    useEffect(() => {
        let interval;
        if (isCallAccepted) {
            interval = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isCallAccepted]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Status logic (Ringing vs Timer)
    const statusText = isCallAccepted
        ? formatTime(timer)
        : (isOnline ? "Ringing..." : "Calling...");

    // --- DRAG VS CLICK LOGIC ---
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
            setPosition({
                x: moveEvent.clientX - startX,
                y: moveEvent.clientY - startY
            });
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
        if (isDragging.current) {
            e.stopPropagation();
            return;
        }
        setIsMinimized(false);
    };

    if (isMinimized) {
        return (
            <div
                ref={dragRef}
                onMouseDown={handleMouseDown}
                style={{ left: `${position.x}px`, top: `${position.y}px` }}
                className="fixed z-1000000 w-48 bg-[#1f2c33] shadow-2xl rounded-2xl p-3 border border-white/10 cursor-move animate-in zoom-in-95"
            >
                <div className="flex flex-col items-center gap-2" onClick={(e) => {
                    if (e.target === e.currentTarget) handleMaximize(e);
                }}>
                    <div onClick={handleMaximize} className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden mb-1 cursor-pointer hover:opacity-80">
                        {peer?.profilePicture ? (
                            <img src={peer.profilePicture} className="w-full h-full object-cover" />
                        ) : <User className="text-primary w-6 h-6" />}
                    </div>
                    <span className="text-white text-xs font-medium pointer-events-none tracking-wide">{statusText}</span>

                    <div className="flex items-center gap-3 mt-1">
                        <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-rose-500' : 'bg-white/10 hover:bg-white/20'}`}>
                            {isMuted ? <MicOff size={14} className="text-white" /> : <Mic size={14} className="text-white" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onHangup(); }} className="p-2 bg-rose-500 hover:bg-rose-600 rounded-full transition-colors">
                            <PhoneOff size={14} className="text-white" />
                        </button>
                        <button onClick={handleMaximize} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                            <Maximize2 size={14} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-1000000 bg-[#0b141a] flex flex-col animate-in fade-in duration-300">
            <div className="p-6 flex items-center relative z-50">
                <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                    <ChevronLeft className="text-white w-8 h-8" />
                </button>
                <div className="ml-4 flex items-center gap-2">
                    <span className="text-white/60 text-sm pointer-events-none">End-to-end encrypted</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center -mt-20 pointer-events-none">
                <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full bg-primary/10 border-2 border-white/5 flex items-center justify-center overflow-hidden shadow-2xl mb-6 ${!isCallAccepted ? 'animate-pulse' : ''}`}>
                    {peer?.profilePicture ? (
                        <img src={peer.profilePicture} className="w-full h-full object-cover" />
                    ) : <User className="text-primary w-20 h-20" />}
                </div>
                <h2 className="text-white text-3xl font-bold mb-2">{peer?.name || "Unknown"}</h2>
                <p className="text-white/70 text-lg tracking-wide">{statusText}</p>
            </div>

            <div className="h-40 bg-[#1f2c33]/50 backdrop-blur-md rounded-t-[40px] flex items-center justify-center gap-8 md:gap-12 px-6 relative z-50">
                <button onClick={() => setIsLoudspeaker(!isLoudspeaker)} className={`p-4 rounded-full transition-all ${isLoudspeaker ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isLoudspeaker ? <Volume2 size={28} /> : <VolumeX size={28} />}
                </button>
                <button onClick={onHangup} className="p-6 bg-rose-500 hover:bg-rose-600 rounded-full text-white transition-transform active:scale-90 shadow-xl">
                    <PhoneOff size={32} fill="currentColor" />
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
            </div>
        </div>
    );
};

export default CallOverlay;