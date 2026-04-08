import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../api/axios";
import {
    MapPin, LogOut, Navigation, Clock, UserX,
    CalendarX, Loader2, School, PartyPopper, Sparkles, CheckCircle2,
    CalendarPlus, Palmtree, Sun, Waves, Satellite, AlertTriangle,
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

    // --- NEW: SOS STATE TRACKING ---
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
                    toast.error(t('employee_dashboard.toasts.gps_denied', 'Location permission blocked. Click the red GPS icon for help.'), { id: 'gps-denied-toast' });

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
        // OPTIMIZED MAPS LINK
        const url = `https://maps.google.com/?q=$${lat},${lng}`;
        window.open(url, '_blank');
    };

    const getCoordinates = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error("GPS not supported."));
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(new Error(t('employee_dashboard.toasts.gps_error', 'Failed to get GPS signal. Please step outside or check location permissions.'))),
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

                toast.error("EMERGENCY SOS SENT!", { icon: '🚨', id: 'sos-sent', duration: 6000 });

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
            toast("SOS Cancelled.", { icon: '🛑', id: 'sos-cancel' });

            if (beepAudioRef.current) {
                beepAudioRef.current.pause();
                beepAudioRef.current.currentTime = 0;
            }
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-border/40">
                    <div className="space-y-3 w-full max-w-sm">
                        <div className="h-10 w-3/4 md:w-64 bg-muted rounded-lg animate-pulse" />
                        <div className="h-5 w-full md:w-80 bg-muted/60 rounded-md animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex-1 md:flex-none h-11 w-full md:w-36 bg-muted rounded-xl animate-pulse" />
                        <div className="flex-1 md:flex-none h-11 w-full md:w-36 bg-muted rounded-xl animate-pulse" />
                    </div>
                </div>

                <div className="mt-6 space-y-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-card rounded-3xl p-5 sm:p-7 border border-border/60 shadow-sm h-64 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-border/40">
                <div className="space-y-1.5">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                        {t('employee_dashboard.welcome', { name: user?.name?.split(' ')[0] })}
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
                        {leaveData ? t('employee_dashboard.status_ooo') : t('employee_dashboard.status_route')}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {(assignments.length === 0 || leaveData) && (
                        <Button
                            variant="outline"
                            className="flex-1 md:flex-none h-11 bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-xl font-semibold transition-all"
                            onClick={() => setLeaveModal({ isOpen: true })}
                        >
                            <CalendarPlus className="w-4 h-4 mr-2" /> {leaveData ? t('employee_dashboard.btn_view_leave') : t('employee_dashboard.btn_request_leave')}
                        </Button>
                    )}

                    {!leaveData && assignments.length > 0 && (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1 md:flex-none h-11 bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 rounded-xl font-semibold transition-all"
                                onClick={() => setHolidayModal({ isOpen: true, target: 'ALL' })}
                            >
                                <CalendarX className="w-4 h-4 mr-2" /> {t('employee_dashboard.btn_day_holiday')}
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 md:flex-none h-11 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 hover:text-destructive rounded-xl font-semibold transition-all"
                                onClick={() => setAbsentModal({ isOpen: true, target: 'ALL' })}
                            >
                                <UserX className="w-4 h-4 mr-2" /> {t('employee_dashboard.btn_day_absent')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-6">
                {leaveData ? (
                    <div className="bg-card border border-border rounded-4xl p-10 sm:p-16 mt-4 shadow-sm text-center flex flex-col items-center relative overflow-hidden group hover:shadow-md transition-shadow animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-sky-400 via-blue-400 to-indigo-500" />
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 bg-sky-500/20 rounded-full animate-ping opacity-75" />
                            <div className="relative w-full h-full bg-sky-100 dark:bg-sky-900/40 rounded-full flex items-center justify-center border-4 border-white dark:border-card shadow-sm z-10">
                                <Palmtree className="w-12 h-12 text-sky-600 dark:text-sky-400" />
                            </div>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3 tracking-tight">{t('employee_dashboard.vacation.title')}</h2>
                        <p className="text-muted-foreground mb-8 max-w-md text-base sm:text-lg leading-relaxed">
                            {t('employee_dashboard.vacation.desc', {
                                name: user?.name?.split(' ')[0],
                                from: new Date(leaveData.fromDate).toLocaleDateString(),
                                to: new Date(leaveData.toDate).toLocaleDateString()
                            })}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-sky-700 dark:text-sky-300 bg-sky-500/10 px-6 py-3 rounded-full z-10 border border-sky-500/20 backdrop-blur-sm">
                                <Sun className="w-4 h-4" />
                                <span>{t('employee_dashboard.vacation.ooo_label')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-6 py-3 rounded-full z-10 border border-indigo-500/20 backdrop-blur-sm">
                                <Waves className="w-4 h-4" />
                                <span>{t('employee_dashboard.vacation.mode_label')}</span>
                            </div>
                        </div>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="bg-card border border-border rounded-4xl p-10 sm:p-16 mt-4 shadow-sm text-center flex flex-col items-center relative overflow-hidden group hover:shadow-md transition-shadow animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-400 via-teal-400 to-emerald-500" />
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
                            <div className="relative w-full h-full bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center border-4 border-white dark:border-card shadow-sm z-10">
                                <PartyPopper className="w-12 h-12 text-emerald-500 dark:text-emerald-400" />
                            </div>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3 tracking-tight">{t('employee_dashboard.shift_complete.title')}</h2>
                        <p className="text-muted-foreground mb-8 max-w-md text-base sm:text-lg leading-relaxed">
                            {t('employee_dashboard.shift_complete.desc', { name: user?.name?.split(' ')[0] })}
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-6 py-3 rounded-full z-10 border border-emerald-500/20 backdrop-blur-sm">
                            <Sparkles className="w-4 h-4" />
                            <span>{t('employee_dashboard.shift_complete.footer')}</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
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
                                <div key={visit.id} className={`group relative bg-card rounded-3xl p-5 sm:p-7 transition-all duration-300 border ${isActive ? 'border-emerald-500/50 scale-[1.01] dark:bg-emerald-950/10 shadow-lg' : 'border-border hover:shadow-md hover:border-primary/30'}`}>
                                    {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-emerald-500 rounded-b-full" />}
                                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className="px-3.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">{visit.category}</span>
                                                {isActive && (
                                                    <span className="px-3.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                        </span>
                                                        {t('employee_dashboard.card.active_shift')}
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
                                                <div className="p-2 bg-muted rounded-xl shrink-0"><School className="w-5 h-5 text-primary" /></div>
                                                {visit.schoolName}
                                            </h2>

                                            <div className="flex items-start gap-2 mt-3 ml-1">
                                                <MapPin className="w-4 h-4 mt-1 shrink-0 text-muted-foreground/70" />
                                                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                                                    {visit.address}
                                                </p>
                                                {liveDistance && (
                                                    <div className="shrink-0 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                                        <Navigation className="w-3 h-3" />
                                                        {liveDistance}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-muted/40 p-4 rounded-2xl border border-border/50 text-left lg:text-right min-w-50 flex flex-row lg:flex-col justify-between items-center lg:items-end">
                                            <div>
                                                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('employee_dashboard.card.schedule_label')}</p>
                                                <p className="text-lg font-extrabold text-foreground">
                                                    {formatTo12Hour(visit.startTime)} - {formatTo12Hour(visit.endTime)}
                                                </p>
                                            </div>
                                            {isPending && (
                                                <div className={`mt-0 lg:mt-2 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border ${isLateLive ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-sm font-bold">
                                                        {isLateLive ? t('employee_dashboard.card.late_by', { time: timerText }) : t('employee_dashboard.card.starts_in', { time: timerText })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-5 border-t border-border/60">
                                        <Button variant="secondary" onClick={() => openGoogleMaps(visit.coordinates)} className="w-full sm:w-auto h-12 px-6 rounded-xl font-semibold"><Navigation className="w-4 h-4 mr-2" /> {t('employee_dashboard.card.btn_directions')}</Button>
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:flex-1 sm:justify-end">
                                            {isPending ? (
                                                <>
                                                    <Button variant="outline" className="h-12 rounded-xl text-destructive border-destructive/20" onClick={() => setAbsentModal({ isOpen: true, target: visit })}>{t('employee_dashboard.card.btn_absent')}</Button>
                                                    <Button variant="outline" className="h-12 rounded-xl text-amber-600 border-amber-500/20" onClick={() => setHolidayModal({ isOpen: true, target: visit })}>{t('employee_dashboard.card.btn_holiday')}</Button>
                                                    <Button className="h-12 rounded-xl bg-primary px-10 font-bold" onClick={() => setCheckInModal({ isOpen: true, visit, isLate: isLateLive })}><MapPin className="w-5 h-5 mr-2" /> {t('employee_dashboard.card.btn_check_in')}</Button>
                                                </>
                                            ) : (
                                                <Button className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-10 font-bold" onClick={() => setCheckOutModal({ isOpen: true, visit, overtimeMinutes: visit.overtimeMinutes })}><CheckCircle2 className="w-5 h-5 mr-2" /> {t('employee_dashboard.card.btn_check_out')}</Button>
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
            <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] xl:bottom-8 right-4 xl:right-8 z-60">
                <button
                    onClick={() => {
                        if (locationState === 'error') {
                            if (isPermissionDenied) {
                                setShowHelpModal(true);
                            } else {
                                toast(t('employee_dashboard.toasts.gps_retry', 'Retrying location capture...'), { icon: '🔄' });
                                startLocationTracking();
                            }
                        }
                    }}
                    onMouseDown={handleSOSStart}
                    onMouseUp={handleSOSCancel}
                    onMouseLeave={handleSOSCancel}
                    onTouchStart={handleSOSStart}
                    onTouchEnd={handleSOSCancel}
                    onContextMenu={(e) => {
                        if (locationState === 'active') e.preventDefault();
                    }}
                    disabled={locationState === 'loading'}
                    className={`
            flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl 
            transition-all duration-300 ease-in-out border-[3px] md:border-4 outline-none select-none
            origin-center transform-gpu
            ${locationState === 'active'
                            ? `bg-red-600 dark:bg-red-600 border-red-300/60 dark:border-red-500/40 
                   hover:bg-red-700 dark:hover:bg-red-700 cursor-pointer shadow-red-600/40 
                   dark:shadow-red-900/60 hover:scale-105 
                   active:scale-125 active:shadow-red-500/50`
                            : locationState === 'error'
                                ? 'bg-zinc-800 dark:bg-zinc-900 border-zinc-600/50 dark:border-zinc-700/50 hover:bg-zinc-700 dark:hover:bg-zinc-800 cursor-pointer shadow-zinc-900/30 dark:shadow-black/50 hover:scale-105 active:scale-105'
                                : 'bg-amber-500 dark:bg-amber-600 border-amber-200/50 dark:border-amber-500/40 cursor-wait shadow-amber-500/30 dark:shadow-amber-900/40 animate-pulse'
                        }
        `}
                    title={
                        locationState === 'active'
                            ? 'Hold for 5 seconds to send SOS'
                            : locationState === 'error'
                                ? 'GPS Error: Click to retry or fix'
                                : 'Acquiring GPS signal...'
                    }
                >
                    {locationState === 'active' && (
                        <span className="font-black text-white text-base md:text-lg tracking-widest drop-shadow-md pointer-events-none">
                            SOS
                        </span>
                    )}
                    {locationState === 'error' && (
                        <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 text-red-400 dark:text-red-500 pointer-events-none" />
                    )}
                    {locationState === 'loading' && (
                        <Loader2 className="w-6 h-6 md:w-7 md:h-7 text-white animate-spin pointer-events-none" />
                    )}
                </button>
            </div>

            {/* --- NEW: SOS FULL SCREEN OVERLAY --- */}
            {sosCountdown !== null && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600/95 backdrop-blur-md animate-in fade-in duration-200 pointer-events-none">
                    <div className="text-white text-center space-y-6 flex flex-col items-center p-6">
                        <AlertTriangle className="w-24 h-24 sm:w-32 sm:h-32 text-white animate-pulse" />

                        {sosCountdown === "SENT" ? (
                            <>
                                <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-widest text-white">SOS SENT</h1>
                                <p className="text-xl sm:text-2xl font-bold text-white/90 max-w-md">Help is being dispatched.</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-widest text-white/90">Emergency SOS</h2>
                                <div className="text-8xl sm:text-9xl font-black text-white">{sosCountdown}</div>
                                <div className="bg-black/20 px-6 py-3 rounded-full">
                                    <p className="text-lg sm:text-xl font-bold text-white uppercase tracking-widest">Release finger to cancel</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* --- RESPONSIVE VISUAL HELP MODAL --- */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[95vh] relative animate-in zoom-in-95 duration-300">

                        <button
                            onClick={() => setShowHelpModal(false)}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-muted/80 hover:bg-muted rounded-full transition-colors z-10 backdrop-blur-md"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                        </button>

                        <div className="overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mt-2">
                                <MapPin className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>

                            <div className="text-center space-y-1.5 sm:space-y-2">
                                <h3 className="text-xl sm:text-2xl font-bold text-foreground">Location Blocked</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                                    Your browser is preventing us from accessing your location. You need to enable it manually.
                                </p>
                            </div>

                            <div className="bg-muted/50 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 text-xs sm:text-sm font-medium">
                                {isPWA ? (
                                    <>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border mt-0.5 sm:mt-1 shrink-0">
                                                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-foreground font-bold">Step 1</p>
                                                <p className="text-muted-foreground leading-snug">Open your phone's main browser (like <strong>Chrome</strong> or <strong>Safari</strong>).</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border mt-0.5 sm:mt-1 shrink-0">
                                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-foreground font-bold">Step 2</p>
                                                <p className="text-muted-foreground leading-snug">Go to this app's website address and tap the <strong className="text-foreground">Lock icon 🔒</strong> next to the URL.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border mt-0.5 sm:mt-1 shrink-0">
                                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-foreground font-bold">Step 3</p>
                                                <p className="text-muted-foreground leading-snug">Tap <strong>Permissions</strong> or <strong>Site Settings</strong>, find Location, and change it to <strong className="text-emerald-600 dark:text-emerald-400">Allow</strong>.</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border mt-0.5 sm:mt-1 shrink-0">
                                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-foreground font-bold">Step 1</p>
                                                <p className="text-muted-foreground leading-snug">Tap the <strong className="text-foreground">Lock icon 🔒</strong> in your browser's address bar at the top.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border mt-0.5 sm:mt-1 shrink-0">
                                                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-foreground font-bold">Step 2</p>
                                                <p className="text-muted-foreground leading-snug">Find <strong>Permissions</strong> or <strong>Location</strong> and change it to <strong className="text-emerald-600 dark:text-emerald-400">Allow</strong>.</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex items-start gap-3 sm:gap-4 border-t border-border/50 pt-3 sm:pt-4 mt-1 sm:mt-2">
                                    <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border mt-0.5 sm:mt-1 shrink-0">
                                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-foreground font-bold">Final Step</p>
                                        <p className="text-muted-foreground leading-snug">Return here. We will <strong>auto-detect</strong> the change, or you can click below.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 sm:pt-4 pb-2">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-bold rounded-xl shadow-md"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" /> Reload Page manually
                                </Button>
                            </div>
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