import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../api/axios";
import {
    MapPin, LogOut, Navigation, Clock, UserX,
    CalendarX, Loader2, School, PartyPopper, Sparkles, CheckCircle2,
    CalendarPlus, Palmtree, Sun, Waves
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // <-- Added import

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
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
};

const EmployeeDashboard = () => {
    const { t } = useTranslation(); // <-- Initialize hook
    const { user } = useSelector((state) => state.auth);

    const [assignments, setAssignments] = useState([]);
    const [leaveData, setLeaveData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal States
    const [checkInModal, setCheckInModal] = useState({ isOpen: false, visit: null, isLate: false });
    const [checkOutModal, setCheckOutModal] = useState({ isOpen: false, visit: null, overtimeMinutes: 0 });
    const [absentModal, setAbsentModal] = useState({ isOpen: false, target: null });
    const [holidayModal, setHolidayModal] = useState({ isOpen: false, target: null });
    const [leaveModal, setLeaveModal] = useState({ isOpen: false });

    // ==========================================
    // 1. DATA FETCHING (SCHEDULE & LEAVE)
    // ==========================================
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

    const formatOvertime = (totalMinutes) => {
        if (!totalMinutes || totalMinutes <= 0) return "";
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return h > 0 ? `${h}${t('employee_dashboard.units.h')} ${m}${t('employee_dashboard.units.m')}` : `${m}${t('employee_dashboard.units.m')}`;
    };

    useEffect(() => {
        fetchSchedule();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchSchedule]);

    // ==========================================
    // 2. REAL-TIME SOCKET SYNC
    // ==========================================
    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;

        const joinUserRoom = () => {
            socket.emit("join_room", currentUserId);
        };

        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleRealTimeUpdate = () => {
            fetchSchedule();
        };

        socket.on("new_notification", handleRealTimeUpdate);

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [fetchSchedule, user]);

    // ==========================================
    // 3. HELPERS & ACTIONS
    // ==========================================
    const openGoogleMaps = (coords) => {
        const [lng, lat] = coords;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const getCoordinates = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error("GPS not supported."));
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(new Error("Please enable GPS/Location Services.")),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    const submitCheckIn = async (visitId, { lateReason, eventNote }) => {
        setActionLoading(true);
        const visit = assignments.find(v => v.id === visitId);
        const toastId = toast.loading(t('employee_dashboard.toasts.verifying_in'));

        try {
            const { lat, lng } = await getCoordinates();
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
            toast.error(err.response?.data?.message || t('employee_dashboard.toasts.check_in_fail'));
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
            const { lat, lng } = await getCoordinates();
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
            toast.error(err.response?.data?.message || t('employee_dashboard.toasts.check_out_fail'));
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
    // 4. RENDER LOGIC
    // ==========================================
    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
                {/* Shimmer Header */}
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

                {/* Shimmer Cards List */}
                <div className="mt-6 space-y-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-card rounded-3xl p-5 sm:p-7 border border-border/60 shadow-sm h-64 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">

            {/* Header & Global Controls */}
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
                                            <p className="text-sm text-muted-foreground flex items-start gap-2 mt-3 ml-1 leading-relaxed">
                                                <MapPin className="w-4 h-4 mt-1 shrink-0 text-muted-foreground/70" />{visit.address}
                                            </p>
                                        </div>
                                        <div className="bg-muted/40 p-4 rounded-2xl border border-border/50 text-left lg:text-right min-w-50 flex flex-row lg:flex-col justify-between items-center lg:items-end">
                                            <div>
                                                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('employee_dashboard.card.schedule_label')}</p>
                                                <p className="text-lg font-extrabold text-foreground">{visit.startTime} - {visit.endTime}</p>
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

            {/* --- Modals --- */}
            <CheckInModal isOpen={checkInModal.isOpen} onClose={() => setCheckInModal({ isOpen: false, visit: null, isLate: false })} visit={checkInModal.visit} isLate={checkInModal.isLate} onSubmit={submitCheckIn} actionLoading={actionLoading} />
            <CheckOutModal isOpen={checkOutModal.isOpen} onClose={() => setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 })} visit={checkOutModal.visit} overtimeMinutes={checkOutModal.overtimeMinutes} onSubmit={submitCheckOut} actionLoading={actionLoading} />
            <AbsentModal isOpen={absentModal.isOpen} onClose={() => setAbsentModal({ isOpen: false, target: null })} target={absentModal.target} onSubmit={(target, reason) => submitStatus(target, 'Absent', reason)} actionLoading={actionLoading} />
            <HolidayModal isOpen={holidayModal.isOpen} onClose={() => setHolidayModal({ isOpen: false, target: null })} target={holidayModal.target} onSubmit={(target, reason) => submitStatus(target, 'Holiday', reason)} actionLoading={actionLoading} />
            <LeaveRequestModal isOpen={leaveModal.isOpen} onClose={() => setLeaveModal({ isOpen: false })} />
        </div>
    );
};

export default EmployeeDashboard;