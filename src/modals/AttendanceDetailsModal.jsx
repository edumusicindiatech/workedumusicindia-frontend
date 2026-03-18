import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, X, CheckCircle2, AlertCircle, XCircle, Coffee } from "lucide-react";

const AttendanceDetailsModal = ({ selectedMonth, detailedRecords, onClose }) => {
    if (!selectedMonth) return null;

    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Late: 'bg-warning/10 text-warning border-warning/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Holiday: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        };
        return `px-2.5 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider border ${styles[status] || styles.Holiday}`;
    };

    const records = detailedRecords ? detailedRecords[selectedMonth.id] : [];

    const stats = {
        present: selectedMonth.present || 0,
        late: selectedMonth.late || 0,
        absent: selectedMonth.absent || 0,
        holidays: selectedMonth.holidays || 0
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-card z-10 flex items-center justify-between px-6 py-5 border-b border-border rounded-t-2xl shrink-0">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-primary" /> {selectedMonth.month}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Detailed attendance breakdown.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors self-start">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 md:gap-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
                            <span className="text-xl md:text-2xl font-bold text-emerald-500">{stats.present}</span>
                            <span className="text-[9px] md:text-xs font-bold text-emerald-600/80 uppercase tracking-wider mt-1">Present</span>
                        </div>
                        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <AlertCircle className="w-5 h-5 text-warning mb-1" />
                            <span className="text-xl md:text-2xl font-bold text-warning">{stats.late}</span>
                            <span className="text-[9px] md:text-xs font-bold text-warning/80 uppercase tracking-wider mt-1">Late</span>
                        </div>
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <XCircle className="w-5 h-5 text-destructive mb-1" />
                            <span className="text-xl md:text-2xl font-bold text-destructive">{stats.absent}</span>
                            <span className="text-[9px] md:text-xs font-bold text-destructive/80 uppercase tracking-wider mt-1">Absent</span>
                        </div>
                        <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <Coffee className="w-5 h-5 text-slate-500 mb-1" />
                            <span className="text-xl md:text-2xl font-bold text-slate-500">{stats.holidays}</span>
                            <span className="text-[9px] md:text-xs font-bold text-slate-500/80 uppercase tracking-wider mt-1">Holiday</span>
                        </div>
                    </div>

                    {/* Daily Records List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground mb-2 px-1">Daily Log</h3>
                        {records && records.length > 0 ? (
                            records.map((day, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/10 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <span className="font-bold w-[70px] md:w-32 text-sm md:text-base text-foreground">{day.date}</span>
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
                            <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                                No daily records found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-card p-4 md:p-6 border-t border-border flex justify-end rounded-b-2xl shrink-0">
                    <Button onClick={onClose} className="rounded-xl w-full md:w-auto shadow-glow">Close Overview</Button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetailsModal;