import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import {
    MapPin, LogOut, Navigation, Clock, UserX,
    CalendarX, Loader2, School, PartyPopper, Sparkles, CheckCircle2,
    CalendarPlus, Palmtree, Sun, Waves, AlertTriangle,
    Lock, RefreshCw, Info, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import CheckInModal from "../../modals/employee/CheckInModal";
import CheckOutModal from "../../modals/employee/CheckOutModal";
import AbsentModal from "../../modals/employee/AbsentModal";
import HolidayModal from "../../modals/employee/HolidayModal";
import LeaveRequestModal from "../../modals/employee/LeaveRequestModal";

// --- SOCKET IMPORT FOR REAL-TIME REFRESH ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// --- Haversine Distance Calculator ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371e3; // Earth's radius in METERS
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceInMeters = R * c;

    if (distanceInMeters < 1000) {
        return `${Math.round(distanceInMeters)} m`;
    } else {
        return `${(distanceInMeters / 1000).toFixed(2)} km`;
    }
};

// Converts "14:30" (24h) to "2:30 PM" (12h)
const formatTo12Hour = (timeStr) => {
    if (!timeStr) return '';

    const [time, rawModifier] = timeStr.trim().split(/\s+/);
    let [hours, minutes] = time.split(':');

    hours = parseInt(hours, 10);
    const ampm = rawModifier ? rawModifier.toUpperCase() : (hours >= 12 ? 'PM' : 'AM');

    hours = hours % 12;
    hours = hours ? hours : 12;

    const formattedMins = minutes ? minutes.padStart(2, '0') : '00';
    return `${hours}:${formattedMins} ${ampm}`;
};

