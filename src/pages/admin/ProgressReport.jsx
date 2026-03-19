import { useState } from "react";
import {
    ChevronRight, ArrowLeft, TrendingUp, Search, UserCircle2,
    CheckCircle2, AlertCircle, XCircle, Star, Coffee, Film, CalendarDays,
    Clock, FileText, MessageSquareDashed, School, Download, Trophy
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// --- MOCK DATA ---
const mockTeachers = [
    { id: 1, name: "Sarah Johnson", role: "Field Officer", zone: "Zone A", score: 98, rank: 1 },
    { id: 2, name: "Michael Chen", role: "Senior Teacher", zone: "Zone B", score: 92, rank: 2 },
    { id: 3, name: "Emma Davis", role: "Field Officer", zone: "Zone C", score: 85, rank: 3 },
    { id: 4, name: "David Miller", role: "Field Officer", zone: "Zone A", score: 78, rank: 4 },
];

const mockProgressData = {
    1: [ // Sarah's Data
        {
            id: 'm1', month: "March 2024",
            schools: [
                {
                    id: 101, name: "Lincoln High School", address: "123 Main St",
                    stats: { present: 12, late: 2, absent: 1, events: 3, holidays: 2, mediaSent: 15 },
                    records: [
                        { date: 'Mar 15, 2024 (Fri)', status: 'Present', timeIn: '08:00 AM' },
                        { date: 'Mar 12, 2024 (Tue)', status: 'Late', timeIn: '08:45 AM', reason: 'Heavy traffic on Main St.' },
                        { date: 'Mar 10, 2024 (Sun)', status: 'Holiday', timeIn: '-', reason: '' },
                        { date: 'Mar 08, 2024 (Fri)', status: 'Event', timeIn: '07:30 AM', reason: 'Annual Science Fair preparation.' },
                        { date: 'Mar 05, 2024 (Tue)', status: 'Absent', timeIn: '-', reason: 'Personal medical emergency.' }
                    ]
                },
                {
                    id: 102, name: "Washington Elementary", address: "456 Oak Ave",
                    stats: { present: 10, late: 0, absent: 0, events: 0, holidays: 0, mediaSent: 0 },
                    records: [
                        { date: 'Mar 14, 2024 (Thu)', status: 'Present', timeIn: '07:55 AM' },
                    ]
                }
            ]
        },
        {
            id: 'm2', month: "February 2024",
            schools: [
                {
                    id: 101, name: "Lincoln High School", address: "123 Main St",
                    stats: { present: 19, late: 1, absent: 0, events: 1, holidays: 8, mediaSent: 8 },
                    records: [
                        { date: 'Feb 20, 2024 (Tue)', status: 'Present', timeIn: '07:50 AM' },
                        { date: 'Feb 15, 2024 (Thu)', status: 'Late', timeIn: '08:30 AM', reason: 'Bus breakdown.' },
                    ]
                }
            ]
        },
    ],
    2: [ // Michael's Data
        {
            id: 'm1', month: "March 2024",
            schools: [
                {
                    id: 103, name: "Roosevelt Middle", address: "789 Pine Ln",
                    stats: { present: 25, late: 0, absent: 0, events: 2, holidays: 4, mediaSent: 32 },
                    records: []
                }
            ]
        },
    ],
    3: [ // Emma's Data
        {
            id: 'm1', month: "March 2024",
            schools: []
        },
    ]
};

const ProgressReport = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);

    // Filter teachers based on search and sort by rank
    const filteredTeachers = mockTeachers
        .filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.zone.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.rank - b.rank);

    // Navigation Handlers
    const handleBackNavigation = () => {
        if (selectedDay) {
            setSelectedDay(null); // Go back to School Stats
        } else if (selectedSchool) {
            setSelectedSchool(null); // Go back to Schools List
        } else if (selectedMonth) {
            setSelectedMonth(null); // Go back to Months List
        } else if (selectedTeacher) {
            setSelectedTeacher(null); // Go back to Teacher List
        }
    };

    // Styling Helper for Badges
    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Late: 'bg-warning/10 text-warning border-warning/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Event: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
            Holiday: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        };
        return `px-2.5 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider border ${styles[status] || styles.Holiday}`;
    };

    // Excel Export Logic
    const handleExportExcel = () => {
        if (!selectedMonth || !selectedMonth.schools || !selectedTeacher) return;

        const headers = ["Teacher", "Month", "School Name", "Address", "Date", "Time In", "Status", "Teacher Note"];
        const rows = [];

        selectedMonth.schools.forEach(school => {
            if (school.records && school.records.length > 0) {
                school.records.forEach(day => {
                    const cleanName = `"${school.name?.replace(/"/g, '""') || ''}"`;
                    const cleanAddress = `"${school.address?.replace(/"/g, '""') || ''}"`;
                    const cleanReason = `"${day.reason?.replace(/"/g, '""') || ''}"`;
                    const cleanTeacher = `"${selectedTeacher.name}"`;

                    rows.push([
                        cleanTeacher,
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

        if (rows.length === 0) {
            alert("No daily records found to export for this month.");
            return;
        }

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedTeacher.name}_${selectedMonth.month}_Report.csv`);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-300 pb-24 md:pb-8">

            {/* --- HEADER --- */}
            <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Progress Reports</h1>
                </div>
                <p className="text-muted-foreground text-sm">Track monthly attendance and media activity across your workforce.</p>
            </div>

            {/* --- BREADCRUMB / BACK NAVIGATION --- */}
            {(selectedTeacher || selectedMonth || selectedSchool || selectedDay) && (
                <button
                    onClick={handleBackNavigation}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors font-medium text-sm w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {selectedDay ? `Back to ${selectedSchool.name} Overview`
                        : selectedSchool ? `Back to ${selectedMonth.month} Schools`
                            : selectedMonth ? `Back to ${selectedTeacher.name}'s Months`
                                : "Back to Teacher List"}
                </button>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="bg-card rounded-2xl shadow-card border border-border min-h-125 overflow-hidden flex flex-col">

                {/* Dynamic Header */}
                <div className="p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            {!selectedTeacher ? "Workforce Rankings"
                                : !selectedMonth ? `${selectedTeacher.name}'s Monthly Reports`
                                    : !selectedSchool ? `Schools Visited in ${selectedMonth.month}`
                                        : selectedDay ? `Daily Record Details`
                                            : `${selectedSchool.name} Overview`}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {!selectedTeacher ? "Search and select an employee to view their progress history."
                                : !selectedMonth ? "Select a month to view visited schools."
                                    : !selectedSchool ? `Overview for ${selectedTeacher.name}`
                                        : selectedDay ? `Viewing details for ${selectedDay.date}`
                                            : "A comprehensive breakdown of attendance and media activity."}
                        </p>
                    </div>

                    {/* Export Button only visible at the Schools List (Month Selected) level */}
                    {selectedMonth && !selectedSchool && (
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            className="rounded-xl w-full sm:w-auto font-bold tracking-wide flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary shrink-0"
                        >
                            <Download className="w-4 h-4" />
                            Export Excel
                        </Button>
                    )}
                </div>

                <div className="p-4 md:p-6 flex-1 bg-muted/5">

                    {/* LEVEL 1: TEACHER LIST (UPDATED TO VERTICAL LIST) */}
                    {!selectedTeacher ? (
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or zone..."
                                    className="pl-9 bg-background"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                {filteredTeachers.map((teacher) => (
                                    <div
                                        key={teacher.id}
                                        onClick={() => setSelectedTeacher(teacher)}
                                        className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-row items-center justify-between active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Rank Badge */}
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm shrink-0">
                                                #{teacher.rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                                                {teacher.name.charAt(0)}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm md:text-base text-foreground truncate">{teacher.name}</h4>
                                                <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                                                    {teacher.zone}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Score & Action */}
                                        <div className="flex items-center gap-4 shrink-0 pl-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Weekly Score</span>
                                                <span className={`font-bold text-sm md:text-base flex items-center gap-1 ${teacher.score >= 90 ? 'text-emerald-500' :
                                                        teacher.score >= 80 ? 'text-warning' : 'text-destructive'
                                                    }`}>
                                                    <Trophy className="w-3.5 h-3.5 hidden sm:block" />
                                                    {teacher.score}/100
                                                </span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 hidden sm:block" />
                                        </div>
                                    </div>
                                ))}
                                {filteredTeachers.length === 0 && (
                                    <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                                        No teachers found matching "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ) :

                        /* LEVEL 2: MONTHS LIST */
                        !selectedMonth ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
                                {mockProgressData[selectedTeacher.id]?.map((monthData) => (
                                    <div
                                        key={monthData.id}
                                        onClick={() => setSelectedMonth(monthData)}
                                        className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <CalendarDays className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg text-foreground">{monthData.month}</h4>
                                                <p className="text-sm text-muted-foreground font-medium mt-0.5">Tap to view schools</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                    </div>
                                ))}
                                {!mockProgressData[selectedTeacher.id] && (
                                    <div className="col-span-full py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                                        No progress data available for this teacher yet.
                                    </div>
                                )}
                            </div>
                        ) :

                            /* LEVEL 3: SCHOOLS LIST */
                            !selectedSchool ? (
                                <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                                    {selectedMonth.schools && selectedMonth.schools.length > 0 ? (
                                        selectedMonth.schools.map((school) => (
                                            <div
                                                key={school.id}
                                                onClick={() => setSelectedSchool(school)}
                                                className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] group"
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
                                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border shadow-sm">
                                            No schools recorded for this month.
                                        </div>
                                    )}
                                </div>
                            ) :

                                /* LEVEL 4: DETAILED STATS GRID & DAILY LIST */
                                !selectedDay ? (
                                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">

                                        {/* --- STATS GRID --- */}
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground px-1 uppercase tracking-wider text-center md:text-left mb-3">
                                                Summary Metrics
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                                                {/* Present */}
                                                <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                                                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-500 mb-2 relative z-10" />
                                                    <span className="text-3xl font-black text-emerald-500 relative z-10">{selectedSchool.stats.present}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-emerald-600/80 uppercase tracking-wider mt-1 relative z-10">Present</span>
                                                </div>

                                                {/* Late */}
                                                <div className="bg-card border border-warning/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-warning/40 transition-colors">
                                                    <div className="absolute inset-0 bg-warning/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-warning mb-2 relative z-10" />
                                                    <span className="text-3xl font-black text-warning relative z-10">{selectedSchool.stats.late}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-warning/80 uppercase tracking-wider mt-1 relative z-10">Late</span>
                                                </div>

                                                {/* Absent */}
                                                <div className="bg-card border border-destructive/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-destructive/40 transition-colors">
                                                    <div className="absolute inset-0 bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <XCircle className="w-6 h-6 md:w-8 md:h-8 text-destructive mb-2 relative z-10" />
                                                    <span className="text-3xl font-black text-destructive relative z-10">{selectedSchool.stats.absent}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-destructive/80 uppercase tracking-wider mt-1 relative z-10">Absent</span>
                                                </div>

                                                {/* Events */}
                                                <div className="bg-card border border-violet-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-violet-500/40 transition-colors">
                                                    <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Star className="w-6 h-6 md:w-8 md:h-8 text-violet-500 mb-2 relative z-10" />
                                                    <span className="text-3xl font-black text-violet-500 relative z-10">{selectedSchool.stats.events}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-violet-500/80 uppercase tracking-wider mt-1 relative z-10">Events</span>
                                                </div>

                                                {/* Holidays */}
                                                <div className="bg-card border border-slate-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-slate-500/40 transition-colors">
                                                    <div className="absolute inset-0 bg-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Coffee className="w-6 h-6 md:w-8 md:h-8 text-slate-500 mb-2 relative z-10" />
                                                    <span className="text-3xl font-black text-slate-500 relative z-10">{selectedSchool.stats.holidays}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-500/80 uppercase tracking-wider mt-1 relative z-10">Holidays</span>
                                                </div>

                                                {/* Media Sent */}
                                                <div className="bg-card border border-blue-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                                                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Film className="w-6 h-6 md:w-8 md:h-8 text-blue-500 mb-2 relative z-10" />
                                                    <span className="text-3xl font-black text-blue-500 relative z-10">{selectedSchool.stats.mediaSent}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-blue-500/80 uppercase tracking-wider mt-1 relative z-10">Media Sent</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- DAILY RECORDS LIST --- */}
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground px-1 uppercase tracking-wider mb-3">Daily Breakdown</h3>
                                            <div className="space-y-3">
                                                {selectedSchool.records && selectedSchool.records.length > 0 ? (
                                                    selectedSchool.records.map((day, idx) => {
                                                        // Determine if the row should be clickable (everything except 'Present')
                                                        const isClickable = ['Late', 'Absent', 'Event', 'Holiday'].includes(day.status);

                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => isClickable && setSelectedDay(day)}
                                                                className={`flex items-center justify-between p-4 border rounded-xl bg-card transition-all shadow-sm
                                                        ${isClickable
                                                                        ? 'border-border cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]'
                                                                        : 'border-transparent hover:bg-muted/30'
                                                                    }
                                                    `}
                                                            >
                                                                <div className="flex items-center gap-3 md:gap-4">
                                                                    <span className="font-bold w-24 md:w-40 text-sm md:text-base text-foreground">{day.date}</span>
                                                                    <span className="text-[11px] md:text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                                        <Clock className="w-3.5 h-3.5" /> {day.timeIn || "--:--"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 md:gap-3">
                                                                    <span className={getStatusBadge(day.status)}>
                                                                        {day.status}
                                                                    </span>
                                                                    {isClickable && (
                                                                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/50 shrink-0" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border shadow-sm">
                                                        No daily records logged for this school.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) :

                                    /* LEVEL 5: DAY SPECIFIC REASON VIEW */
                                    (
                                        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">

                                            {/* Status Card */}
                                            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 w-full h-1 bg-linear-to-r from-transparent via-border to-transparent opacity-50"></div>
                                                <div className="mb-4">
                                                    <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                                </div>
                                                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{selectedDay.date}</h3>
                                                <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full text-sm font-medium">
                                                    <Clock className="w-4 h-4" />
                                                    Logged at {selectedDay.timeIn || "No Time Logged"}
                                                </div>
                                            </div>

                                            {/* Reason Card */}
                                            <div className="space-y-3">
                                                <h3 className="text-sm font-bold text-foreground px-1 uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> Teacher's Note
                                                </h3>

                                                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col justify-center min-h-45">
                                                    {selectedDay.reason ? (
                                                        <p className="text-base md:text-lg text-foreground/90 italic leading-relaxed text-center font-medium">
                                                            "{selectedDay.reason}"
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
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
            </div>
        </div>
    );
};

export default ProgressReport;