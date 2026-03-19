import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    CalendarDays, Clock, X, CheckCircle2, AlertCircle,
    XCircle, Coffee, School, ArrowLeft, ChevronRight,
    MessageSquareDashed, FileText, Download, Star,
    LogOut, ClipboardCheck, Users,
    Film
} from "lucide-react";

const AttendanceDetailsModal = ({ selectedMonth, onClose }) => {
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);

    // Reset selections if the month changes
    useEffect(() => {
        if (!selectedMonth) {
            setSelectedSchool(null);
            setSelectedCategory(null);
            setSelectedDay(null);
        }
    }, [selectedMonth]);

    if (!selectedMonth) return null;

    const handleClose = () => {
        setSelectedSchool(null);
        setSelectedCategory(null);
        setSelectedDay(null);
        onClose();
    };

    const handleBackNavigation = () => {
        if (selectedDay) {
            setSelectedDay(null);
        } else if (selectedCategory) {
            setSelectedCategory(null);
        } else if (selectedSchool) {
            setSelectedSchool(null);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Late: 'bg-warning/10 text-warning border-warning/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Event: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
            Holiday: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        };
        return `px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider border ${styles[status] || styles.Holiday}`;
    };

    // --- EXCEL EXPORT LOGIC ---
    const handleExportExcel = () => {
        if (!selectedMonth || !selectedMonth.schools) return;

        const headers = ["Month", "School Name", "Category", "Address", "Date", "Time In", "Time Out", "Status", "Teacher Note"];
        let rowsHtml = "";

        const escapeHtml = (text) => text?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || '';

        selectedMonth.schools.forEach(school => {
            const categories = school.categories || [
                { name: "Junior Band", records: school.records || [] },
                { name: "Senior Band", records: [] }
            ];

            categories.forEach(category => {
                if (category.records && category.records.length > 0) {
                    category.records.forEach(day => {
                        rowsHtml += `
                            <tr>
                                <td>${escapeHtml(selectedMonth.month)}</td>
                                <td>${escapeHtml(school.name)}</td>
                                <td>${escapeHtml(category.name)}</td>
                                <td>${escapeHtml(school.address)}</td>
                                <td>${escapeHtml(day.date)}</td>
                                <td>${escapeHtml(day.timeIn || "No Time")}</td>
                                <td>${escapeHtml(day.timeOut || "No Time")}</td>
                                <td>${escapeHtml(day.status)}</td>
                                <td>${escapeHtml(day.reason)}</td>
                            </tr>
                        `;
                    });
                }
            });
        });

        if (rowsHtml === "") {
            alert("No daily records found to export for this month.");
            return;
        }

        const tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8" />
                <style>
                    th { font-weight: bold; background-color: #f3f4f6; border: 1px solid #000000; text-align: left; padding: 5px; }
                    td { border: 1px solid #cccccc; padding: 5px; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedMonth.month}_Attendance_Report.xls`);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const displayCategories = selectedSchool?.categories || [
        {
            id: 'cat-1', name: 'Junior Band',
            stats: selectedSchool?.stats || { present: 0, late: 0, absent: 0, events: 0, holidays: 0, mediaSent: 0 },
            records: selectedSchool?.records || []
        },
        {
            id: 'cat-2', name: 'Senior Band',
            stats: { present: 0, late: 0, absent: 0, events: 0, holidays: 0, mediaSent: 0 },
            records: []
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 animate-in fade-in" onClick={handleClose}>
            <div className="bg-card w-full max-w-xl md:max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* --- HEADER --- */}
                <div className="bg-card z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-border rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {(selectedDay || selectedCategory || selectedSchool) ? (
                            <button
                                onClick={handleBackNavigation}
                                className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 hover:bg-muted rounded-full transition-colors active:scale-95 shrink-0"
                            >
                                <ArrowLeft className="w-5 h-5 text-foreground" />
                            </button>
                        ) : (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        )}
                        <div className="min-w-0 pr-2">
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                                {selectedDay ? "Daily Record Details"
                                    : selectedCategory ? selectedCategory.name
                                        : selectedSchool ? selectedSchool.name
                                            : selectedMonth.month}
                            </h2>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
                                {selectedDay ? `Viewing details for ${selectedDay.date}`
                                    : selectedCategory ? selectedSchool.name
                                        : selectedSchool ? "Select a band category"
                                            : "Select a school to view records"}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 sm:p-2 hover:bg-muted rounded-full transition-colors shrink-0 self-start">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* --- BODY CONTENT --- */}
                <div className="p-3 sm:p-4 md:p-6 overflow-y-auto flex-1 bg-muted/5 space-y-4 sm:space-y-6">

                    {/* VIEW 1: Schools Visited This Month */}
                    {!selectedSchool ? (
                        <div className="space-y-2.5 sm:space-y-3">
                            {selectedMonth.schools && selectedMonth.schools.length > 0 ? (
                                selectedMonth.schools.map((school) => (
                                    <div
                                        key={school.id}
                                        onClick={() => setSelectedSchool(school)}
                                        className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                <School className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm sm:text-base text-foreground truncate">{school.name}</span>
                                                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-0.5 truncate">
                                                    Tap to select a category
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-dashed border-border text-sm">
                                    No schools visited this month.
                                </div>
                            )}
                        </div>
                    ) :

                        /* VIEW 2: Select Category (Junior / Senior Band) */
                        !selectedCategory ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in slide-in-from-right-4 duration-300">
                                {displayCategories.map((category) => {
                                    const totalRecords = (category.stats?.present || 0) + (category.stats?.late || 0) + (category.stats?.absent || 0) + (category.stats?.events || 0) + (category.stats?.holidays || 0);

                                    return (
                                        <div
                                            key={category.id || category.name}
                                            onClick={() => setSelectedCategory(category)}
                                            className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center text-center active:scale-[0.98] group"
                                        >
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                                                <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                                            </div>
                                            <h4 className="font-bold text-sm sm:text-base md:text-lg text-foreground mb-1.5">{category.name}</h4>
                                            <span className="text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 sm:px-3 py-1 rounded-full">
                                                {totalRecords} Records
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) :

                            /* VIEW 3: Specific Category Stats & Daily Log */
                            !selectedDay ? (
                                <div className="space-y-5 sm:space-y-6 animate-in slide-in-from-right-4 duration-300">

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
                                        <div className="bg-card border border-emerald-500/20 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mb-1" />
                                            <span className="text-lg sm:text-xl font-bold text-emerald-500">{selectedCategory.stats?.present || 0}</span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-emerald-600/80 uppercase tracking-wider mt-1 truncate w-full">Present</span>
                                        </div>
                                        <div className="bg-card border border-warning/20 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning mb-1" />
                                            <span className="text-lg sm:text-xl font-bold text-warning">{selectedCategory.stats?.late || 0}</span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-warning/80 uppercase tracking-wider mt-1 truncate w-full">Late</span>
                                        </div>
                                        <div className="bg-card border border-destructive/20 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive mb-1" />
                                            <span className="text-lg sm:text-xl font-bold text-destructive">{selectedCategory.stats?.absent || 0}</span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-destructive/80 uppercase tracking-wider mt-1 truncate w-full">Absent</span>
                                        </div>
                                        <div className="bg-card border border-violet-500/20 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500 mb-1" />
                                            <span className="text-lg sm:text-xl font-bold text-violet-500">{selectedCategory.stats?.events || 0}</span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-violet-500/80 uppercase tracking-wider mt-1 truncate w-full">Event</span>
                                        </div>
                                        <div className="bg-card border border-slate-500/20 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 mb-1" />
                                            <span className="text-lg sm:text-xl font-bold text-slate-500">{selectedCategory.stats?.holidays || 0}</span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-500/80 uppercase tracking-wider mt-1 truncate w-full">Holiday</span>
                                        </div>
                                        <div className="bg-card border border-blue-500/20 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <Film className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mb-1" />
                                            <span className="text-lg sm:text-xl font-bold text-blue-500">{selectedCategory.stats?.mediaSent || 0}</span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-blue-500/80 uppercase tracking-wider mt-1 truncate w-full">Media</span>
                                        </div>
                                    </div>

                                    {/* Daily Records List */}
                                    <div className="space-y-2.5 sm:space-y-3">
                                        <h3 className="text-xs sm:text-sm font-bold text-foreground mb-1.5 sm:mb-2 px-1 uppercase tracking-wider">Log History</h3>
                                        {selectedCategory.records && selectedCategory.records.length > 0 ? (
                                            selectedCategory.records.map((day, idx) => {
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setSelectedDay(day)}
                                                        className="flex items-center justify-between p-3 sm:p-4 border rounded-xl bg-card transition-all border-border cursor-pointer hover:border-primary/50 hover:shadow-sm active:scale-[0.98] group"
                                                    >
                                                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                                            <span className="font-bold w-16 sm:w-24 md:w-32 text-[11px] sm:text-sm md:text-base text-foreground shrink-0 truncate">{day.date}</span>
                                                            <span className="text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                                                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {day.timeIn || "--:--"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                                            {day.dailyReport && (
                                                                <span className="flex items-center gap-1 text-[9px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold border border-blue-500/20 uppercase tracking-wider">
                                                                    <ClipboardCheck className="w-3 h-3" /> <span className="hidden sm:inline">Report</span>
                                                                </span>
                                                            )}
                                                            <span className={getStatusBadge(day.status)}>
                                                                {day.status}
                                                            </span>
                                                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="text-center py-6 sm:py-8 text-muted-foreground bg-card rounded-xl border border-dashed border-border text-[11px] sm:text-sm">
                                                No daily records found.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (

                                /* VIEW 4: Day Specific Reason View */
                                <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">

                                    {/* Status Card */}
                                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-5 sm:p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 w-full h-1 bg-linear-to-r from-transparent via-border to-transparent opacity-50"></div>
                                        <div className="mb-2 sm:mb-4">
                                            <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                        </div>
                                        <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">{selectedDay.date}</h3>

                                        {/* Time In and Time Out Row */}
                                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-4">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 bg-emerald-500/10 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full text-[10px] sm:text-sm font-semibold border border-emerald-500/20">
                                                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                                In: {selectedDay.timeIn || "--:--"}
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-rose-600 bg-rose-500/10 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full text-[10px] sm:text-sm font-semibold border border-rose-500/20">
                                                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                                                Out: {selectedDay.timeOut || "--:--"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Cards Container */}
                                    <div className="space-y-4 sm:space-y-6 flex-1 flex flex-col">

                                        {/* Reason Card */}
                                        {(selectedDay.reason || !selectedDay.dailyReport) && (
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <h3 className="text-xs sm:text-sm font-bold text-foreground px-1 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                                                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Teacher's Note
                                                </h3>

                                                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-center min-h-25 sm:min-h-35">
                                                    {selectedDay.reason ? (
                                                        <p className="text-sm sm:text-base md:text-lg text-foreground/90 italic leading-relaxed text-center font-medium">
                                                            "{selectedDay.reason}"
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 sm:gap-3">
                                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted/50 flex items-center justify-center mb-1">
                                                                <MessageSquareDashed className="w-5 h-5 sm:w-6 sm:h-6 opacity-50" />
                                                            </div>
                                                            <p className="text-[11px] sm:text-sm font-medium text-center leading-snug">No additional notes or reasons<br />provided for this date.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Daily Report Card */}
                                        {selectedDay.dailyReport && (
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <h3 className="text-xs sm:text-sm font-bold text-blue-500 px-1 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                                                    <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Daily Report
                                                </h3>

                                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
                                                    <p className="text-xs sm:text-sm md:text-base text-foreground/90 leading-relaxed font-medium whitespace-pre-wrap">
                                                        {selectedDay.dailyReport}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}
                </div>

                {/* --- FOOTER --- */}
                <div className="bg-card p-3 sm:p-4 md:p-6 border-t border-border flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 rounded-b-2xl shrink-0">
                    {/* Show Export only at the Schools List Level (Month Selected, no School Selected) */}
                    {!selectedSchool && (
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            className="rounded-lg sm:rounded-xl w-full sm:w-auto font-bold tracking-wide flex items-center justify-center gap-2 border-primary/20 hover:bg-primary/5 text-primary text-xs sm:text-sm h-9 sm:h-11"
                        >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Export Excel
                        </Button>
                    )}
                    <Button onClick={handleClose} className="rounded-lg sm:rounded-xl w-full sm:w-auto font-bold tracking-wide text-xs sm:text-sm h-9 sm:h-11">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetailsModal;