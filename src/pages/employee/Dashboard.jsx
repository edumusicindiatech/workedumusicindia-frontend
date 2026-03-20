import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateLocation } from "../../store/slices/locationSlice";
import {
    MapPin, Clock, LogOut, Loader2,
    Navigation, School, CheckCircle2, Map,
    AlertTriangle, UserX
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Import Modals ---
import CheckInModal from "../../modals/CheckInModal";
import AbsentModal from "../../modals/AbsentModal";
import CheckOutModal from "../../modals/CheckOutModal"; // <-- NEW MODAL

// Helper to generate dynamic demo times
const getMockTime = (offsetMinutes) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + offsetMinutes);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const Dashboard = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const [actionLoading, setActionLoading] = useState(false);
    // Default to true for the demo so you don't have to clock in every time
    const [dayStarted, setDayStarted] = useState(true);

    // --- MOCK DATA: 4 SCHOOLS DESIGNED FOR ALL SCENARIOS ---
    const [scheduledVisits, setScheduledVisits] = useState(() => [
        {
            id: 'v1',
            schoolName: "Lincoln High School",
            category: "Junior Band",
            address: "123 Main St, Springfield",
            scheduledTime: getMockTime(-240), // 4 hours ago
            scheduledEndTime: getMockTime(-180),
            status: "completed",
            distance: "0.0 km"
        },
        {
            id: 'v2',
            schoolName: "Washington Middle School",
            category: "Senior Band",
            address: "456 Elm Ave, Springfield",
            scheduledTime: getMockTime(-120), // 2 hours ago
            scheduledEndTime: getMockTime(-25), // Ended 25 mins ago -> Triggers OVERTIME UI
            status: "checked_in", // Currently Active
            distance: "0.0 km"
        },
        {
            id: 'v3',
            schoolName: "Roosevelt Elementary",
            category: "Junior Band",
            address: "789 Pine Blvd, Springfield",
            scheduledTime: getMockTime(-130), // 2 hours 10 mins ago -> Triggers AUTO-ABSENT WARNING
            scheduledEndTime: getMockTime(-70),
            status: "pending",
            distance: "5.1 km"
        },
        {
            id: 'v4',
            schoolName: "Kennedy Magnet School",
            category: "Senior Band",
            address: "321 Oak Ln, Springfield",
            scheduledTime: getMockTime(60), // 1 hour from now -> Normal Pending State
            scheduledEndTime: getMockTime(120),
            status: "pending",
            distance: "8.8 km"
        }
    ]);

    // --- MODAL STATES ---
    const [checkInModal, setCheckInModal] = useState({ isOpen: false, visit: null, isLate: false });
    const [checkOutModal, setCheckOutModal] = useState({ isOpen: false, visit: null, overtimeMinutes: 0 });
    const [absentModal, setAbsentModal] = useState({ isOpen: false, target: null });

    // --- TIME CALCULATION HELPERS ---
    const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return new Date();
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const modifier = match[3].toUpperCase();
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
    };

    const getMinutesDiff = (targetTimeStr) => {
        const target = parseTime(targetTimeStr);
        const now = new Date();
        return Math.floor((now - target) / 60000);
    };

    // --- DERIVED STATE ---
    const totalVisits = scheduledVisits.length;
    const completedVisits = scheduledVisits.filter(v => v.status === 'completed' || v.status === 'absent').length;
    const pendingVisits = totalVisits - completedVisits;

    // --- ACTIONS ---
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

    const submitCheckIn = (visitId, { lateReason, eventNote, eventDate }) => {
        setActionLoading(true);

        // This log will prove to your client that the auto-date logic works!
        console.log("🚀 Payload ready for Backend:", {
            visitId,
            lateReason,
            eventNote,
            eventDate // Will be an ISO timestamp if eventNote is filled, otherwise null
        });

        setTimeout(() => {
            setScheduledVisits(prev => prev.map(v =>
                v.id === visitId ? { ...v, status: 'checked_in' } : v
            ));
            setCheckInModal({ isOpen: false, visit: null, isLate: false });
            setActionLoading(false);
        }, 1000);
    };

    const submitCheckOut = (visitId, { overtimeReason }) => {
        setActionLoading(true);
        console.log("Checkout details:", { visitId, overtimeReason });
        setTimeout(() => {
            setScheduledVisits(prev => prev.map(v =>
                v.id === visitId ? { ...v, status: 'completed' } : v
            ));
            setCheckOutModal({ isOpen: false, visit: null, overtimeMinutes: 0 });
            setActionLoading(false);
        }, 800);
    };

    const submitAbsent = (target, absentReason) => {
        setActionLoading(true);
        setTimeout(() => {
            if (target === 'ALL') {
                setScheduledVisits(prev => prev.map(v =>
                    v.status === 'pending' ? { ...v, status: 'absent' } : v
                ));
            } else {
                setScheduledVisits(prev => prev.map(v =>
                    v.id === target.id ? { ...v, status: 'absent' } : v
                ));
            }
            setAbsentModal({ isOpen: false, target: null });
            setActionLoading(false);
        }, 1000);
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20 relative">

            {/* 1. GLOBAL HEADER & ABSENT BUTTON */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                        Welcome, {user.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">Here is your schedule for today.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Button
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 h-12 rounded-xl"
                        onClick={() => setAbsentModal({ isOpen: true, target: 'ALL' })}
                    >
                        <UserX className="w-4 h-4 mr-2" /> Mark Day Absent
                    </Button>

                    <div className="bg-card border border-border rounded-xl px-5 py-3 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Map className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending Visits</p>
                            <p className="text-lg font-bold text-foreground leading-none">
                                {pendingVisits} <span className="text-sm font-medium text-muted-foreground">/ {totalVisits}</span>
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
            <div className="space-y-6">
                {scheduledVisits.map(visit => {
                    const isPending = visit.status === 'pending';
                    const isActive = visit.status === 'checked_in';
                    const isCompleted = visit.status === 'completed';
                    const isAbsent = visit.status === 'absent';

                    const minutesLate = isPending ? getMinutesDiff(visit.scheduledTime) : 0;
                    const overtimeMinutes = isActive ? getMinutesDiff(visit.scheduledEndTime) : 0;

                    return (
                        <div key={visit.id} className={`bg-card border rounded-2xl shadow-sm overflow-hidden relative transition-colors ${isActive ? 'border-primary ring-1 ring-primary/20 shadow-elevated' : isCompleted || isAbsent ? 'opacity-70 grayscale-[0.2]' : 'border-border'}`}>

                            {/* Header Banner */}
                            <div className={`h-2 w-full ${isActive ? 'bg-emerald-500' : isCompleted ? 'bg-muted-foreground' : isAbsent ? 'bg-destructive/50' : minutesLate >= 120 ? 'bg-destructive' : minutesLate > 0 ? 'bg-amber-500' : 'bg-primary'}`}></div>

                            <div className="p-6 md:p-8">

                                {/* Dynamic Warnings */}
                                {isPending && minutesLate >= 120 && (
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
                                            {isActive ? (
                                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Currently Active
                                                </span>
                                            ) : isCompleted ? (
                                                <span className="px-3 py-1 bg-muted text-muted-foreground border border-border rounded-full text-xs font-bold uppercase tracking-wide">
                                                    Completed
                                                </span>
                                            ) : isAbsent ? (
                                                <span className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                                    Absent
                                                </span>
                                            ) : null}

                                            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                                {visit.category}
                                            </span>
                                        </div>

                                        <div>
                                            <h2 className={`text-2xl font-bold flex items-center gap-2 ${isCompleted || isAbsent ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                <School className="w-6 h-6 text-muted-foreground" />
                                                {visit.schoolName}
                                            </h2>
                                            <p className="text-muted-foreground mt-1.5 flex items-start gap-2 text-sm">
                                                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                                {visit.address}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right Side: Times & Distance */}
                                    <div className="flex flex-col items-start md:items-end gap-3 bg-muted/30 p-4 rounded-xl border border-border/50 min-w-55">

                                        {isPending || isCompleted || isAbsent ? (
                                            <>
                                                <div className="space-y-0.5 w-full text-left md:text-right">
                                                    <p className="text-xs text-muted-foreground font-medium flex items-center md:justify-end gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" /> Scheduled Time
                                                    </p>
                                                    <p className={`font-bold text-lg ${minutesLate > 0 && isPending ? 'text-destructive' : 'text-foreground'}`}>
                                                        {visit.scheduledTime}
                                                    </p>
                                                    {minutesLate > 0 && isPending && (
                                                        <p className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded inline-block mt-1">
                                                            Late by {minutesLate} min
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
                                            </>
                                        ) : (
                                            <>
                                                <div className="space-y-0.5 w-full text-left md:text-right">
                                                    <p className="text-xs text-muted-foreground font-medium flex items-center md:justify-end gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" /> Scheduled End
                                                    </p>
                                                    <p className="font-bold text-foreground text-lg">{visit.scheduledEndTime}</p>
                                                </div>
                                                {overtimeMinutes > 0 && (
                                                    <div className="space-y-0.5 w-full text-left md:text-right mt-2">
                                                        <p className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded inline-block">
                                                            Overtime by {overtimeMinutes} min
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {(!isCompleted && !isAbsent) && (
                                    <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row justify-end gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => openDirections(visit.address)}
                                            className="h-12 rounded-xl"
                                        >
                                            <Navigation className="w-4 h-4 mr-2" /> Get Directions
                                        </Button>

                                        {isPending ? (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    className="h-12 rounded-xl text-destructive hover:bg-destructive/10"
                                                    onClick={() => setAbsentModal({ isOpen: true, target: visit })}
                                                >
                                                    Mark Absent
                                                </Button>
                                                <Button
                                                    disabled={!dayStarted}
                                                    onClick={() => setCheckInModal({ isOpen: true, visit: visit, isLate: minutesLate > 0 })}
                                                    className="h-12 rounded-xl px-8 shadow-glow"
                                                >
                                                    <MapPin className="w-4 h-4 mr-2" /> Check In
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                disabled={actionLoading}
                                                onClick={() => setCheckOutModal({ isOpen: true, visit, overtimeMinutes })}
                                                className="h-12 rounded-xl px-8 bg-destructive hover:bg-destructive/90 text-white shadow-glow"
                                            >
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                                                Check Out
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

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

        </div>
    );
};

export default Dashboard;