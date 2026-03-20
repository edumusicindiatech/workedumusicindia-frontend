import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Eye, ChevronRight } from "lucide-react";
import AttendanceDetailsModal from "../../../modals/employee/AttendanceDetailsModal";

const AttendanceTab = ({ attendanceData }) => {
    const [selectedMonth, setSelectedMonth] = useState(null);

    return (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/20">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" /> Historical Attendance
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Select a month to view the detailed daily breakdown.</p>
            </div>

            <div className="p-0">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-3">Month</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceData.map((record) => (
                                <tr key={record.id} className="border-b border-border hover:bg-muted/30">
                                    <td className="px-6 py-4 font-medium">{record.month}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setSelectedMonth(record)}>
                                            <Eye className="w-3.5 h-3.5" /> View Details
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-3 md:hidden p-4">
                    {attendanceData.map((record) => (
                        <div key={record.id} onClick={() => setSelectedMonth(record)} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <CalendarDays className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-base text-foreground">{record.month}</span>
                                    <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Tap to view details</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                    ))}
                </div>
            </div>

            <AttendanceDetailsModal selectedMonth={selectedMonth} onClose={() => setSelectedMonth(null)} />
        </div>
    );
};

export default AttendanceTab;