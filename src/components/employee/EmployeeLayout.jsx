import { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom"; // <-- Added useLocation
import { useSelector } from "react-redux";
import EmployeeNavbar from "./EmployeeNavbar";
import { useTranslation } from "react-i18next";
import { Toaster, toast } from "react-hot-toast";
import {
    AlertTriangle, Loader2, Info, Lock, MapPin, RefreshCw, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const EmployeeLayout = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const location = useLocation(); // <-- Track current route

    // Check if we are on the chat page
    const isChatPage = location.pathname.includes('/employee/chat');

    // --- GPS & PWA STATE TRACKING ---
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationState, setLocationState] = useState('loading');
    const [isPermissionDenied, setIsPermissionDenied] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isPWA, setIsPWA] = useState(false);

    const lastLocationRef = useRef(null);
    const watchIdRef = useRef(null);

    // Help Modal Drag state
    const [helpDragOffset, setHelpDragOffset] = useState(0);
    const [isHelpClosing, setIsHelpClosing] = useState(false);
    const helpDragStartY = useRef(0);

    // --- SOS STATE TRACKING ---
    const [sosCountdown, setSosCountdown] = useState(null);
    const sosIntervalRef = useRef(null);
    const beepAudioRef = useRef(new Audio('/sounds/sos.mp3'));

    // --- INITIALIZE PWA DETECTION ---
    useEffect(() => {
        const checkIsPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        setIsPWA(checkIsPWA);
    }, []);

    // --- REUSABLE LOCATION TRACKER ---
    const startLocationTracking = useCallback(() => {
        if (!navigator.geolocation || !user) {
            setLocationState('error');
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        setLocationState('loading');
        setIsPermissionDenied(false);
        const currentUserId = user.id || user._id;

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                setCurrentLocation({ lat, lng });
                lastLocationRef.current = { lat, lng };
                setLocationState('active');
                setIsPermissionDenied(false);

                socket.emit("update_live_location", {
                    employeeId: currentUserId,
                    lat: lat,
                    lng: lng
                });
            },
            (err) => {
                console.error("Continuous Location Watch Error:", err.message);
                setLocationState('error');

                if (err.code === err.PERMISSION_DENIED) {
                    setIsPermissionDenied(true);
                    toast.error(t('employee_dashboard.toasts.gps_denied'), { id: 'gps-denied-toast' });

                    if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                } else {
                    setIsPermissionDenied(false);
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [user, t]);

    // --- AUTO-DETECT PERMISSION CHANGES ---
    useEffect(() => {
        let permissionStatus = null;
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then((status) => {
                    permissionStatus = status;
                    status.onchange = () => {
                        if (status.state === 'granted') {
                            setShowHelpModal(false);
                            toast.success("Location access granted! Resuming tracking...", { id: 'gps-granted-toast' });
                            startLocationTracking();
                        } else if (status.state === 'denied') {
                            setLocationState('error');
                            setIsPermissionDenied(true);
                        }
                    };
                })
                .catch((err) => console.log("Permissions API not supported or error:", err));
        }

        return () => {
            if (permissionStatus) {
                permissionStatus.onchange = null;
            }
        };
    }, [startLocationTracking]);

    // 1. Trigger tracking ONLY on mount
    useEffect(() => {
        startLocationTracking();

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [startLocationTracking]);

    // 2. Handle the 5-second Heartbeat separately
    useEffect(() => {
        const currentUserId = user?.id || user?._id;

        if (!currentUserId || locationState !== 'active') return;

        const heartbeatInterval = setInterval(() => {
            if (lastLocationRef.current) {
                socket.emit("update_live_location", {
                    employeeId: currentUserId,
                    lat: lastLocationRef.current.lat,
                    lng: lastLocationRef.current.lng
                });
            }
        }, 5000);

        return () => {
            clearInterval(heartbeatInterval);
        };
    }, [user, locationState]);

    // ==========================================
    // SOS LOGIC
    // ==========================================
    const playBeep = () => {
        try {
            if (beepAudioRef.current) {
                beepAudioRef.current.currentTime = 0;
                beepAudioRef.current.play().catch(e => console.warn("Browser blocked audio play:", e));
            }
        } catch (error) {
            console.warn("Audio play failed", error);
        }
    };

    const handleSOSStart = (e) => {
        if (locationState !== 'active') return;
        if (sosIntervalRef.current) return;

        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        setSosCountdown(5);
        playBeep();

        let count = 5;
        sosIntervalRef.current = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setSosCountdown(count);
                playBeep();
                if (navigator.vibrate) navigator.vibrate(200);
            } else {
                clearInterval(sosIntervalRef.current);
                sosIntervalRef.current = null;
                setSosCountdown("SENT");

                if (beepAudioRef.current) {
                    beepAudioRef.current.pause();
                    beepAudioRef.current.currentTime = 0;
                }

                if (navigator.vibrate) navigator.vibrate(1000);

                const currentUserId = user?.id || user?._id;

                socket.emit("trigger_sos", {
                    employeeId: currentUserId,
                    lat: lastLocationRef.current?.lat,
                    lng: lastLocationRef.current?.lng
                });

                toast.error(t('employee_dashboard.sos.toast_sent'), { icon: '🚨', id: 'sos-sent', duration: 6000 });

                setTimeout(() => {
                    setSosCountdown(null);
                }, 3000);
            }
        }, 1000);
    };

    const handleSOSCancel = () => {
        if (sosIntervalRef.current) {
            clearInterval(sosIntervalRef.current);
            sosIntervalRef.current = null;
            setSosCountdown(null);
            toast(t('employee_dashboard.sos.toast_cancelled'), { icon: '🛑', id: 'sos-cancel' });

            if (beepAudioRef.current) {
                beepAudioRef.current.pause();
                beepAudioRef.current.currentTime = 0;
            }
        }
    };

    // ==========================================
    // HELP MODAL ANIMATION HANDLERS
    // ==========================================
    const closeHelpModal = () => {
        setIsHelpClosing(true);
        setHelpDragOffset(window.innerHeight);
        setTimeout(() => {
            setShowHelpModal(false);
            setIsHelpClosing(false);
            setHelpDragOffset(0);
        }, 300);
    };

    const handleHelpTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.overflow-y-auto')) return;
        helpDragStartY.current = e.touches[0].clientY;
    };

    const handleHelpTouchMove = (e) => {
        const delta = e.touches[0].clientY - helpDragStartY.current;
        if (delta > 0) setHelpDragOffset(delta);
    };

    const handleHelpTouchEnd = () => {
        if (helpDragOffset > 120) closeHelpModal();
        else setHelpDragOffset(0);
    };


    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground pt-16 relative">
            <EmployeeNavbar />

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 lg:pb-0 transition-all duration-300">
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden w-full max-w-400 mx-auto">
                    <Outlet context={{ currentLocation }} />
                </main>
            </div>

            {/* ONLY RENDER SOS AND OVERLAYS IF WE ARE NOT ON THE CHAT PAGE */}
            {!isChatPage && (
                <>
                    {/* --- RESPONSIVE FLOATING GPS WIDGET WITH SOS --- */}
                    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] xl:bottom-6 right-4 sm:right-5 xl:right-8 z-50">
                        <div className="relative group">
                            <div className="absolute right-full mr-3 sm:mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap bg-card border border-border px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold shadow-lg">
                                {locationState === 'active' ? 'Hold to send SOS' : locationState === 'error' ? 'GPS Error: Fix' : 'Acquiring GPS...'}
                            </div>

                            <button
                                onClick={() => {
                                    if (locationState === 'error') {
                                        if (isPermissionDenied) setShowHelpModal(true);
                                        else {
                                            toast(t('employee_dashboard.toasts.gps_retry'), { icon: '🔄' });
                                            startLocationTracking();
                                        }
                                    }
                                }}
                                onMouseDown={handleSOSStart}
                                onMouseUp={handleSOSCancel}
                                onMouseLeave={handleSOSCancel}
                                onTouchStart={handleSOSStart}
                                onTouchEnd={handleSOSCancel}
                                onContextMenu={(e) => { if (locationState === 'active') e.preventDefault(); }}
                                disabled={locationState === 'loading'}
                                className={`
                                    flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-[1.2rem] sm:rounded-3xl md:rounded-4xl shadow-2xl 
                                    transition-all duration-300 ease-in-out border-[3px] sm:border-4 outline-none select-none
                                    origin-center transform-gpu
                                    ${locationState === 'active'
                                        ? `bg-red-600 dark:bg-red-600 border-red-400 dark:border-red-500 
                                        hover:bg-red-700 dark:hover:bg-red-700 cursor-pointer shadow-red-600/40 
                                        dark:shadow-red-900/60 hover:scale-105 active:scale-125 active:shadow-red-500/50`
                                        : locationState === 'error'
                                            ? 'bg-zinc-800 dark:bg-zinc-900 border-zinc-600/50 dark:border-zinc-700/50 hover:bg-zinc-700 dark:hover:bg-zinc-800 cursor-pointer shadow-zinc-900/30 dark:shadow-black/50 hover:scale-105 active:scale-95'
                                            : 'bg-amber-500 dark:bg-amber-600 border-amber-300 dark:border-amber-500 cursor-wait shadow-amber-500/30 dark:shadow-amber-900/40 animate-pulse'
                                    }
                                `}
                            >
                                {locationState === 'active' && (
                                    <span className="font-black text-white text-base sm:text-lg md:text-2xl tracking-widest drop-shadow-md pointer-events-none">SOS</span>
                                )}
                                {locationState === 'error' && (
                                    <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-400 dark:text-red-500 pointer-events-none" />
                                )}
                                {locationState === 'loading' && (
                                    <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white animate-spin pointer-events-none" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* --- SOS FULL SCREEN OVERLAY --- */}
                    {sosCountdown !== null && (
                        <div className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-red-600/95 backdrop-blur-xl animate-in fade-in duration-200 pointer-events-none">
                            <div className="text-white text-center space-y-6 sm:space-y-8 flex flex-col items-center p-4 sm:p-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                                    <AlertTriangle className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 text-white relative z-10" />
                                </div>

                                {sosCountdown === "SENT" ? (
                                    <div className="animate-in slide-in-from-bottom-4">
                                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-widest text-white mb-3 sm:mb-4">{t('employee_dashboard.sos.sent_title')}</h1>
                                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-white/90 max-w-sm sm:max-w-lg mx-auto">{t('employee_dashboard.sos.sent_desc')}</p>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-widest text-white/90">{t('employee_dashboard.sos.emergency_title')}</h2>
                                        <div className="text-[8rem] sm:text-[10rem] md:text-[12rem] font-black text-white leading-none drop-shadow-2xl">{sosCountdown}</div>
                                        <div className="bg-black/30 border border-white/20 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg backdrop-blur-md">
                                            <p className="text-base sm:text-lg md:text-xl font-black text-white uppercase tracking-widest">{t('employee_dashboard.sos.release_cancel')}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* --- RESPONSIVE VISUAL HELP MODAL --- */}
            {showHelpModal && (
                <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isHelpClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={closeHelpModal}>
                    <div
                        className={`bg-card w-full max-w-md rounded-t-4xl md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative max-h-[90vh] overflow-hidden ${isHelpClosing ? 'transition-transform duration-300 ease-out' : 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95'}`}
                        style={{ transform: `translateY(${helpDragOffset}px)` }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Help Modal Content unchanged... */}
                        <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-linear-to-r from-red-500/40 via-red-500 to-red-500/40 z-20 rounded-t-[inherit]" />
                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleHelpTouchStart} onTouchMove={handleHelpTouchMove} onTouchEnd={handleHelpTouchEnd}>
                            <div className="w-10 sm:w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                        </div>
                        <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 px-5 sm:px-6 pt-2 pb-3 flex justify-between items-center border-b border-border/50">
                            <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Location Help</h3>
                            <button onClick={closeHelpModal} className="p-2 sm:p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border hidden md:flex"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed px-1 mb-4">Please enable location permissions in your browser or device settings to use this feature.</p>
                        </div>
                        <div className="p-4 sm:p-6 bg-muted/10 border-t border-border/50 shrink-0 pb-safe rounded-b-2xl">
                            <Button onClick={() => window.location.reload()} className="w-full h-12 gap-2"><RefreshCw className="w-4 h-4" /> Reload App</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeLayout;