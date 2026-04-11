import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import {
    School, MapPin, ChevronRight, Loader2, Map,
    Clock, Navigation, CalendarDays, UserX, CalendarOff, ClipboardList
} from "lucide-react";
import toast from "react-hot-toast";
import SchoolDetailsModal from "../../modals/employee/SchoolDetailsModal";
import { useTranslation } from "react-i18next";

import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// --- HELPER FUNCTIONS ---

// Calculates in meters and formats automatically
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371e3; // Earth's radius in METERS
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceInMeters = R * c;

    if (distanceInMeters < 1000) {
        return `${Math.round(distanceInMeters)} m`;
    } else {
        return `${(distanceInMeters / 1000).toFixed(2)} km`;
    }
};

// Converts "14:30" (24h) to "2:30 PM" (12h)
const formatTime12Hour = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    const [hourStr, minuteStr] = timeStr.split(':');
    let hours = parseInt(hourStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    return `${hours}:${minuteStr} ${ampm}`;
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const AssignedSchools = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const [assignedSchools, setAssignedSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Note: You can populate these with real data from your API later
    const [leaveStats, setLeaveStats] = useState({ absent: 0, leaves: 0 });

    // Real-time GPS Watcher
    useEffect(() => {
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by this browser.");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.warn("Location access denied or unavailable", err),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        // Cleanup listener when component unmounts
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const fetchSchools = useCallback(async () => {
        try {
            const response = await api.get('/employee/assigned-schools');
            if (response.data.success) {
                setAssignedSchools(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch assigned schools:", error);
            toast.error(t('assigned_schools.error_toast'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchSchools();
    }, [fetchSchools]);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = () => {
            fetchSchools();
        };

        socket.on("new_notification", handleRealTimeUpdate);
        return () => {
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [fetchSchools, user]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 mt-2 md:mt-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-8 border-b border-border/40">
                    <div className="space-y-3 w-full max-w-sm">
                        <div className="h-12 w-3/4 md:w-72 bg-muted rounded-2xl animate-pulse" />
                        <div className="h-5 w-full md:w-80 bg-muted/60 rounded-xl animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-card rounded-[2.5rem] border border-border/50 h-80 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24 p-4 sm:p-6 lg:p-8 mt-2 md:mt-0">

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border/50">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
                        <Map className="w-7 h-7 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight uppercase text-foreground">
                            {t('assigned_schools.title')}
                        </h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span className="truncate">{t('assigned_schools.subtitle')}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex-1 sm:flex-none bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm whitespace-nowrap cursor-default">
                        <UserX className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{t('assigned_schools.absent')}: {leaveStats.absent}</span>
                    </div>
                    <div className="flex-1 sm:flex-none bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                        <CalendarOff className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{t('assigned_schools.leave_record')}: {leaveStats.leaves}</span>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            {assignedSchools.length === 0 ? (
                <div className="bg-card border-2 border-dashed border-border/60 rounded-[3rem] p-12 sm:p-20 mt-8 text-center flex flex-col items-center relative overflow-hidden group hover:border-primary/30 hover:bg-muted/10 transition-all duration-500">
                    <div className="relative w-24 h-24 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-muted/50 rounded-full flex items-center justify-center border border-border/50 shadow-inner z-10">
                            <School className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3 tracking-tight uppercase italic">{t('assigned_schools.empty_title')}</h2>
                    <p className="text-muted-foreground font-medium max-w-md text-sm sm:text-base leading-relaxed">
                        {t('assigned_schools.empty_desc')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                    {assignedSchools.map((school) => (
                        <div
                            key={school.id}
                            onClick={() => setSelectedSchool(school)}
                            className="group bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 relative overflow-hidden flex flex-col h-full cursor-pointer hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
                        >
                            {/* Card Accent Line */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20" />
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />

                            <div className="p-6 sm:p-8 flex-1 flex flex-col relative z-10">
                                
                                {/* School Header */}
                                <div className="flex items-start gap-4 sm:gap-5 mb-8">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <School className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h3 className="text-xl sm:text-2xl font-black text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                                            {school.name}
                                        </h3>
                                        <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-2 flex items-start gap-1.5 leading-relaxed">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
                                            <span className="line-clamp-2">{school.address}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Categories Container */}
                                <div className="space-y-4 flex-1 w-full">
                                    {school.categories.map((cat, idx) => {
                                        const startTime = formatTime12Hour(cat.startTime) || t('assigned_schools.na');
                                        const endTime = formatTime12Hour(cat.endTime) || t('assigned_schools.na');
                                        const allowedDays = cat.allowedDays || [];

                                        let distanceText = null;
                                        if (userLocation && cat.geofence) {
                                            const dist = calculateDistance(
                                                userLocation.lat, userLocation.lng,
                                                cat.geofence.latitude, cat.geofence.longitude
                                            );
                                            if (dist) distanceText = dist;
                                        }

                                        return (
                                            <div key={idx} className="bg-muted/20 border border-border/60 rounded-3xl p-5 transition-colors group-hover/cat:border-primary/30 group-hover/cat:bg-muted/30 w-full relative group/cat">
                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="bg-primary text-primary-foreground px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black tracking-widest uppercase shadow-sm whitespace-nowrap">
                                                            {cat.name}
                                                        </span>
                                                        
                                                        {cat.isTask && (
                                                            <span className="bg-violet-500 text-white px-3.5 py-1.5 rounded-full border border-violet-600 text-[10px] sm:text-[11px] font-black tracking-widest uppercase shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                                                                <ClipboardList className="w-3 h-3" /> {t('assigned_schools.task_badge', 'Task')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {distanceText && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 whitespace-nowrap animate-in fade-in zoom-in duration-300">
                                                            <Navigation className="w-3 h-3" />
                                                            {distanceText}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground bg-background border border-border/80 px-4 py-2 rounded-xl shadow-sm shrink-0">
                                                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                                        <span className="whitespace-nowrap">{startTime}</span>
                                                        <span className="text-muted-foreground/50 mx-1">—</span>
                                                        <span className="whitespace-nowrap">{endTime}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0 bg-background border border-border/80 p-1 rounded-[1.1rem]">
                                                        {WEEK_DAYS.map(day => {
                                                            const isAssigned = allowedDays.includes(day);
                                                            return (
                                                                <div
                                                                    key={day}
                                                                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-[9px] sm:text-[10px] font-black transition-all shrink-0 ${isAssigned
                                                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 border border-emerald-400/50 scale-105'
                                                                        : 'bg-transparent text-muted-foreground/40'
                                                                    }`}
                                                                >
                                                                    {t(`assigned_schools.weekdays.${day}`).charAt(0)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-6 sm:p-7 bg-muted/10 border-t border-border/50 flex items-center justify-between group-hover:bg-primary/5 transition-colors shrink-0">
                                <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                    <CalendarDays className="w-4 h-4" /> {t('assigned_schools.view_history', 'View Full History')}
                                </span>
                                <div className="w-10 h-10 rounded-xl bg-background border border-border/80 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all shadow-sm">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <SchoolDetailsModal
                isOpen={!!selectedSchool}
                onClose={() => setSelectedSchool(null)}
                school={selectedSchool}
                onRefresh={fetchSchools}
            />

        </div>
    );
};

export default AssignedSchools;