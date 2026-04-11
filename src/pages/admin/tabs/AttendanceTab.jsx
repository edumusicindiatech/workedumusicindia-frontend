import { useState } from "react";
import { CalendarDays, ChevronRight, Clock, School, CalendarOff } from "lucide-react";
import AdminAttendanceDetailsModal from "../../../modals/admin/AdminAttendanceDetailsModal";
import { useTranslation } from "react-i18next"; 

// --- Helper function to convert 24h to 12h AM/PM format ---
const formatTime12Hour = (time) => {
    if (!time) return "";
    const [hourString, minute] = time.split(":");
    if (!hourString || !minute) return time;
    let hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 becomes 12
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    return `${formattedHour}:${minute} ${ampm}`;
};

const AttendanceTab = ({ attendanceData = [], employeeName = "Employee", assignments = [] }) => {
    const { t } = useTranslation(); 
    const [selectedMonthData, setSelectedMonthData] = useState(null);

    return (
        <div className="bg-card rounded-4xl shadow-sm border border-border overflow-hidden animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="p-5 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500/40 via-indigo-500 to-indigo-500/40" />
                <h3 className="text-xl font-extrabold flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <CalendarDays className="w-5 h-5 text-indigo-500 shrink-0" />
                    </div>
                    {t('attendance_tab.title', { name: employeeName })}
                </h3>
            </div>

            {/* --- MONTHLY ATTENDANCE LIST OR EMPTY STATE --- */}
            <div className="p-4 sm:p-6">
                {attendanceData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-2">
                        {attendanceData.map((data) => (
                            <div
                                key={data.id}
                                onClick={() => setSelectedMonthData(data)}
                                className="group relative rounded-3xl border p-5 sm:p-6 flex flex-col h-full transition-all duration-300 overflow-hidden bg-card border-border/60 hover:shadow-lg hover:border-indigo-500/40 lg:hover:-translate-y-1 cursor-pointer"
                            >
                                {/* Top Border Accent */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-indigo-500 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300 shadow-inner">
                                            <CalendarDays className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-lg sm:text-xl text-foreground group-hover:text-indigo-500 transition-colors">
                                                {data.month}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                                                {t('attendance_tab.tap_to_view', 'Tap to view records')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-indigo-500/10 group-hover:text-indigo-600 transition-colors shrink-0">
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* --- EMPTY STATE --- */
                    <div className="border border-dashed border-border/60 rounded-4xl p-10 sm:p-14 text-center flex flex-col items-center relative overflow-hidden group hover:bg-muted/5 transition-colors">
                        <div className="w-20 h-20 mb-5 relative">
                            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping opacity-50" />
                            <div className="relative w-full h-full bg-muted rounded-full flex items-center justify-center border-4 border-card shadow-sm z-10">
                                <CalendarOff className="w-8 h-8 text-indigo-500/70" />
                            </div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">
                            {t('attendance_tab.empty_title', 'No Attendance Records')}
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-sm text-sm sm:text-base">
                            {t('attendance_tab.empty_desc', { name: employeeName })}
                        </p>

                        {/* Shows Upcoming Assignments if they have any, otherwise a generic empty message */}
                        {assignments && assignments.length > 0 && (
                            <div className="w-full max-w-2xl mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-card border border-border/60 rounded-3xl overflow-hidden text-left shadow-lg">
                                    <div className="bg-muted/30 px-5 py-4 border-b border-border/60 flex items-center gap-2">
                                        <School className="w-5 h-5 text-primary" />
                                        <span className="text-sm font-bold text-foreground uppercase tracking-wider">
                                            {t('attendance_tab.upcoming_assignments', 'Upcoming Assigned Schools')}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-border/40">
                                        {assignments.map((assignment) => (
                                            <div key={assignment._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                                                <div>
                                                    <p className="font-extrabold text-foreground text-lg mb-1 leading-tight">
                                                        {assignment.school?.schoolName || t('attendance_tab.unknown_school')}
                                                    </p>
                                                    <p className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md inline-block uppercase tracking-wide">
                                                        {assignment.category}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                    {assignment.allowedDays && assignment.allowedDays.length > 0 && (
                                                        <span className="px-3 py-1.5 bg-muted rounded-xl border border-border/50 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                                            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                                                            {assignment.allowedDays.join(', ')}
                                                        </span>
                                                    )}
                                                    <span className="px-3 py-1.5 bg-muted rounded-xl border border-border/50 text-xs font-bold text-foreground flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                        {formatTime12Hour(assignment.startTime)} - {formatTime12Hour(assignment.endTime)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
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