import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    CalendarDays, Clock, X, CheckCircle2, AlertCircle,
    XCircle, Coffee, School, ArrowLeft, ChevronRight,
    MessageSquareDashed, FileText, Download, Star
} from "lucide-react";

const AttendanceDetailsModal = ({ selectedMonth, onClose }) => {
    // Tracks which school the user clicked on inside the selected month
    const [selectedSchool, setSelectedSchool] = useState(null);
    // Tracks which specific day the user clicked on to view the reason
    const [selectedDay, setSelectedDay] = useState(null);

    // Reset selections if the month changes
    useEffect(() => {
        if (!selectedMonth) {
            setSelectedSchool(null);
            setSelectedDay(null);
        }
    }, [selectedMonth]);

    if (!selectedMonth) return null;

    const handleClose = () => {
        setSelectedSchool(null);
        setSelectedDay(null);
        onClose();
    };

    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Late: 'bg-warning/10 text-warning border-warning/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Event: 'bg-violet-500/10 text-violet-500 border-violet-500/20', // New Event Style
            Holiday: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        };
        return `px-2.5 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider border ${styles[status] || styles.Holiday}`;
    };

    // --- CSV / EXCEL EXPORT LOGIC ---
    const handleExportExcel = () => {
        if (!selectedMonth || !selectedMonth.schools) return;

        // 1. Define Headers
        const headers = ["Month", "School Name", "Address", "Date", "Time In", "Status", "Teacher Note"];
        const rows = [];

        // 2. Loop through schools and their records to build the rows
        selectedMonth.schools.forEach(school => {
            if (school.records && school.records.length > 0) {
                school.records.forEach(day => {
                    // Clean strings to prevent CSV format breaking (escaping quotes/commas)
                    const cleanName = `"${school.name?.replace(/"/g, '""') || ''}"`;
                    const cleanAddress = `"${school.address?.replace(/"/g, '""') || ''}"`;
                    const cleanReason = `"${day.reason?.replace(/"/g, '""') || ''}"`;

                    rows.push([
                        selectedMonth.month,
                        cleanName,
                        cleanAddress,
                        day.date,
                        day.timeIn || "No Time",
                        day.status,
                        cleanReason
                    ].join(","));
                });
            }
        });

        // 3. Create the file and trigger download
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedMonth.month}_Attendance_Report.csv`);
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in" onClick={handleClose}>
            <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* --- HEADER --- */}
                <div className="bg-card z-10 flex items-center justify-between px-6 py-5 border-b border-border rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Dynamic back button or Icon based on view depth */}
                        {selectedDay ? (
                            <button
                                onClick={() => setSelectedDay(null)}
                                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5 text-foreground" />
                            </button>
                        ) : selectedSchool ? (
                            <button
                                onClick={() => setSelectedSchool(null)}
                                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5 text-foreground" />
                            </button>
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-foreground">
                                {selectedDay ? "Daily Record Details" : selectedSchool ? selectedSchool.name : selectedMonth.month}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                {selectedDay ? `Viewing details for ${selectedDay.date}` : selectedSchool ? selectedSchool.address : "Select a school to view records"}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0 self-start">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* --- BODY CONTENT --- */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-muted/5 space-y-6">

                    {!selectedSchool ? (
                        /* VIEW 1: Schools Visited This Month */
                        <div className="space-y-3">
                            {selectedMonth.schools && selectedMonth.schools.length > 0 ? (
                                selectedMonth.schools.map((school) => (
                                    <div
                                        key={school.id}
                                        onClick={() => setSelectedSchool(school)}
                                        className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                <School className="w-6 h-6" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-base text-foreground truncate">{school.name}</span>
                                                <span className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                                                    Tap to view {(school.stats.present || 0) + (school.stats.late || 0) + (school.stats.absent || 0) + (school.stats.events || 0) + (school.stats.holidays || 0)} records
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                                    No schools visited this month.
                                </div>
                            )}
                        </div>
                    ) : !selectedDay ? (
                        /* VIEW 2: Specific School Stats & Daily Log */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Stats Grid - Updated to grid-cols-5 for the new Event metric */}
                            <div className="grid grid-cols-5 gap-1.5 md:gap-3">
                                <div className="bg-card border border-emerald-500/20 rounded-xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 mb-1" />
                                    <span className="text-lg md:text-2xl font-bold text-emerald-500">{selectedSchool.stats.present || 0}</span>
                                    <span className="text-[8px] md:text-xs font-bold text-emerald-600/80 uppercase tracking-wider mt-1 truncate w-full">Present</span>
                                </div>
                                <div className="bg-card border border-warning/20 rounded-xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-warning mb-1" />
                                    <span className="text-lg md:text-2xl font-bold text-warning">{selectedSchool.stats.late || 0}</span>
                                    <span className="text-[8px] md:text-xs font-bold text-warning/80 uppercase tracking-wider mt-1 truncate w-full">Late</span>
                                </div>
                                <div className="bg-card border border-destructive/20 rounded-xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <XCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive mb-1" />
                                    <span className="text-lg md:text-2xl font-bold text-destructive">{selectedSchool.stats.absent || 0}</span>
                                    <span className="text-[8px] md:text-xs font-bold text-destructive/80 uppercase tracking-wider mt-1 truncate w-full">Absent</span>
                                </div>
                                {/* New Event Stat Block */}
                                <div className="bg-card border border-violet-500/20 rounded-xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <Star className="w-4 h-4 md:w-5 md:h-5 text-violet-500 mb-1" />
                                    <span className="text-lg md:text-2xl font-bold text-violet-500">{selectedSchool.stats.events || 0}</span>
                                    <span className="text-[8px] md:text-xs font-bold text-violet-500/80 uppercase tracking-wider mt-1 truncate w-full">Event</span>
                                </div>
                                <div className="bg-card border border-slate-500/20 rounded-xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <Coffee className="w-4 h-4 md:w-5 md:h-5 text-slate-500 mb-1" />
                                    <span className="text-lg md:text-2xl font-bold text-slate-500">{selectedSchool.stats.holidays || 0}</span>
                                    <span className="text-[8px] md:text-xs font-bold text-slate-500/80 uppercase tracking-wider mt-1 truncate w-full">Holiday</span>
                                </div>
                            </div>

                            {/* Daily Records List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-foreground mb-2 px-1 uppercase tracking-wider">Log History</h3>
                                {selectedSchool.records && selectedSchool.records.length > 0 ? (
                                    selectedSchool.records.map((day, idx) => {
                                        // Added 'Event' to the clickable statuses
                                        const isClickable = ['Late', 'Absent', 'Event', 'Holiday'].includes(day.status);

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => isClickable && setSelectedDay(day)}
                                                className={`flex items-center justify-between p-4 border rounded-xl bg-card transition-all
                                                    ${isClickable
                                                        ? 'border-border cursor-pointer hover:border-primary/50 hover:shadow-sm active:scale-[0.98]'
                                                        : 'border-transparent shadow-sm hover:bg-muted/30'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <span className="font-bold w-22 md:w-32 text-sm md:text-base text-foreground">{day.date}</span>
                                                    <span className="text-[11px] md:text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" /> {day.timeIn || "--:--"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <span className={getStatusBadge(day.status)}>
                                                        {day.status}
                                                    </span>
                                                    {/* Show a subtle arrow to indicate clickability for specific statuses */}
                                                    {isClickable && (
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                                        No daily records found.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* VIEW 3: Day Specific Reason View */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">

                            {/* Status Card */}
                            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 w-full h-1 bg-linear-to-r from-transparent via-border to-transparent opacity-50"></div>
                                <div className="mb-4">
                                    <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{selectedDay.date}</h3>
                                <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full text-sm font-medium">
                                    <Clock className="w-4 h-4" />
                                    Logged at {selectedDay.timeIn || "No Time Logged"}
                                </div>
                            </div>

                            {/* Reason Card */}
                            <div className="space-y-2 flex-1 flex flex-col">
                                <h3 className="text-sm font-bold text-foreground px-1 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Teacher's Note
                                </h3>

                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-center min-h-40">
                                    {selectedDay.reason ? (
                                        <p className="text-base md:text-lg text-foreground/90 italic leading-relaxed text-center font-medium">
                                            "{selectedDay.reason}"
                                        </p>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-1">
                                                <MessageSquareDashed className="w-6 h-6 opacity-50" />
                                            </div>
                                            <p className="text-sm font-medium text-center">No additional notes or reasons<br />provided for this date.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- FOOTER --- */}
                <div className="bg-card p-4 md:p-6 border-t border-border flex justify-end gap-3 rounded-b-2xl shrink-0">
                    {/* Only show Export button on the Main Month view */}
                    {!selectedSchool && (
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            className="rounded-xl w-full md:w-auto font-bold tracking-wide flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                        >
                            <Download className="w-4 h-4" />
                            Export Excel
                        </Button>
                    )}
                    <Button onClick={handleClose} className="rounded-xl w-full md:w-auto font-bold tracking-wide">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetailsModal;