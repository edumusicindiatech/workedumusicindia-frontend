import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateLocation } from "../../store/slices/locationSlice";
import {
    MapPin, Clock, LogOut, Loader2,
    Navigation, School, CheckCircle2, Map,
    AlertTriangle, UserX, CalendarX, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Import Modals ---
import CheckInModal from "../../modals/employee/CheckInModal";
import AbsentModal from "../../modals/employee/AbsentModal";
import CheckOutModal from "../../modals/employee/CheckOutModal";
import HolidayModal from "../../modals/employee/HolidayModal";

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
    const [dayStarted, setDayStarted] = useState(true);

    // --- DEMO MODE TOGGLE ---
    const [isDemoMode, setIsDemoMode] = useState(true);

    // --- MOCK DATA: 8 SCHOOLS DESIGNED FOR EVERY SCENARIO ---
    const [scheduledVisits, setScheduledVisits] = useState(() => [
        {
            id: 'v1',
            schoolName: "Future Tech High",
            category: "Junior Band", // Fixed
            address: "101 Future Way",
            scheduledTime: getMockTime(60), // 1 hour from now (Normal Pending)
            scheduledEndTime: getMockTime(120),
            status: "pending",
            distance: "3.2 km"
        },
        {
            id: 'v2',
            schoolName: "Washington Middle",
            category: "Senior Band", // Fixed
            address: "202 Elm Street",
            scheduledTime: getMockTime(-30), // 30 mins ago (Slightly Late)
            scheduledEndTime: getMockTime(60),
            status: "pending",
            distance: "1.5 km"
        },
        {
            id: 'v3',
            schoolName: "Roosevelt Elementary",
            category: "Junior Band", // Fixed
            address: "303 Pine Blvd",
            scheduledTime: getMockTime(-150), // 2.5 hours ago (Severe Late Warning)
            scheduledEndTime: getMockTime(30),
            status: "pending",
            distance: "5.1 km"
        },
        {
            id: 'v4',
            schoolName: "Jefferson Magnet",
            category: "Senior Band", // Fixed
            address: "404 Oak Lane",
            scheduledTime: getMockTime(-120),
            scheduledEndTime: getMockTime(45), // Ends in 45 mins (Currently Active)
            status: "checked_in",
            distance: "0.0 km"
        },
        {
            id: 'v5',
            schoolName: "Adams Arts School",
            category: "Junior Band", // Fixed
            address: "505 Maple Ave",
            scheduledTime: getMockTime(-180),
            scheduledEndTime: getMockTime(-25), // Ended 25 mins ago (Active Overtime)
            status: "checked_in",
            distance: "0.0 km"
        },
        {
            id: 'v6',
            schoolName: "Lincoln High School",
            category: "Senior Band", // Fixed
            address: "123 Main St",
            scheduledTime: getMockTime(-240),
            scheduledEndTime: getMockTime(-180),
            status: "completed", // Completed
            distance: "0.0 km"
        },
        {
            id: 'v7',
            schoolName: "Monroe Science Acad",
            category: "Junior Band", // Fixed
            address: "606 Cedar Rd",
            scheduledTime: getMockTime(-300),
            scheduledEndTime: getMockTime(-240),
            status: "absent", // Marked Absent
            distance: "0.0 km"
        },
        {
            id: 'v8',
            schoolName: "Jackson Sports College",
            category: "Senior Band", // Fixed
            address: "707 Birch St",
            scheduledTime: getMockTime(-360),
            scheduledEndTime: getMockTime(-300),
            status: "holiday", // Marked Holiday
            distance: "0.0 km"
        }
    ]);

    // --- MODAL STATES ---
    const [checkInModal, setCheckInModal] = useState({ isOpen: false, visit: null, isLate: false });
    const [checkOutModal, setCheckOutModal] = useState({ isOpen: false, visit: null, overtimeMinutes: 0 });
    const [absentModal, setAbsentModal] = useState({ isOpen: false, target: null });
    const [holidayModal, setHolidayModal] = useState({ isOpen: false, target: null });

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

    // --- MAGIC FILTER ---
    const visibleVisits = scheduledVisits.filter(visit => {
        // Bypass filter if Demo Mode is ON so client sees everything
        if (isDemoMode) return true;

        // 1. Remove if completed, absent, or marked holiday
        if (visit.status === 'completed' || visit.status === 'absent' || visit.status === 'holiday') return false;

        // 2. Remove if pending but the scheduled end time has already passed (Expired)
        if (visit.status === 'pending') {
            const minutesPastEnd = getMinutesDiff(visit.scheduledEndTime);
            if (minutesPastEnd > 0) return false;
        }

        return true;
    });

    const totalVisits = scheduledVisits.length;
    const pendingVisits = visibleVisits.filter(v => v.status === 'pending' || v.status === 'checked_in').length;

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

    const submitHoliday = (target, holidayReason) => {
        setActionLoading(true);
        setTimeout(() => {
            setScheduledVisits(prev => prev.map(v =>
                (target === 'ALL' || v.id === target.id) && v.status === 'pending' ? { ...v, status: 'holiday' } : v
            ));
            setHolidayModal({ isOpen: false, target: null });
            setActionLoading(false);
        }, 1000);
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20 relative px-2 sm:px-0">

            {/* 1. GLOBAL HEADER & BUTTONS */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                        Welcome, {user.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">Here is your schedule for today.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

                    {/* DEMO MODE TOGGLE FOR CLIENT PRESENTATION */}
                    <Button
                        variant="outline"
                        className={`h-12 rounded-xl transition-all ${isDemoMode ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                        onClick={() => setIsDemoMode(!isDemoMode)}
                    >
                        {isDemoMode ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                        {isDemoMode ? 'Demo Mode: ON' : 'Demo Mode: OFF'}
                    </Button>

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

            {/* 3. SCHEDULED VISITS LIST (OR EMPTY STATE) */}
            {visibleVisits.length === 0 ? (

                /* ALL CAUGHT UP STATE */
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
                        const isCompleted = visit.status === 'completed';
                        const isAbsent = visit.status === 'absent';
                        const isHoliday = visit.status === 'holiday';

                        const minutesLate = isPending ? getMinutesDiff(visit.scheduledTime) : 0;
                        const overtimeMinutes = isActive ? getMinutesDiff(visit.scheduledEndTime) : 0;

                        return (
                            <div key={visit.id} className={`bg-card border rounded-2xl shadow-sm overflow-hidden relative transition-colors 
                                ${isActive ? 'border-primary ring-1 ring-primary/20 shadow-elevated' : 'border-border'}
                                ${isCompleted || isAbsent || isHoliday ? 'opacity-70 grayscale-[0.2]' : ''}
                            `}>

                                {/* Header Banner */}
                                <div className={`h-2 w-full 
                                    ${isActive ? 'bg-emerald-500' :
                                        isCompleted ? 'bg-muted-foreground' :
                                            isAbsent ? 'bg-destructive/50' :
                                                isHoliday ? 'bg-amber-500/50' :
                                                    minutesLate >= 120 ? 'bg-destructive' :
                                                        minutesLate > 0 ? 'bg-amber-500' : 'bg-primary'}
                                `}></div>

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
                                                ) : isHoliday ? (
                                                    <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                                        Holiday
                                                    </span>
                                                ) : null}

                                                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                                    {visit.category}
                                                </span>
                                            </div>

                                            <div>
                                                <h2 className={`text-2xl font-bold flex items-center gap-2 ${isCompleted || isAbsent || isHoliday ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
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

                                            {isPending || isCompleted || isAbsent || isHoliday ? (
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
                                    {(!isCompleted && !isAbsent && !isHoliday) && (
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
                                                        onClick={() => setCheckInModal({ isOpen: true, visit: visit, isLate: minutesLate > 0 })}
                                                        className="h-12 rounded-xl px-8 shadow-glow w-full sm:w-auto"
                                                    >
                                                        <MapPin className="w-4 h-4 mr-2" /> Check In
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    disabled={actionLoading}
                                                    onClick={() => setCheckOutModal({ isOpen: true, visit, overtimeMinutes })}
                                                    className="h-12 rounded-xl px-8 bg-destructive hover:bg-destructive/90 text-white shadow-glow w-full sm:w-auto"
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

export default Dashboard;