import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, X, CheckCircle2, AlertCircle, XCircle, Coffee, School, ArrowLeft, ChevronRight } from "lucide-react";

const AttendanceDetailsModal = ({ selectedMonth, onClose }) => {
    // Tracks which school the user clicked on inside the selected month
    const [selectedSchool, setSelectedSchool] = useState(null);

    // Reset school selection if the month changes or modal closes
    useEffect(() => {
        if (!selectedMonth) setSelectedSchool(null);
    }, [selectedMonth]);

    if (!selectedMonth) return null;

    const handleClose = () => {
        setSelectedSchool(null);
        onClose();
    };

    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Late: 'bg-warning/10 text-warning border-warning/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Holiday: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        };
        return `px-2.5 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider border ${styles[status] || styles.Holiday}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={handleClose}>
            <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* --- HEADER --- */}
                <div className="bg-card z-10 flex items-center justify-between px-6 py-5 border-b border-border rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Dynamic back button or Icon based on view */}
                        {selectedSchool ? (
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
                                {selectedSchool ? selectedSchool.name : selectedMonth.month}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                {selectedSchool ? selectedSchool.address : "Select a school to view records"}
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
                                                    Tap to view {school.stats.present + school.stats.late + school.stats.absent} records
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
                    ) : (
                        /* VIEW 2: Specific School Stats & Daily Log */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-4 gap-2 md:gap-4">
                                <div className="bg-card border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
                                    <span className="text-xl md:text-2xl font-bold text-emerald-500">{selectedSchool.stats.present}</span>
                                    <span className="text-[9px] md:text-xs font-bold text-emerald-600/80 uppercase tracking-wider mt-1">Present</span>
                                </div>
                                <div className="bg-card border border-warning/20 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <AlertCircle className="w-5 h-5 text-warning mb-1" />
                                    <span className="text-xl md:text-2xl font-bold text-warning">{selectedSchool.stats.late}</span>
                                    <span className="text-[9px] md:text-xs font-bold text-warning/80 uppercase tracking-wider mt-1">Late</span>
                                </div>
                                <div className="bg-card border border-destructive/20 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <XCircle className="w-5 h-5 text-destructive mb-1" />
                                    <span className="text-xl md:text-2xl font-bold text-destructive">{selectedSchool.stats.absent}</span>
                                    <span className="text-[9px] md:text-xs font-bold text-destructive/80 uppercase tracking-wider mt-1">Absent</span>
                                </div>
                                <div className="bg-card border border-slate-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                    <Coffee className="w-5 h-5 text-slate-500 mb-1" />
                                    <span className="text-xl md:text-2xl font-bold text-slate-500">{selectedSchool.stats.holidays}</span>
                                    <span className="text-[9px] md:text-xs font-bold text-slate-500/80 uppercase tracking-wider mt-1">Holiday</span>
                                </div>
                            </div>

                            {/* Daily Records List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-foreground mb-2 px-1 uppercase tracking-wider">Log History</h3>
                                {selectedSchool.records && selectedSchool.records.length > 0 ? (
                                    selectedSchool.records.map((day, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 transition-colors shadow-sm">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <span className="font-bold w-22.5 md:w-32 text-sm md:text-base text-foreground">{day.date}</span>
                                                <span className="text-[11px] md:text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {day.timeIn}
                                                </span>
                                            </div>
                                            <span className={getStatusBadge(day.status)}>
                                                {day.status}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                                        No daily records found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- FOOTER --- */}
                <div className="bg-card p-4 md:p-6 border-t border-border flex justify-end rounded-b-2xl shrink-0">
                    <Button onClick={handleClose} className="rounded-xl w-full md:w-auto font-bold tracking-wide">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetailsModal;