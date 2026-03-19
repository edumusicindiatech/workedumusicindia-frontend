import { useState } from "react";
import {
    Radio, ArrowLeft, ChevronRight, School,
    Users, Clock, MapPin, Activity, Map
} from "lucide-react";

// --- NESTED MOCK DATA ---
const mockFeedData = [
    {
        id: 1, name: "Sarah Johnson", zone: "Zone A", latestTime: "8:02 AM", latestStatus: "arrival",
        schools: [
            {
                id: 101, name: "Lincoln High School", address: "123 Main St",
                categories: [
                    {
                        id: 'c1', name: "Junior Band",
                        records: [
                            { id: 'r1', type: "arrival", time: "8:02 AM", location: "Main Gate", note: "Checked in via mobile app." },
                            { id: 'r2', type: "departure", time: "11:30 AM", location: "Main Gate", note: "Completed session." }
                        ]
                    },
                    {
                        id: 'c2', name: "Senior Band",
                        records: [
                            { id: 'r3', type: "late", time: "12:15 PM", location: "Back Entrance", note: "Traffic delay reported." }
                        ]
                    }
                ]
            },
            {
                id: 102, name: "Washington Elementary", address: "456 Oak Ave",
                categories: [
                    {
                        id: 'c3', name: "Junior Band",
                        records: [
                            { id: 'r4', type: "pending", time: "Scheduled: 2:00 PM", location: "-", note: "Awaiting arrival." }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 2, name: "Mike Chen", zone: "Zone B", latestTime: "8:05 AM", latestStatus: "arrival",
        schools: [
            {
                id: 103, name: "Roosevelt Middle", address: "789 Pine Ln",
                categories: [
                    {
                        id: 'c4', name: "Senior Band",
                        records: [
                            { id: 'r5', type: "arrival", time: "8:05 AM", location: "Staff Entrance", note: "On time." }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 3, name: "James Wilson", zone: "Zone A", latestTime: "8:30 AM", latestStatus: "no-show",
        schools: [
            {
                id: 101, name: "Lincoln High School", address: "123 Main St",
                categories: [
                    {
                        id: 'c5', name: "Junior Band",
                        records: [
                            { id: 'r6', type: "no-show", time: "8:30 AM", location: "-", note: "Did not check in 30 mins past start time." }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 4, name: "Emily Davis", zone: "Zone C", latestTime: "8:15 AM", latestStatus: "late",
        schools: [
            {
                id: 104, name: "Kennedy High", address: "321 Elm St",
                categories: [
                    {
                        id: 'c6', name: "Senior Band",
                        records: [
                            { id: 'r7', type: "late", time: "8:15 AM", location: "Front Desk", note: "Bus delayed." }
                        ]
                    }
                ]
            }
        ]
    }
];

const typeStyles = {
    arrival: { badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Arrived" },
    departure: { badge: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Departed" },
    "no-show": { badge: "bg-destructive/10 text-destructive border-destructive/20", label: "No-Show" },
    late: { badge: "bg-warning/10 text-warning border-warning/20", label: "Late" },
    pending: { badge: "bg-slate-500/10 text-slate-500 border-slate-500/20", label: "Pending" },
};

const AttendanceFeed = () => {
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Navigation Handler
    const handleBackNavigation = () => {
        if (selectedCategory) {
            setSelectedCategory(null);
        } else if (selectedSchool) {
            setSelectedSchool(null);
        } else if (selectedTeacher) {
            setSelectedTeacher(null);
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in pb-24 md:pb-8">

            {/* --- HEADER --- */}
            <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-4 h-4 rounded-full bg-emerald-500/20 animate-ping" />
                        <div className="relative w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Live Attendance Feed</h1>
                    <Radio className="w-5 h-5 text-primary ml-1 opacity-70" />
                </div>
                <p className="text-muted-foreground text-sm">Real-time tracking of workforce arrivals, departures, and delays.</p>
            </div>

            {/* --- BREADCRUMB / BACK NAVIGATION --- */}
            {(selectedTeacher || selectedSchool || selectedCategory) && (
                <button
                    onClick={handleBackNavigation}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors font-medium text-xs sm:text-sm w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {selectedCategory ? `Back to ${selectedSchool.name}`
                        : selectedSchool ? `Back to ${selectedTeacher.name}`
                            : "Back to Live Feed"}
                </button>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-card border border-border min-h-100 overflow-hidden flex flex-col">

                {/* Dynamic Header */}
                <div className="p-4 sm:p-6 border-b border-border bg-muted/20">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                        {!selectedTeacher ? "Today's Activity"
                            : !selectedSchool ? `Assigned Schools for ${selectedTeacher.name}`
                                : !selectedCategory ? `Categories at ${selectedSchool.name}`
                                    : `${selectedCategory.name} Live Logs`}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                        {!selectedTeacher ? "Select an employee to view their specific routing."
                            : !selectedSchool ? "Select a school to view alloted categories."
                                : !selectedCategory ? "Select a band to view check-in details."
                                    : `Detailed timeline for ${selectedTeacher.name}`}
                    </p>
                </div>

                <div className="flex-1 bg-background">

                    {/* LEVEL 1: ALL EMPLOYEES (LIVE FEED VIEW) */}
                    {!selectedTeacher ? (
                        <div className="divide-y divide-border animate-in slide-in-from-left-4 duration-300">
                            {mockFeedData.map((employee, i) => {
                                const style = typeStyles[employee.latestStatus];
                                return (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedTeacher(employee)}
                                        className="flex items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                                                {employee.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm sm:text-base text-foreground truncate">{employee.name}</p>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate mt-0.5 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {employee.zone}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-6 shrink-0 pl-2">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${style.badge}`}>
                                                    {style.label}
                                                </span>
                                                <span className="text-[10px] sm:text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {employee.latestTime}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-primary transition-colors hidden sm:block" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) :

                        /* LEVEL 2: ASSIGNED SCHOOLS */
                        !selectedSchool ? (
                            <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 animate-in slide-in-from-right-4 duration-300 bg-muted/5 h-full">
                                {selectedTeacher.schools.map((school) => (
                                    <div
                                        key={school.id}
                                        onClick={() => setSelectedSchool(school)}
                                        className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                <School className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm sm:text-base text-foreground truncate">{school.name}</span>
                                                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                                                    <Map className="w-3 h-3" /> {school.address}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        ) :

                            /* LEVEL 3: CATEGORIES (JUNIOR/SENIOR BAND) */
                            !selectedCategory ? (
                                <div className="p-3 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in slide-in-from-right-4 duration-300 bg-muted/5 h-full">
                                    {selectedSchool.categories.map((category) => (
                                        <div
                                            key={category.id}
                                            onClick={() => setSelectedCategory(category)}
                                            className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center text-center active:scale-[0.98] group"
                                        >
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 mb-3 group-hover:scale-110 transition-transform">
                                                <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                                            </div>
                                            <h4 className="font-bold text-sm sm:text-base md:text-lg text-foreground mb-1.5">{category.name}</h4>
                                            <span className="text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                                                <Activity className="w-3.5 h-3.5" /> View Live Logs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) :

                                /* LEVEL 4: LIVE RECORDS FEED FOR CATEGORY */
                                (
                                    <div className="p-4 md:p-6 bg-muted/5 h-full animate-in slide-in-from-right-4 duration-300">
                                        <div className="relative border-l-2 border-muted pl-5 sm:pl-6 ml-3 sm:ml-4 space-y-6 sm:space-y-8">
                                            {selectedCategory.records.map((record, idx) => {
                                                const style = typeStyles[record.type];

                                                return (
                                                    <div key={record.id} className="relative">
                                                        {/* Timeline Node */}
                                                        <div className={`absolute -left-6.75 sm:-left-7.75 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-4 border-card ${style.badge.split(' ')[0]} bg-background`} />

                                                        {/* Record Card */}
                                                        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                                <div className="flex items-center gap-2 sm:gap-3">
                                                                    <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${style.badge}`}>
                                                                        {style.label}
                                                                    </span>
                                                                    <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {record.time}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <p className="text-sm sm:text-base text-foreground font-medium">
                                                                    {record.note}
                                                                </p>
                                                                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                                                                    <MapPin className="w-3.5 h-3.5" /> Location: <span className="font-semibold">{record.location}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}

                                            {selectedCategory.records.length === 0 && (
                                                <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border text-sm -ml-5 sm:-ml-6">
                                                    No live records available for this category yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceFeed;