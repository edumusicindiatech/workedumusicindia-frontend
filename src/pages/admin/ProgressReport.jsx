import { useState } from "react";
import {
    ChevronRight, ArrowLeft, TrendingUp, Search, UserCircle2,
    CheckCircle2, AlertCircle, XCircle, Star, Coffee, Film, CalendarDays,
    Clock, FileText, MessageSquareDashed, School, Download, Trophy, LogOut, ClipboardCheck, Users
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
                        { date: 'Mar 15, 2024 (Fri)', status: 'Present', timeIn: '08:00 AM', timeOut: '03:00 PM', dailyReport: 'Conducted Science lab experiments for Grade 10. All practical assessments completed successfully.' },
                        { date: 'Mar 12, 2024 (Tue)', status: 'Late', timeIn: '08:45 AM', timeOut: '03:15 PM', reason: 'Heavy traffic on Main St.', dailyReport: 'Covered chapters 4 and 5 in Mathematics. Assigned homework exercises.' },
                        { date: 'Mar 10, 2024 (Sun)', status: 'Holiday', timeIn: '-', timeOut: '-', reason: '', dailyReport: '' },
                        { date: 'Mar 08, 2024 (Fri)', status: 'Event', timeIn: '07:30 AM', timeOut: '04:30 PM', reason: 'Annual Science Fair preparation.', dailyReport: 'Helped students set up their project booths. Coordinated with the judging panel.' },
                        { date: 'Mar 05, 2024 (Tue)', status: 'Absent', timeIn: '-', timeOut: '-', reason: 'Personal medical emergency.', dailyReport: '' }
                    ]
                },
                {
                    id: 102, name: "Washington Elementary", address: "456 Oak Ave",
                    stats: { present: 10, late: 0, absent: 0, events: 0, holidays: 0, mediaSent: 0 },
                    records: [
                        { date: 'Mar 14, 2024 (Thu)', status: 'Present', timeIn: '07:55 AM', timeOut: '02:45 PM', dailyReport: 'Basic phonics lesson for 2nd grade. Conducted reading session.' },
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
                        { date: 'Feb 20, 2024 (Tue)', status: 'Present', timeIn: '07:50 AM', timeOut: '03:05 PM', dailyReport: 'Standard lectures delivered.' },
                        { date: 'Feb 15, 2024 (Thu)', status: 'Late', timeIn: '08:30 AM', timeOut: '03:00 PM', reason: 'Bus breakdown.', dailyReport: 'Caught up on missed morning syllabus during lunch period.' },
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
    const [selectedCategory, setSelectedCategory] = useState(null); // Added Category Level
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
            setSelectedDay(null); // Go back to Category Stats
        } else if (selectedCategory) {
            setSelectedCategory(null); // Go back to Categories List
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
        return `px-2 md:px-2.5 py-0.5 md:py-1 rounded text-[9px] md:text-xs font-bold uppercase tracking-wider border ${styles[status] || styles.Holiday}`;
    };

    // Excel Export Logic (Structured with Bold Headers, Category, and Daily Reports)
    const handleExportExcel = () => {
        if (!selectedMonth || !selectedMonth.schools || !selectedTeacher) return;

        const headers = ["Teacher", "Month", "School Name", "Category", "Address", "Date", "Time In", "Time Out", "Status", "Teacher Note", "Daily Report"];
        let rowsHtml = "";

        // Helper to safely escape text for HTML
        const escapeHtml = (text) => text?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || '';

        selectedMonth.schools.forEach(school => {
            // Map categories or fallback to creating them dynamically for legacy data
            const categories = school.categories || [
                { name: "Junior Band", records: school.records || [] },
                { name: "Senior Band", records: [] }
            ];

            categories.forEach(category => {
                if (category.records && category.records.length > 0) {
                    category.records.forEach(day => {
                        rowsHtml += `
                            <tr>
                                <td>${escapeHtml(selectedTeacher.name)}</td>
                                <td>${escapeHtml(selectedMonth.month)}</td>
                                <td>${escapeHtml(school.name)}</td>
                                <td>${escapeHtml(category.name)}</td>
                                <td>${escapeHtml(school.address)}</td>
                                <td>${escapeHtml(day.date)}</td>
                                <td>${escapeHtml(day.timeIn || "No Time")}</td>
                                <td>${escapeHtml(day.timeOut || "No Time")}</td>
                                <td>${escapeHtml(day.status)}</td>
                                <td>${escapeHtml(day.reason)}</td>
                                <td>${escapeHtml(day.dailyReport)}</td>
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

        // Create an HTML table with CSS styling for Excel to read
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
        link.setAttribute("download", `${selectedTeacher.name}_${selectedMonth.month}_Progress.xls`);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Helper to safely get categories to display (Handles old mock data gracefully)
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
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-300 pb-24 md:pb-8">

            {/* --- HEADER --- */}
            <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">Progress Reports</h1>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">Track monthly attendance and media activity across your workforce.</p>
            </div>

            {/* --- BREADCRUMB / BACK NAVIGATION --- */}
            {(selectedTeacher || selectedMonth || selectedSchool || selectedCategory || selectedDay) && (
                <button
                    onClick={handleBackNavigation}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors font-medium text-xs sm:text-sm w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {selectedDay ? `Back to ${selectedCategory.name} Overview`
                        : selectedCategory ? `Back to ${selectedSchool.name}`
                            : selectedSchool ? `Back to ${selectedMonth.month} Schools`
                                : selectedMonth ? `Back to ${selectedTeacher.name}`
                                    : "Back to Teacher List"}
                </button>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-card border border-border min-h-125 overflow-hidden flex flex-col">

                {/* Dynamic Header */}
                <div className="p-4 sm:p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                            {!selectedTeacher ? "Workforce Rankings"
                                : !selectedMonth ? `${selectedTeacher.name}'s Monthly Reports`
                                    : !selectedSchool ? `Schools Visited in ${selectedMonth.month}`
                                        : !selectedCategory ? `${selectedSchool.name} Categories`
                                            : selectedDay ? `Daily Record Details`
                                                : `${selectedCategory.name} Overview`}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                            {!selectedTeacher ? "Search and select an employee to view their progress history."
                                : !selectedMonth ? "Select a month to view visited schools."
                                    : !selectedSchool ? `Select a school to view its categories.`
                                        : !selectedCategory ? `Select a band to view detailed statistics.`
                                            : selectedDay ? `Viewing details for ${selectedDay.date}`
                                                : "A comprehensive breakdown of attendance and media activity."}
                        </p>
                    </div>

                    {/* Export Button only visible at the Schools List (Month Selected) level */}
                    {selectedMonth && !selectedSchool && (
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            size="sm"
                            className="rounded-lg sm:rounded-xl w-full sm:w-auto font-bold tracking-wide flex items-center justify-center gap-2 border-primary/20 hover:bg-primary/5 text-primary shrink-0"
                        >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Export Excel
                        </Button>
                    )}
                </div>

                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-muted/5">

                    {/* LEVEL 1: TEACHER LIST */}
                    {!selectedTeacher ? (
                        <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-left-4 duration-300">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or zone..."
                                    className="pl-9 bg-background h-9 sm:h-10 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2 sm:gap-3">
                                {filteredTeachers.map((teacher) => (
                                    <div
                                        key={teacher.id}
                                        onClick={() => setSelectedTeacher(teacher)}
                                        className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-row items-center justify-between active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                            {/* Rank Badge */}
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs sm:text-sm shrink-0">
                                                #{teacher.rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs sm:text-sm md:text-base shrink-0">
                                                {teacher.name.charAt(0)}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm md:text-base text-foreground truncate">{teacher.name}</h4>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate mt-0.5">
                                                    {teacher.zone}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Score & Action */}
                                        <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Score</span>
                                                <span className={`font-bold text-xs sm:text-sm md:text-base flex items-center gap-1 ${teacher.score >= 90 ? 'text-emerald-500' :
                                                    teacher.score >= 80 ? 'text-warning' : 'text-destructive'
                                                    }`}>
                                                    <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 hidden sm:block" />
                                                    {teacher.score}/100
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                                        </div>
                                    </div>
                                ))}
                                {filteredTeachers.length === 0 && (
                                    <div className="py-8 sm:py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                                        No teachers found matching "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ) :

                        /* LEVEL 2: MONTHS LIST */
                        !selectedMonth ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 animate-in slide-in-from-right-4 duration-300">
                                {mockProgressData[selectedTeacher.id]?.map((monthData) => (
                                    <div
                                        key={monthData.id}
                                        onClick={() => setSelectedMonth(monthData)}
                                        className="bg-card border border-border rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-base sm:text-lg text-foreground">{monthData.month}</h4>
                                                <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">Tap to view schools</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                    </div>
                                ))}
                                {!mockProgressData[selectedTeacher.id] && (
                                    <div className="col-span-full py-8 sm:py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-card text-sm">
                                        No progress data available for this teacher yet.
                                    </div>
                                )}
                            </div>
                        ) :

                            /* LEVEL 3: SCHOOLS LIST */
                            !selectedSchool ? (
                                <div className="space-y-2 sm:space-y-3 animate-in slide-in-from-right-4 duration-300">
                                    {selectedMonth.schools && selectedMonth.schools.length > 0 ? (
                                        selectedMonth.schools.map((school) => (
                                            <div
                                                key={school.id}
                                                onClick={() => setSelectedSchool(school)}
                                                className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg sm:rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] group"
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
                                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 sm:py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border shadow-sm text-sm">
                                            No schools recorded for this month.
                                        </div>
                                    )}
                                </div>
                            ) :

                                /* LEVEL 4: SELECT CATEGORY (JUNIOR/SENIOR BAND) */
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

                                    /* LEVEL 5: DETAILED STATS GRID & DAILY LIST */
                                    !selectedDay ? (
                                        <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-4 duration-300">

                                            {/* --- STATS GRID --- */}
                                            <div>
                                                <h3 className="text-xs sm:text-sm font-bold text-foreground px-1 uppercase tracking-wider text-center md:text-left mb-2 sm:mb-3">
                                                    Summary Metrics
                                                </h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                                                    {/* Present */}
                                                    <div className="bg-card border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                                                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-emerald-500 mb-1.5 sm:mb-2 relative z-10" />
                                                        <span className="text-2xl sm:text-3xl font-black text-emerald-500 relative z-10">{selectedCategory.stats?.present || 0}</span>
                                                        <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-emerald-600/80 uppercase tracking-wider mt-1 relative z-10">Present</span>
                                                    </div>

                                                    {/* Late */}
                                                    <div className="bg-card border border-warning/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-warning/40 transition-colors">
                                                        <div className="absolute inset-0 bg-warning/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-warning mb-1.5 sm:mb-2 relative z-10" />
                                                        <span className="text-2xl sm:text-3xl font-black text-warning relative z-10">{selectedCategory.stats?.late || 0}</span>
                                                        <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-warning/80 uppercase tracking-wider mt-1 relative z-10">Late</span>
                                                    </div>

                                                    {/* Absent */}
                                                    <div className="bg-card border border-destructive/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-destructive/40 transition-colors">
                                                        <div className="absolute inset-0 bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-destructive mb-1.5 sm:mb-2 relative z-10" />
                                                        <span className="text-2xl sm:text-3xl font-black text-destructive relative z-10">{selectedCategory.stats?.absent || 0}</span>
                                                        <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-destructive/80 uppercase tracking-wider mt-1 relative z-10">Absent</span>
                                                    </div>

                                                    {/* Events */}
                                                    <div className="bg-card border border-violet-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-violet-500/40 transition-colors">
                                                        <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <Star className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-violet-500 mb-1.5 sm:mb-2 relative z-10" />
                                                        <span className="text-2xl sm:text-3xl font-black text-violet-500 relative z-10">{selectedCategory.stats?.events || 0}</span>
                                                        <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-violet-500/80 uppercase tracking-wider mt-1 relative z-10">Events</span>
                                                    </div>

                                                    {/* Holidays */}
                                                    <div className="bg-card border border-slate-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-slate-500/40 transition-colors">
                                                        <div className="absolute inset-0 bg-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <Coffee className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-slate-500 mb-1.5 sm:mb-2 relative z-10" />
                                                        <span className="text-2xl sm:text-3xl font-black text-slate-500 relative z-10">{selectedCategory.stats?.holidays || 0}</span>
                                                        <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-500/80 uppercase tracking-wider mt-1 relative z-10">Holidays</span>
                                                    </div>

                                                    {/* Media Sent */}
                                                    <div className="bg-card border border-blue-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                                                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <Film className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-500 mb-1.5 sm:mb-2 relative z-10" />
                                                        <span className="text-2xl sm:text-3xl font-black text-blue-500 relative z-10">{selectedCategory.stats?.mediaSent || 0}</span>
                                                        <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-blue-500/80 uppercase tracking-wider mt-1 relative z-10">Media</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* --- DAILY RECORDS LIST --- */}
                                            <div>
                                                <h3 className="text-xs sm:text-sm font-bold text-foreground px-1 uppercase tracking-wider mb-2 sm:mb-3">Daily Breakdown</h3>
                                                <div className="space-y-2 sm:space-y-3">
                                                    {selectedCategory.records && selectedCategory.records.length > 0 ? (
                                                        selectedCategory.records.map((day, idx) => {
                                                            // All rows clickable
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => setSelectedDay(day)}
                                                                    className="flex items-center justify-between p-3 sm:p-4 border rounded-lg sm:rounded-xl bg-card transition-all shadow-sm border-border cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]"
                                                                >
                                                                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                                                                        <span className="font-bold text-xs sm:text-sm md:text-base text-foreground shrink-0">{day.date}</span>
                                                                        <span className="text-[10px] sm:text-[11px] md:text-sm font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                                                                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {day.timeIn || "--:--"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
                                                                        {/* Daily Report Indicator Badge */}
                                                                        {day.dailyReport && (
                                                                            <span className="hidden sm:flex items-center gap-1 text-[9px] md:text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold border border-blue-500/20 uppercase tracking-wider">
                                                                                <ClipboardCheck className="w-3 h-3" /> Report
                                                                            </span>
                                                                        )}
                                                                        <span className={getStatusBadge(day.status)}>
                                                                            {day.status}
                                                                        </span>
                                                                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-muted-foreground/50 shrink-0" />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    ) : (
                                                        <div className="text-center py-8 sm:py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border shadow-sm text-sm">
                                                            No daily records logged for this category.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) :

                                        /* LEVEL 6: DAY SPECIFIC REASON VIEW */
                                        (
                                            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-in slide-in-from-right-4 duration-300">

                                                {/* Status & Time Card */}
                                                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                                                    <div className="absolute top-0 w-full h-1 bg-linear-to-r from-transparent via-border to-transparent opacity-50"></div>
                                                    <div className="mb-3 sm:mb-4">
                                                        <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                                    </div>
                                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">{selectedDay.date}</h3>

                                                    {/* Time In and Time Out Row */}
                                                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4">
                                                        <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 bg-emerald-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border border-emerald-500/20">
                                                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            In: {selectedDay.timeIn || "--:--"}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 sm:gap-2 text-rose-600 bg-rose-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border border-rose-500/20">
                                                            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            Out: {selectedDay.timeOut || "--:--"}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Reason Card (Only show if there's a reason or if no report exists) */}
                                                {(selectedDay.reason || !selectedDay.dailyReport) && (
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <h3 className="text-xs sm:text-sm font-bold text-foreground px-1 uppercase tracking-wider flex items-center gap-2">
                                                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Teacher's Note
                                                        </h3>

                                                        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center min-h-25 sm:min-h-35">
                                                            {selectedDay.reason ? (
                                                                <p className="text-sm sm:text-base text-foreground/90 italic leading-relaxed text-center font-medium">
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
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <h3 className="text-xs sm:text-sm font-bold text-blue-500 px-1 uppercase tracking-wider flex items-center gap-2">
                                                            <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Daily Report
                                                        </h3>

                                                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col">
                                                            <p className="text-sm md:text-base text-foreground/90 leading-relaxed font-medium whitespace-pre-wrap">
                                                                {selectedDay.dailyReport}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        )}
                </div>
            </div>
        </div>
    );
};

export default ProgressReport;