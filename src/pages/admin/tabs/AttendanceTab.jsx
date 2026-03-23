import { useState } from "react";
import { CalendarDays, ChevronRight, Clock, School } from "lucide-react";
import AdminAttendanceDetailsModal from "../../../modals/admin/AdminAttendanceDetailsModal";

const AttendanceTab = ({ attendanceData = [], employeeName = "Employee", assignments = [] }) => {
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
                    /* --- NEW PROACTIVE EMPTY STATE --- */
                    <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed border-border rounded-xl bg-muted/10">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <CalendarDays className="w-8 h-8 opacity-80" />
                        </div>

                        <h4 className="text-lg font-bold text-foreground mb-2">
                            No Attendance History Yet
                        </h4>

                        {assignments && assignments.length > 0 ? (
                            <div className="max-w-lg w-full mt-2">
                                <p className="text-sm text-muted-foreground mb-6">
                                    {employeeName} hasn't completed any shifts yet. Once they clock in, their reports will appear here. In the meantime, here is their expected schedule:
                                </p>

                                <div className="bg-background border border-border rounded-xl overflow-hidden text-left shadow-sm">
                                    <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-bold text-foreground">Upcoming Assignments</span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {assignments.map((assignment) => (
                                            <div key={assignment._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                                                <div>
                                                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                                                        <School className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {assignment.school?.schoolName || "Unknown School"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1 ml-5">
                                                        {assignment.category}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 sm:justify-end ml-5 sm:ml-0">
                                                    {assignment.allowedDays && assignment.allowedDays.length > 0 && (
                                                        <span className="px-2 py-1 bg-muted rounded-md border border-border/50 text-xs font-medium text-muted-foreground">
                                                            {assignment.allowedDays.join(', ')}
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-1 bg-primary/5 rounded-md border border-primary/20 text-xs font-semibold text-primary">
                                                        {assignment.startTime} - {assignment.endTime}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground max-w-sm mt-1">
                                This employee doesn't have any attendance records or active school assignments yet.
                            </p>
                        )}
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