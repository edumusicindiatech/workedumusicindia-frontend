import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import api from "../../api/axios";
import {
    MapPin, LogOut, Navigation, Clock, UserX,
    CalendarX, Loader2, School, PartyPopper, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

import CheckInModal from "../../modals/employee/CheckInModal";
import CheckOutModal from "../../modals/employee/CheckOutModal";
import AbsentModal from "../../modals/employee/AbsentModal";
import HolidayModal from "../../modals/employee/HolidayModal";

const EmployeeDashboard = () => {
    const { user } = useSelector((state) => state.auth);

    const [assignments, setAssignments] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal States
    const [checkInModal, setCheckInModal] = useState({ isOpen: false, visit: null, isLate: false });
    const [checkOutModal, setCheckOutModal] = useState({ isOpen: false, visit: null, overtimeMinutes: 0 });
    const [absentModal, setAbsentModal] = useState({ isOpen: false, target: null });
    const [holidayModal, setHolidayModal] = useState({ isOpen: false, target: null });

    // ==========================================
    // 1. FETCH LIVE SCHEDULE
    // ==========================================
    const fetchSchedule = useCallback(async () => {
        try {
            const res = await api.get('/employee/my-schedule');
            if (res.data.success) {
                setAssignments(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch schedule", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize & Timer
    useEffect(() => {
        fetchSchedule();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchSchedule]);

    // ==========================================
    // 2. HELPERS & ACTIONS
    // ==========================================
    const openGoogleMaps = (coords) => {
        const [lng, lat] = coords;
        window.open(`http://maps.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    // Generic GPS wrapper for API calls
    const executeWithGPS = (actionFn) => {
        if (!navigator.geolocation) {
            return alert("GPS is not supported by your browser. Cannot verify location.");
        }
        setActionLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await actionFn(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.error("GPS Error", err);
                alert("Please enable GPS/Location Services to perform this action.");
                setActionLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    // --- Specific API Submissions ---
    const submitCheckIn = async (visitId, { lateReason, eventNote }) => {
        const visit = assignments.find(v => v.id === visitId);
        executeWithGPS(async (lat, lng) => {
            try {
                await axios.post('/api/employee/check-in', {
                    schoolId: visit.schoolId, band: visit.category,
                    latitude: lat, longitude: lng, lateReason, eventNote
                }, { headers: { Authorization: `Bearer ${token}` } });

                setCheckInModal({ isOpen: false, visit: null, isLate: false });
                fetchSchedule(); // Refresh to show Check Out button
            } catch (err) {
                alert(err.response?.data?.message || "Check-in failed. Are you within 100 meters?");
            } finally {
                setActionLoading(false);
            }
        });
    };

    const submitCheckOut = async (visitId, { overtimeReason }) => {
        const visit = assignments.find(v => v.id === visitId);
        executeWithGPS(async (lat, lng) => {
            try {
                await axios.post('/api/employee/check-out', {
                    schoolId: visit.schoolId, band: visit.category,
                    latitude: lat, longitude: lng, overtimeReason
                }, { headers: { Authorization: `Bearer ${token}` } });

                setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 });
                fetchSchedule(); // Refresh to remove card from dashboard
            } catch (err) {
                alert(err.response?.data?.message || "Check-out failed. Must be at school.");
            } finally {
                setActionLoading(false);
            }
        });
    };

    const submitStatus = async (target, statusType, reason) => {
        setActionLoading(true);
        try {
            const endpoint = target === 'ALL' ? '/api/employee/mark-day-status' : '/api/employee/mark-status';
            const payload = target === 'ALL'
                ? { status: statusType, reason }
                : { schoolId: target.schoolId, band: target.category, status: statusType, reason };

            await axios.post(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });

            if (statusType === 'Absent') setAbsentModal({ isOpen: false, target: null });
            if (statusType === 'Holiday') setHolidayModal({ isOpen: false, target: null });

            fetchSchedule(); // Refresh to remove card(s)
        } catch (err) {
            alert(err.response?.data?.message || `Failed to mark ${statusType}.`);
        } finally {
            setActionLoading(false);
        }
    };

    // ==========================================
    // 3. RENDER LOGIC
    // ==========================================
    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">Syncing live schedule...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 p-4 animate-fade-in">

            {/* Header & Global Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-muted-foreground mt-1">Here is your route for today.</p>
                </div>

                {assignments.length > 0 && (
                    <div className="flex gap-2">
                        <Button variant="outline" className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 flex-1 sm:flex-none" onClick={() => setHolidayModal({ isOpen: true, target: 'ALL' })}>
                            <CalendarX className="w-4 h-4 mr-2" /> Day Holiday
                        </Button>
                        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 flex-1 sm:flex-none" onClick={() => setAbsentModal({ isOpen: true, target: 'ALL' })}>
                            <UserX className="w-4 h-4 mr-2" /> Day Absent
                        </Button>
                    </div>
                )}
            </div>

            {/* Assignments List */}
            {assignments.length === 0 ? (
                /* --- NEW BEAUTIFUL "ALL CAUGHT UP" UI --- */
                <div className="bg-card border border-border rounded-3xl p-12 mt-8 shadow-sm text-center flex flex-col items-center relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-emerald-400 to-teal-500" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Animated Center Icon */}
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
                        <div className="relative w-full h-full bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center border-4 border-white dark:border-card shadow-sm z-10">
                            <PartyPopper className="w-10 h-10 text-emerald-500" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">Shift Complete!</h2>
                    <p className="text-muted-foreground mb-8 max-w-md text-lg">
                        Great job today, {user?.name?.split(' ')[0]}! You have successfully completed all your assigned school visits.
                    </p>

                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-5 py-2.5 rounded-full z-10 border border-emerald-500/20">
                        <Sparkles className="w-4 h-4" />
                        <span>Time to relax and recharge</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 mt-6">
                    {assignments.map((visit) => {
                        // Safe Time Parsing for the live timer
                        const [time, modifier] = visit.startTime.split(' ');
                        let [h, m] = time.split(':');
                        if (h === '12') h = '00';
                        if (modifier === 'PM') h = parseInt(h, 10) + 12;

                        const scheduledTimeDate = new Date();
                        scheduledTimeDate.setHours(h, m, 0, 0);

                        const diffMs = scheduledTimeDate - currentTime;
                        const isLateLive = diffMs < 0;
                        const diffMins = Math.abs(Math.floor(diffMs / 60000));
                        const diffHours = Math.floor(diffMins / 60);
                        const remainderMins = diffMins % 60;

                        // Formatting the timer text
                        let timerText = "";
                        if (diffHours > 0) timerText = `${diffHours}h ${remainderMins}m`;
                        else timerText = `${diffMins}m`;

                        const isPending = visit.status === 'pending';
                        const isActive = visit.status === 'checked_in';

                        return (
                            <div key={visit.id} className={`bg-card border rounded-2xl shadow-sm p-6 relative transition-all duration-300 ${isActive ? 'border-primary ring-1 ring-primary/20 scale-[1.01]' : 'border-border'}`}>

                                {/* Status Banner Line */}
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${isActive ? 'bg-emerald-500' : isLateLive ? 'bg-destructive' : 'bg-primary'}`} />

                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    {/* Left Info */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                                {visit.category}
                                            </span>
                                            {isActive && (
                                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Shift
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mt-3">
                                            <School className="w-5 h-5 text-muted-foreground" /> {visit.schoolName}
                                        </h2>
                                        <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1.5">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" /> {visit.address}
                                        </p>
                                    </div>

                                    {/* Right Timer / Time info */}
                                    <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-left md:text-right w-full md:w-auto min-w-35">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Schedule</p>
                                        <p className="text-base font-bold text-foreground">{visit.startTime} - {visit.endTime}</p>

                                        {/* Live Running Timer */}
                                        {isPending && (
                                            <p className={`text-sm font-bold mt-1.5 flex items-center md:justify-end gap-1 ${isLateLive ? 'text-destructive' : 'text-emerald-600'}`}>
                                                <Clock className="w-4 h-4" />
                                                {isLateLive ? `Late by ${timerText}` : `Starts in ${timerText}`}
                                            </p>
                                        )}
                                        {isActive && visit.overtimeMinutes > 0 && (
                                            <p className="text-sm font-bold mt-1.5 flex items-center md:justify-end gap-1 text-amber-500">
                                                <Clock className="w-4 h-4" /> Overtime: {visit.overtimeMinutes}m
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-border">
                                    <Button variant="outline" onClick={() => openGoogleMaps(visit.coordinates)} className="flex-1 sm:flex-none">
                                        <Navigation className="w-4 h-4 mr-2 text-primary" /> Maps
                                    </Button>

                                    <div className="flex-1 flex gap-3 justify-end">
                                        {isPending ? (
                                            <>
                                                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 font-semibold hidden sm:flex" onClick={() => setAbsentModal({ isOpen: true, target: visit })}>
                                                    Mark Absent
                                                </Button>
                                                <Button variant="ghost" className="text-amber-500 hover:bg-amber-500/10 font-semibold hidden sm:flex" onClick={() => setHolidayModal({ isOpen: true, target: visit })}>
                                                    Mark Holiday
                                                </Button>
                                                <Button className="flex-1 sm:flex-none bg-primary text-white shadow-glow px-8" onClick={() => setCheckInModal({ isOpen: true, visit, isLate: isLateLive })}>
                                                    <MapPin className="w-4 h-4 mr-2" /> Check In
                                                </Button>
                                            </>
                                        ) : (
                                            <Button className="flex-1 sm:flex-none bg-destructive hover:bg-destructive/90 text-white shadow-glow px-8" onClick={() => setCheckOutModal({ isOpen: true, visit, overtimeMinutes: visit.overtimeMinutes })}>
                                                <LogOut className="w-4 h-4 mr-2" /> Check Out
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
                onSubmit={(target, reason) => submitStatus(target, 'Absent', reason)}
                actionLoading={actionLoading}
            />

            <HolidayModal
                isOpen={holidayModal.isOpen}
                onClose={() => setHolidayModal({ isOpen: false, target: null })}
                target={holidayModal.target}
                onSubmit={(target, reason) => submitStatus(target, 'Holiday', reason)}
                actionLoading={actionLoading}
            />
        </div>
    );
};

export default EmployeeDashboard;