const EmployeeDashboard = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [assignments, setAssignments] = useState([]);
    const [leaveData, setLeaveData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [currentLocation, setCurrentLocation] = useState(null);
    const lastLocationRef = useRef(null);
    const watchIdRef = useRef(null);

    // --- GPS & PWA STATE TRACKING ---
    const [locationState, setLocationState] = useState('loading');
    const [isPermissionDenied, setIsPermissionDenied] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isPWA, setIsPWA] = useState(false);

    // Help Modal Drag state
    const [helpDragOffset, setHelpDragOffset] = useState(0);
    const [isHelpClosing, setIsHelpClosing] = useState(false);
    const helpDragStartY = useRef(0);

    // --- SOS STATE TRACKING ---
    const [sosCountdown, setSosCountdown] = useState(null);
    const sosIntervalRef = useRef(null);
    const beepAudioRef = useRef(new Audio('/sounds/beep.mp3'));

    const [checkInModal, setCheckInModal] = useState({ isOpen: false, visit: null, isLate: false });
    const [checkOutModal, setCheckOutModal] = useState({ isOpen: false, visit: null, overtimeMinutes: 0 });
    const [absentModal, setAbsentModal] = useState({ isOpen: false, target: null });
    const [holidayModal, setHolidayModal] = useState({ isOpen: false, target: null });
    const [leaveModal, setLeaveModal] = useState({ isOpen: false });

    // --- INITIALIZE PWA DETECTION ---
    useEffect(() => {
        const checkIsPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        setIsPWA(checkIsPWA);
    }, []);

    const fetchLeaveStatus = useCallback(async () => {
        try {
            const res = await api.get('/employee/leave-request/status');

            if (res.data.success && res.data.data?.status === 'approved') {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);

                const from = new Date(res.data.data.fromDate);
                const to = new Date(res.data.data.toDate);

                if (from <= todayEnd && to >= todayStart) {
                    setLeaveData(res.data.data);
                    return true;
                }
            }
            setLeaveData(null);
            return false;
        } catch (err) {
            console.error("Failed to fetch leave status", err);
            return false;
        }
    }, []);

    const fetchSchedule = useCallback(async () => {
        try {
            await fetchLeaveStatus();
            const res = await api.get('/employee/my-schedule');
            if (res.data.success) {
                setAssignments(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch schedule", err);
            toast.error(t('employee_dashboard.toasts.load_error'));
        } finally {
            setLoading(false);
        }
    }, [fetchLeaveStatus, t]);

    useEffect(() => {
        fetchSchedule();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchSchedule]);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;

        const joinUserRoom = () => socket.emit("join_room", currentUserId);

        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleRealTimeUpdate = () => fetchSchedule();

        socket.on("new_notification", handleRealTimeUpdate);

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [fetchSchedule, user]);

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

    const openGoogleMaps = (coords) => {
        if (!coords || coords.length < 2) return;
        const [lng, lat] = coords;
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const getCoordinates = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error("GPS not supported."));
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(new Error(t('employee_dashboard.toasts.gps_error'))),
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 }
            );
        });
    };

    const submitCheckIn = async (visitId, { lateReason, eventNote }) => {
        setActionLoading(true);
        const visit = assignments.find(v => v.id === visitId);
        const toastId = toast.loading(t('employee_dashboard.toasts.verifying_in'));

        try {
            let lat, lng;
            if (currentLocation && currentLocation.lat) {
                lat = currentLocation.lat;
                lng = currentLocation.lng;
            } else {
                const coords = await getCoordinates();
                lat = coords.lat;
                lng = coords.lng;
            }

            const response = await api.post('/employee/check-in', {
                schoolId: visit.schoolId, band: visit.category,
                latitude: lat, longitude: lng, lateReason, eventNote
            });

            toast.dismiss(toastId);
            toast.success(response.data?.message || t('employee_dashboard.toasts.check_in_success', { school: visit.schoolName }));
            setCheckInModal({ isOpen: false, visit: null, isLate: false });
            fetchSchedule();
        } catch (err) {
            toast.dismiss(toastId);
            toast.error(err.response?.data?.message || err.message || t('employee_dashboard.toasts.check_in_fail'));
            setCheckInModal({ isOpen: false, visit: null, isLate: false });
        } finally {
            setActionLoading(false);
        }
    };

    const submitCheckOut = async (visitId, { overtimeReason }) => {
        setActionLoading(true);
        const visit = assignments.find(v => v.id === visitId);
        const toastId = toast.loading(t('employee_dashboard.toasts.verifying_out'));

        try {
            let lat, lng;
            if (currentLocation && currentLocation.lat) {
                lat = currentLocation.lat;
                lng = currentLocation.lng;
            } else {
                const coords = await getCoordinates();
                lat = coords.lat;
                lng = coords.lng;
            }

            const response = await api.post('/employee/check-out', {
                schoolId: visit.schoolId, band: visit.category,
                latitude: lat, longitude: lng, overtimeReason
            });

            toast.dismiss(toastId);
            toast.success(response.data?.message || t('employee_dashboard.toasts.check_out_success', { school: visit.schoolName }));
            setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 });
            fetchSchedule();
        } catch (err) {
            toast.dismiss(toastId);
            toast.error(err.response?.data?.message || err.message || t('employee_dashboard.toasts.check_out_fail'));
            setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 });
        } finally {
            setActionLoading(false);
        }
    };

    const submitStatus = async (target, statusType, reason) => {
        setActionLoading(true);
        const loadingId = toast.loading(t('employee_dashboard.toasts.marking_status', { status: statusType }));
        try {
            const endpoint = target === 'ALL' ? '/employee/mark-day-status' : '/employee/mark-status';
            const payload = target === 'ALL'
                ? { status: statusType, reason }
                : { schoolId: target.schoolId, band: target.category, status: statusType, reason };

            await api.post(endpoint, payload);
            if (statusType === 'Absent') setAbsentModal({ isOpen: false, target: null });
            if (statusType === 'Holiday') setHolidayModal({ isOpen: false, target: null });

            toast.success(t('employee_dashboard.toasts.mark_success', { status: statusType }), { id: loadingId });
            fetchSchedule();
        } catch (err) {
            toast.error(err.response?.data?.message || t('employee_dashboard.toasts.mark_fail', { status: statusType }), { id: loadingId });
        } finally {
            setActionLoading(false);
        }
    };

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


    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 mt-2 md:mt-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-5 pb-6 sm:pb-8 border-b border-border/40">
                    <div className="space-y-2.5 sm:space-y-3 w-full max-w-sm">
                        <div className="h-10 sm:h-12 w-3/4 md:w-64 bg-muted rounded-xl sm:rounded-2xl animate-pulse" />
                        <div className="h-4 sm:h-5 w-full md:w-80 bg-muted/60 rounded-lg sm:rounded-xl animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto mt-3 sm:mt-4 md:mt-0">
                        <div className="flex-1 md:flex-none h-10 sm:h-12 w-full md:w-36 bg-muted rounded-lg sm:rounded-xl animate-pulse" />
                        <div className="flex-1 md:flex-none h-10 sm:h-12 w-full md:w-36 bg-muted rounded-lg sm:rounded-xl animate-pulse" />
                    </div>
                </div>

                <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-card rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-6 lg:p-8 border border-border/60 shadow-sm h-56 sm:h-64 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-700 relative mt-2 md:mt-0">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 pb-6 sm:pb-8 border-b border-border/50 relative z-20">
                <div className="space-y-1.5 sm:space-y-2">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                        {t('employee_dashboard.welcome', { name: user?.name?.split(' ')[0] })}
                    </h1>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] md:text-xs">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70 shrink-0" />
                        {leaveData ? t('employee_dashboard.status_ooo') : t('employee_dashboard.status_route')}
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
                    {(assignments.length === 0 || leaveData) && (
                        <Button
                            className="flex-1 md:flex-none h-10 sm:h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-lg sm:rounded-xl font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 gap-1.5 sm:gap-2 text-[10px] sm:text-xs"
                            onClick={() => setLeaveModal({ isOpen: true })}
                        >
                            <CalendarPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                            {leaveData ? t('employee_dashboard.btn_view_leave') : t('employee_dashboard.btn_request_leave')}
                        </Button>
                    )}

                    {!leaveData && assignments.length > 0 && (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1 md:flex-none h-10 sm:h-12 bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:border-amber-500 hover:text-white dark:text-amber-500 dark:hover:text-white rounded-lg sm:rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 gap-1.5 sm:gap-2 text-[9px] sm:text-xs"
                                onClick={() => setHolidayModal({ isOpen: true, target: 'ALL' })}
                            >
                                <CalendarX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t('employee_dashboard.btn_day_holiday')}</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 md:flex-none h-10 sm:h-12 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:border-destructive hover:text-white rounded-lg sm:rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 gap-1.5 sm:gap-2 text-[9px] sm:text-xs"
                                onClick={() => setAbsentModal({ isOpen: true, target: 'ALL' })}
                            >
                                <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t('employee_dashboard.btn_day_absent')}</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
                {leaveData ? (
                    <div className="bg-card border border-border/60 rounded-3xl sm:rounded-[3rem] p-8 sm:p-10 md:p-16 mt-4 shadow-xl shadow-sky-500/5 dark:shadow-none text-center flex flex-col items-center relative overflow-hidden group transition-all duration-500 animate-in zoom-in-95">
                        <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500" />
                        <div className="absolute -bottom-20 -left-20 sm:-bottom-24 sm:-left-24 w-48 h-48 sm:w-64 sm:h-64 bg-sky-500/10 rounded-full blur-2xl sm:blur-3xl pointer-events-none group-hover:bg-sky-500/20 transition-colors duration-700" />

                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-500">
                            <div className="absolute inset-0 bg-sky-500/20 rounded-3xl sm:rounded-4xl animate-ping opacity-75" />
                            <div className="relative w-full h-full bg-sky-100 dark:bg-sky-900/40 rounded-3xl sm:rounded-4xl flex items-center justify-center border-4 border-white dark:border-card shadow-lg z-10 rotate-3">
                                <Palmtree className="w-8 h-8 sm:w-10 sm:h-10 text-sky-600 dark:text-sky-400" />
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground mb-2.5 sm:mb-3 tracking-tight uppercase italic relative z-10">{t('employee_dashboard.vacation.title')}</h2>
                        <p className="text-muted-foreground font-medium mb-6 sm:mb-8 max-w-md text-sm sm:text-base md:text-lg leading-relaxed relative z-10 px-4">
                            {t('employee_dashboard.vacation.desc', {
                                name: user?.name?.split(' ')[0],
                                from: new Date(leaveData.fromDate).toLocaleDateString(),
                                to: new Date(leaveData.toDate).toLocaleDateString()
                            })}
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 relative z-10">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-700 dark:text-sky-400 bg-sky-500/10 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-sky-500/20 shadow-sm backdrop-blur-sm">
                                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>{t('employee_dashboard.vacation.ooo_label')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-indigo-500/20 shadow-sm backdrop-blur-sm">
                                <Waves className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>{t('employee_dashboard.vacation.mode_label')}</span>
                            </div>
                        </div>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="bg-card border border-border/60 rounded-3xl sm:rounded-[3rem] p-8 sm:p-10 md:p-16 mt-4 shadow-xl shadow-emerald-500/5 dark:shadow-none text-center flex flex-col items-center relative overflow-hidden group transition-all duration-500 animate-in zoom-in-95">
                        <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-linear-to-r from-emerald-400 via-teal-500 to-emerald-600" />
                        <div className="absolute -bottom-20 -right-20 sm:-bottom-24 sm:-right-24 w-48 h-48 sm:w-64 sm:h-64 bg-emerald-500/10 rounded-full blur-2xl sm:blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-700" />

                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-500">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl sm:rounded-4xl animate-ping opacity-75" />
                            <div className="relative w-full h-full bg-emerald-100 dark:bg-emerald-900/40 rounded-3xl sm:rounded-4xl flex items-center justify-center border-4 border-white dark:border-card shadow-lg z-10 -rotate-3">
                                <PartyPopper className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500 dark:text-emerald-400" />
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground mb-2.5 sm:mb-3 tracking-tight uppercase italic relative z-10">{t('employee_dashboard.shift_complete.title')}</h2>
                        <p className="text-muted-foreground font-medium mb-6 sm:mb-8 max-w-md text-sm sm:text-base md:text-lg leading-relaxed relative z-10 px-4">
                            {t('employee_dashboard.shift_complete.desc', { name: user?.name?.split(' ')[0] })}
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-emerald-500/20 shadow-sm backdrop-blur-sm relative z-10">
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>{t('employee_dashboard.shift_complete.footer')}</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                        {assignments.map((visit) => {
                            const [time, rawModifier] = visit.startTime.trim().split(/\s+/);
                            const modifier = (rawModifier || '').toUpperCase();
                            let [hStr, mStr] = time.split(':');
                            let h = parseInt(hStr, 10);
                            const m = parseInt(mStr, 10);
                            if (h === 12) h = modifier === 'AM' ? 0 : 12;
                            else if (modifier === 'PM') h += 12;

                            const scheduledTimeDate = new Date();
                            scheduledTimeDate.setHours(h, m, 0, 0);
                            const diffMs = scheduledTimeDate - currentTime;
                            const isLateLive = diffMs < 0;
                            const totalDiffMins = Math.floor(Math.abs(diffMs) / 60000);
                            const diffHours = Math.floor(totalDiffMins / 60);
                            const remainderMins = totalDiffMins % 60;
                            let timerText = diffHours > 0
                                ? `${diffHours}${t('employee_dashboard.units.h')} ${remainderMins}${t('employee_dashboard.units.m')}`
                                : `${totalDiffMins}${t('employee_dashboard.units.m')}`;

                            const isPending = visit.status === 'pending';
                            const isActive = visit.status === 'checked_in';

                            const schoolLng = parseFloat(visit.coordinates?.[0]);
                            const schoolLat = parseFloat(visit.coordinates?.[1]);
                            let liveDistance = null;

                            if (currentLocation && !isNaN(schoolLat) && !isNaN(schoolLng)) {
                                liveDistance = calculateDistance(
                                    currentLocation.lat,
                                    currentLocation.lng,
                                    schoolLat,
                                    schoolLng
                                );
                            }

                            return (
                                <div key={visit.id} className={`group relative bg-card rounded-4xl sm:rounded-[2.5rem] p-5 sm:p-6 md:p-8 transition-all duration-300 border flex flex-col h-full overflow-hidden ${isActive ? 'border-emerald-500/50 shadow-xl shadow-emerald-500/10 dark:bg-emerald-950/10 scale-[1.01]' : 'border-border/60 hover:shadow-xl hover:shadow-slate-200/50 hover:border-primary/40 active:scale-[0.99] dark:hover:shadow-none'}`}>
                                    {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-40 h-1 sm:h-1.5 bg-emerald-500 rounded-b-full shadow-[0_0_15px_rgba(16,185,129,0.8)]" />}
                                    
                                    <div className="flex flex-col lg:flex-row justify-between gap-5 sm:gap-6 md:gap-8 relative z-10">
                                        
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                                                <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">{visit.category}</span>
                                                {isActive && (
                                                    <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 shadow-sm">
                                                        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                                                            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                                                        </span>
                                                        {t('employee_dashboard.card.active_shift')}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-start gap-3 sm:gap-4 md:gap-5 mb-3 sm:mb-4">
                                                <div className={`p-3 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl shrink-0 mt-0.5 sm:mt-1 transition-transform duration-300 shadow-inner border ${isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:scale-110' : 'bg-primary/10 border-primary/20 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                                                    <School className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                                                </div>
                                                <div className="min-w-0 pt-0.5">
                                                    <h2 className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight truncate transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground group-hover:text-primary'}`}>
                                                        {visit.schoolName}
                                                    </h2>
                                                    <div className="flex items-start gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                                        <MapPin className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 ${isActive ? 'text-emerald-500/70' : 'text-muted-foreground/70'}`} />
                                                        <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed">
                                                            {visit.address}
                                                        </p>
                                                    </div>
                                                    {liveDistance && (
                                                        <div className="inline-flex mt-2 sm:mt-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest items-center gap-1.5 sm:gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                                                            <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                            {liveDistance} Away
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border text-left lg:text-right min-w-40 sm:min-w-50 flex flex-row lg:flex-col justify-between items-center lg:items-end shrink-0 shadow-sm transition-colors ${isActive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/30 border-border/60 group-hover:border-primary/20 group-hover:bg-muted/50'}`}>
                                            <div>
                                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 sm:mb-2 lg:ml-auto w-fit">{t('employee_dashboard.card.schedule_label')}</p>
                                                <p className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                                    {formatTo12Hour(visit.startTime)} <span className="opacity-50 font-medium px-0.5">-</span> {formatTo12Hour(visit.endTime)}
                                                </p>
                                            </div>
                                            {isPending && (
                                                <div className={`mt-0 lg:mt-3 sm:lg:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 border shadow-sm ${isLateLive ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20'}`}>
                                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                                    <span className="text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest">
                                                        {isLateLive ? t('employee_dashboard.card.late_by', { time: timerText }) : t('employee_dashboard.card.starts_in', { time: timerText })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-border/50 relative z-10">
                                        <Button variant="secondary" onClick={() => openGoogleMaps(visit.coordinates)} className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold tracking-wide border border-border/60 shadow-sm active:scale-95 transition-all group/btn">
                                            <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 group-hover/btn:text-blue-500 transition-colors" /> {t('employee_dashboard.card.btn_directions')}
                                        </Button>
                                        
                                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:flex-1 sm:justify-end">
                                            {isPending ? (
                                                <>
                                                    <div className="flex gap-2.5 sm:gap-3 w-full sm:w-auto">
                                                        <Button variant="outline" className="flex-1 sm:flex-none h-12 sm:h-14 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm active:scale-95" onClick={() => setAbsentModal({ isOpen: true, target: visit })}>
                                                            {t('employee_dashboard.card.btn_absent')}
                                                        </Button>
                                                        <Button variant="outline" className="flex-1 sm:flex-none h-12 sm:h-14 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-95" onClick={() => setHolidayModal({ isOpen: true, target: visit })}>
                                                            {t('employee_dashboard.card.btn_holiday')}
                                                        </Button>
                                                    </div>
                                                    <Button className="w-full sm:w-auto h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-10 text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" onClick={() => setCheckInModal({ isOpen: true, visit, isLate: isLateLive })}>
                                                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> {t('employee_dashboard.card.btn_check_in')}
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button className="w-full sm:w-auto h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 sm:px-10 text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]" onClick={() => setCheckOutModal({ isOpen: true, visit, overtimeMinutes: visit.overtimeMinutes })}>
                                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> {t('employee_dashboard.card.btn_check_out')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- RESPONSIVE FLOATING GPS WIDGET WITH SOS --- */}
            <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] xl:bottom-6 right-4 sm:right-5 xl:right-8 z-50">
                <div className="relative group">
                    {/* Tooltip */}
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
                            <span className="font-black text-white text-base sm:text-lg md:text-2xl tracking-widest drop-shadow-md pointer-events-none">
                                SOS
                            </span>
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

            {/* --- RESPONSIVE VISUAL HELP MODAL (Bottom Sheet Style) --- */}
            {showHelpModal && (
                <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isHelpClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={closeHelpModal}>
                    <div 
                        className={`bg-card w-full max-w-md rounded-t-4xl md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative max-h-[90vh] overflow-hidden ${isHelpClosing ? 'transition-transform duration-300 ease-out' : 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95'}`} 
                        style={{ transform: `translateY(${helpDragOffset}px)` }} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-linear-to-r from-red-500/40 via-red-500 to-red-500/40 z-20 rounded-t-[inherit]" />
                        
                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleHelpTouchStart} onTouchMove={handleHelpTouchMove} onTouchEnd={handleHelpTouchEnd}>
                            <div className="w-10 sm:w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                        </div>

                        <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 px-5 sm:px-6 pt-2 pb-3 sm:pb-4 md:pt-6 md:pb-6 flex justify-between items-center border-b border-border/50 touch-none" onTouchStart={handleHelpTouchStart} onTouchMove={handleHelpTouchMove} onTouchEnd={handleHelpTouchEnd}>
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-inner">
                                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">{t('employee_dashboard.location_help.title')}</h3>
                                </div>
                            </div>
                            <button onClick={closeHelpModal} className="p-2 sm:p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border hidden md:flex transition-colors">
                                <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5 sm:space-y-6">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed px-1">
                                {t('employee_dashboard.location_help.description')}
                            </p>

                            <div className="bg-muted/20 border border-border/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 sm:space-y-5 text-xs sm:text-sm font-medium shadow-sm">
                                {isPWA ? (
                                    <>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-card p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm border border-border mt-0.5 shrink-0"><Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
                                            <div>
                                                <p className="text-foreground font-black tracking-tight">{t('employee_dashboard.location_help.step1_title')}</p>
                                                <p className="text-muted-foreground mt-0.5 sm:mt-1 leading-snug">{t('employee_dashboard.location_help.step1_desc_pwa')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-card p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm border border-border mt-0.5 shrink-0"><Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
                                            <div>
                                                <p className="text-foreground font-black tracking-tight">{t('employee_dashboard.location_help.step2_title')}</p>
                                                <p className="text-muted-foreground mt-0.5 sm:mt-1 leading-snug">{t('employee_dashboard.location_help.step2_desc_pwa')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-card p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm border border-border mt-0.5 shrink-0"><MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
                                            <div>
                                                <p className="text-foreground font-black tracking-tight">{t('employee_dashboard.location_help.step3_title')}</p>
                                                <p className="text-muted-foreground mt-0.5 sm:mt-1 leading-snug">{t('employee_dashboard.location_help.step3_desc_pwa')}</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-card p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm border border-border mt-0.5 shrink-0"><Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
                                            <div>
                                                <p className="text-foreground font-black tracking-tight">{t('employee_dashboard.location_help.step1_title')}</p>
                                                <p className="text-muted-foreground mt-0.5 sm:mt-1 leading-snug">{t('employee_dashboard.location_help.step1_desc_web')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-card p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm border border-border mt-0.5 shrink-0"><Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
                                            <div>
                                                <p className="text-foreground font-black tracking-tight">{t('employee_dashboard.location_help.step2_title')}</p>
                                                <p className="text-muted-foreground mt-0.5 sm:mt-1 leading-snug">{t('employee_dashboard.location_help.step2_desc_web')}</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex items-start gap-3 sm:gap-4 border-t border-border/50 pt-4 sm:pt-5 mt-1.5 sm:mt-2">
                                    <div className="bg-card p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm border border-border mt-0.5 shrink-0"><RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
                                    <div>
                                        <p className="text-foreground font-black tracking-tight">{t('employee_dashboard.location_help.final_step_title')}</p>
                                        <p className="text-muted-foreground mt-0.5 sm:mt-1 leading-snug">{t('employee_dashboard.location_help.final_step_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 sm:p-6 bg-muted/10 border-t border-border/50 shrink-0 pb-safe rounded-b-2xl sm:rounded-b-3xl">
                            <Button onClick={() => window.location.reload()} className="w-full h-12 sm:h-14 font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all text-[10px] sm:text-xs md:text-sm gap-1.5 sm:gap-2">
                                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('employee_dashboard.location_help.reload_btn')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Existing Modals --- */}
            <CheckInModal isOpen={checkInModal.isOpen} onClose={() => setCheckInModal({ isOpen: false, visit: null, isLate: false })} visit={checkInModal.visit} isLate={checkInModal.isLate} onSubmit={submitCheckIn} actionLoading={actionLoading} />
            <CheckOutModal isOpen={checkOutModal.isOpen} onClose={() => setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 })} visit={checkOutModal.visit} overtimeMinutes={checkOutModal.overtimeMinutes} onSubmit={submitCheckOut} actionLoading={actionLoading} />
            <AbsentModal isOpen={absentModal.isOpen} onClose={() => setAbsentModal({ isOpen: false, target: null })} target={absentModal.target} onSubmit={(target, reason) => submitStatus(target, 'Absent', reason)} actionLoading={actionLoading} />
            <HolidayModal isOpen={holidayModal.isOpen} onClose={() => setHolidayModal({ isOpen: false, target: null })} target={holidayModal.target} onSubmit={(target, reason) => submitStatus(target, 'Holiday', reason)} actionLoading={actionLoading} />
            <LeaveRequestModal isOpen={leaveModal.isOpen} onClose={() => setLeaveModal({ isOpen: false })} />
        </div>
    );
};

export default EmployeeDashboard;