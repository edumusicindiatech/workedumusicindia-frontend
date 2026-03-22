import { useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import AdminAttendanceDetailsModal from "../../../modals/admin/AdminAttendanceDetailsModal";

const AttendanceTab = ({ attendanceData = [], employeeName = "Employee" }) => {
    const [selectedMonthData, setSelectedMonthData] = useState(null);

    return (
        <div className="bg-card rounded-xl shadow-card border border-border p-6 min-h-100">

            <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">
                    {employeeName}'s Monthly Reports
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Select a month to view visited schools.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendanceData.length > 0 ? (
                    attendanceData.map((data) => (
                        <div
                            key={data.id}
                            onClick={() => setSelectedMonthData(data)}
                            className="flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer group shadow-sm"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-base text-foreground">{data.month}</span>
                                    <span className="text-xs font-medium text-muted-foreground mt-0.5">Tap to view schools</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                        </div>
                    ))
                ) : (
                    <div className="col-span-1 md:col-span-2 p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                        No attendance records found for this employee.
                    </div>
                )}
            </div>

            <AdminAttendanceDetailsModal
                isOpen={!!selectedMonthData}
                monthData={selectedMonthData}
                employeeName={employeeName}
                onClose={() => setSelectedMonthData(null)}
            />
        </div>
    );
};

export default AttendanceTab;