import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, X } from "lucide-react";

const AttendanceDetailsModal = ({ selectedMonth, detailedRecords, onClose }) => {
    if (!selectedMonth) return null;

    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Late: 'bg-warning/10 text-warning border-warning/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Holiday: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        };
        return `px-2.5 py-1 rounded text-xs font-medium border ${styles[status] || styles.Holiday}`;
    };

    const records = detailedRecords[selectedMonth.id];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-border flex flex-col">

                <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-primary" /> {selectedMonth.month}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Detailed daily attendance record.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors self-start">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-3">
                        {records ? (
                            records.map((day, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium w-32">{day.date}</span>
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> {day.timeIn}
                                        </span>
                                    </div>
                                    <span className={getStatusBadge(day.status)}>
                                        {day.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Loading records...
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 bg-card p-6 border-t border-border flex justify-end rounded-b-2xl">
                    <Button onClick={onClose}>Close Overview</Button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetailsModal;