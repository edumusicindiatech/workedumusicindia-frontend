import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
    MapPin, Clock, LogOut, Loader2,
    Navigation, School, CheckCircle2, Map,
    AlertTriangle, UserX, CalendarX
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Import Modals ---
import CheckInModal from "../../modals/employee/CheckInModal";
import AbsentModal from "../../modals/employee/AbsentModal";
import CheckOutModal from "../../modals/employee/CheckOutModal";
import HolidayModal from "../../modals/employee/HolidayModal";

const EmployeeDashboard = () => {
    const dispatch = useDispatch();
    const { user, token } = useSelector((state) => state.auth);

    // --- DATA & LOADING STATES ---
    const [scheduledVisits, setScheduledVisits] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [dayStarted, setDayStarted] = useState(true); // Shift toggle state

    // --- MODAL STATES ---
    const [checkInModal, setCheckInModal] = useState({ isOpen: false, visit: null, isLate: false });
    const [checkOutModal, setCheckOutModal] = useState({ isOpen: false, visit: null, overtimeMinutes: 0 });
    const [absentModal, setAbsentModal] = useState({ isOpen: false, target: null });
    const [holidayModal, setHolidayModal] = useState({ isOpen: false, target: null });

    // ==========================================
    // 1. FETCH SCHEDULE (GET /my-schedule)
    // ==========================================
    const fetchDashboardData = useCallback(async () => {
        if (!navigator.geolocation) {
            console.error("Geolocation is not supported by your browser.");
            setLoading(false);
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await axios.get(
                        `/api/employee/my-schedule?lat=${latitude}&lng=${longitude}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (response.data.success) {
                        setScheduledVisits(response.data.data);
                        setStats(response.data.stats);
                    }
                } catch (err) {
                    console.error("Failed to sync schedule:", err);
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error("GPS Error:", error);
                alert("Please enable GPS to view your schedule and distance calculations.");
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    }, [token]);

    // Initial Load
    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user, fetchDashboardData]);

    // ==========================================
    // 2. API ACTION HANDLERS
    // ==========================================

    const handleToggleDay = () => {
        setActionLoading(true);
        setTimeout(() => {
            setDayStarted(!dayStarted);
            setActionLoading(false);
        }, 800);
    };

    const openDirections = (address) => {
        window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
    };

    // -> POST /check-in
    const submitCheckIn = async (visitId, { lateReason, eventNote, eventDate }) => {
        setActionLoading(true);
        const visit = scheduledVisits.find(v => v.id === visitId);

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                await axios.post('/api/employee/check-in', {
                    schoolId: visit.schoolId,
                    band: visit.category,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    lateReason,
                    eventNote,
                    eventDate
                }, { headers: { Authorization: `Bearer ${token}` } });

                setCheckInModal({ isOpen: false, visit: null, isLate: false });
                fetchDashboardData(); // Refresh UI
            } catch (error) {
                alert(error.response?.data?.message || "Check-in failed. Are you within 100m?");
            } finally {
                setActionLoading(false);
            }
        });
    };

    // -> POST /check-out
    const submitCheckOut = async (visitId, { overtimeReason }) => {
        setActionLoading(true);
        const visit = scheduledVisits.find(v => v.id === visitId);

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                await axios.post('/api/employee/check-out', {
                    schoolId: visit.schoolId,
                    band: visit.category,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    overtimeReason
                }, { headers: { Authorization: `Bearer ${token}` } });

                setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 });
                fetchDashboardData(); // Refresh UI (Will auto-hide completed visit)
            } catch (error) {
                alert(error.response?.data?.message || "Check-out failed.");
            } finally {
                setActionLoading(false);
            }
        });
    };

    // -> POST /mark-status & /mark-day-status
    const handleMarkStatus = async (target, status, reason) => {
        setActionLoading(true);
        try {
            const endpoint = target === 'ALL' ? '/api/employee/mark-day-status' : '/api/employee/mark-status';
            const body = target === 'ALL'
                ? { status, reason }
                : { schoolId: target.schoolId, band: target.category, status, reason };

            await axios.post(endpoint, body, { headers: { Authorization: `Bearer ${token}` } });

            if (status === 'Absent') setAbsentModal({ isOpen: false, target: null });
            if (status === 'Holiday') setHolidayModal({ isOpen: false, target: null });

            fetchDashboardData(); // Refresh UI
        } catch (error) {
            alert(error.response?.data?.message || `Failed to mark ${status}`);
        } finally {
            setActionLoading(false);
        }
    };

    const submitAbsent = (target, reason) => handleMarkStatus(target, 'Absent', reason);
    const submitHoliday = (target, reason) => handleMarkStatus(target, 'Holiday', reason);

    // ==========================================
    // 3. UI FILTERING
    // ==========================================

    // Auto-hide logic: Only show Pending or Currently Active visits
    const visibleVisits = scheduledVisits.filter(visit =>
        visit.status === 'pending' || visit.status === 'checked_in'
    );

    // --- RENDER LOADING STATE ---
    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Syncing live schedule...</p>
        </div>
    );

    // --- MAIN RENDER ---
    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20 relative px-2 sm:px-0">

            {/* 1. GLOBAL HEADER & STATS */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                        Welcome, {user.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">Here is your schedule for today.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 flex-1 sm:flex-none h-12 rounded-xl px-4"
                            onClick={() => setHolidayModal({ isOpen: true, target: 'ALL' })}
                        >
                            <CalendarX className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 flex-1 sm:flex-none h-12 rounded-xl px-4"
                            onClick={() => setAbsentModal({ isOpen: true, target: 'ALL' })}
                        >
                            <UserX className="w-4 h-4 mr-2" /> Day Absent
                        </Button>
                    </div>

                    <div className="bg-card border border-border rounded-xl px-5 py-3 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Map className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending Visits</p>
                            <p className="text-lg font-bold text-foreground leading-none">
                                {stats.pending} <span className="text-sm font-medium text-muted-foreground">/ {stats.total}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. GLOBAL SHIFT DOUBLE-CHECK */}
            {!dayStarted && (
                <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="font-bold text-lg mb-1">Start Your Shift</h2>
                        <p className="text-primary-foreground/80 text-sm">You must clock in to start tracking your daily progress.</p>
                    </div>
                    <Button onClick={handleToggleDay} disabled={actionLoading} className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 rounded-xl h-11 px-8 font-bold shadow-sm">
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Clock In Now"}
                    </Button>
                </div>
            )}

            {/* 3. SCHEDULED VISITS LIST */}
            {visibleVisits.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 mt-8 shadow-sm text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">All Caught Up!</h2>
                    <p className="text-muted-foreground mb-8 max-w-sm">You have completed your route or have no active assignments left for today.</p>

                    {dayStarted && (
                        <Button onClick={handleToggleDay} disabled={actionLoading} variant="destructive" className="h-12 px-8 rounded-xl shadow-sm w-full sm:w-auto">
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LogOut className="w-5 h-5 mr-2" />}
                            End Shift / Log Out
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {visibleVisits.map(visit => {
                        const isPending = visit.status === 'pending';
                        const isActive = visit.status === 'checked_in';

                        return (
                            <div key={visit.id} className={`bg-card border rounded-2xl shadow-sm overflow-hidden relative transition-all duration-300
                                ${isActive ? 'border-primary ring-1 ring-primary/20 shadow-elevated scale-[1.01]' : 'border-border'}`}>

                                {/* Header Banner */}
                                <div className={`h-2 w-full ${isActive ? 'bg-emerald-500' :
                                        visit.minutesLate >= 120 ? 'bg-destructive' :
                                            visit.minutesLate > 0 ? 'bg-amber-500' : 'bg-primary'
                                    }`}></div>

                                <div className="p-6 md:p-8">
                                    {/* Critical Late Warning */}
                                    {isPending && visit.minutesLate >= 120 && (
                                        <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <p className="text-sm font-medium leading-tight">
                                                <strong>Action Required:</strong> You have not marked attendance for 2+ hours past the scheduled time. Please Mark Attendance or Mark Absent for this school immediately.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                                        {/* Left Side: School Info */}
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                                    {visit.category}
                                                </span>
                                                {isActive && (
                                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Currently Active
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                                                    <School className="w-6 h-6 text-muted-foreground shrink-0" />
                                                    <span className="truncate">{visit.schoolName}</span>
                                                </h2>
                                                <p className="text-muted-foreground mt-1.5 flex items-start gap-2 text-sm">
                                                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                                    {visit.address}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Side: Times & Distance */}
                                        <div className="flex flex-col items-start md:items-end gap-3 bg-muted/30 p-4 rounded-xl border border-border/50 min-w-50 w-full md:w-auto">
                                            <div className="space-y-0.5 w-full text-left md:text-right">
                                                <p className="text-xs text-muted-foreground font-medium flex items-center md:justify-end gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" /> Scheduled {isPending ? 'Time' : 'End'}
                                                </p>
                                                <p className={`font-bold text-lg ${visit.minutesLate > 0 && isPending ? 'text-destructive' : 'text-foreground'}`}>
                                                    {isPending ? visit.scheduledTime : visit.scheduledEndTime}
                                                </p>

                                                {/* API Driven Late/Overtime pills */}
                                                {visit.minutesLate > 0 && isPending && (
                                                    <p className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded inline-block mt-1">
                                                        Late by {visit.minutesLate} min
                                                    </p>
                                                )}
                                                {isActive && visit.overtimeMinutes > 0 && (
                                                    <p className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded inline-block mt-1">
                                                        Overtime by {visit.overtimeMinutes} min
                                                    </p>
                                                )}
                                            </div>

                                            {isPending && (
                                                <div className="space-y-0.5 w-full text-left md:text-right mt-2">
                                                    <p className="text-xs text-muted-foreground font-medium flex items-center md:justify-end gap-1.5">
                                                        <Navigation className="w-3.5 h-3.5" /> Est. Distance
                                                    </p>
                                                    <p className="font-bold text-amber-500">{visit.distance} away</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 pt-6 border-t border-border flex flex-wrap justify-end gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => openDirections(visit.address)}
                                            className="h-12 rounded-xl w-full sm:w-auto"
                                        >
                                            <Navigation className="w-4 h-4 mr-2" /> Get Directions
                                        </Button>

                                        {isPending ? (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    className="h-12 rounded-xl text-amber-500 hover:bg-amber-500/10 w-full sm:w-auto font-semibold"
                                                    onClick={() => setHolidayModal({ isOpen: true, target: visit })}
                                                >
                                                    Mark Holiday
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="h-12 rounded-xl text-destructive hover:bg-destructive/10 w-full sm:w-auto font-semibold"
                                                    onClick={() => setAbsentModal({ isOpen: true, target: visit })}
                                                >
                                                    Mark Absent
                                                </Button>
                                                <Button
                                                    disabled={!dayStarted}
                                                    onClick={() => setCheckInModal({ isOpen: true, visit: visit, isLate: visit.minutesLate > 0 })}
                                                    className="h-12 rounded-xl px-8 shadow-glow w-full sm:w-auto"
                                                >
                                                    <MapPin className="w-4 h-4 mr-2" /> Check In
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                disabled={actionLoading}
                                                onClick={() => setCheckOutModal({ isOpen: true, visit, overtimeMinutes: visit.overtimeMinutes })}
                                                className="h-12 rounded-xl px-8 bg-destructive hover:bg-destructive/90 text-white shadow-glow w-full sm:w-auto"
                                            >
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                                                Check Out
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- Modals --- */}
            <CheckInModal
                isOpen={checkInModal.isOpen}
                onClose={() => setCheckInModal({ isOpen: false, visit: null, isLate: false })}
                visit={checkInModal.visit}
                isLate={checkInModal.isLate}
                onSubmit={submitCheckIn}
                actionLoading={actionLoading}
            />

            <CheckOutModal
                isOpen={checkOutModal.isOpen}
                onClose={() => setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 })}
                visit={checkOutModal.visit}
                overtimeMinutes={checkOutModal.overtimeMinutes}
                onSubmit={submitCheckOut}
                actionLoading={actionLoading}
            />

            <AbsentModal
                isOpen={absentModal.isOpen}
                onClose={() => setAbsentModal({ isOpen: false, target: null })}
                target={absentModal.target}
                onSubmit={submitAbsent}
                actionLoading={actionLoading}
            />

            <HolidayModal
                isOpen={holidayModal.isOpen}
                onClose={() => setHolidayModal({ isOpen: false, target: null })}
                target={holidayModal.target}
                onSubmit={submitHoliday}
                actionLoading={actionLoading}
            />

        </div>
    );
};

export default EmployeeDashboard;