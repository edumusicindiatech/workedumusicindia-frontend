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
            <div className="max-w-6xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-border/40">
                    <div className="space-y-3 w-full max-w-sm">
                        <div className="h-10 w-3/4 md:w-64 bg-muted rounded-lg animate-pulse" />
                        <div className="h-5 w-full md:w-80 bg-muted/60 rounded-md animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-card rounded-[1.4rem] p-5 sm:p-7 border border-border/60 h-64 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
                <div className="space-y-1.5">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                        {t('assigned_schools.title')}
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
                        <Map className="w-4 h-4 text-primary/70 shrink-0" />
                        <span className="truncate">{t('assigned_schools.subtitle')}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 sm:flex-none bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-default">
                        <UserX className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-bold">{t('assigned_schools.absent')}: {leaveStats.absent}</span>
                    </div>
                    <div className="flex-1 sm:flex-none bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                        <CalendarOff className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-bold">{t('assigned_schools.leave_record')}: {leaveStats.leaves}</span>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            {assignedSchools.length === 0 ? (
                <div className="bg-card border border-border rounded-4xl p-10 sm:p-16 mt-8 shadow-sm text-center flex flex-col items-center relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-muted via-muted-foreground/30 to-muted" />
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-muted dark:bg-muted/30 rounded-full flex items-center justify-center border-4 border-white dark:border-card shadow-sm z-10">
                            <School className="w-10 h-10 text-muted-foreground/70" />
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3 tracking-tight">{t('assigned_schools.empty_title')}</h2>
                    <p className="text-muted-foreground mb-4 max-w-md text-base sm:text-lg leading-relaxed">
                        {t('assigned_schools.empty_desc')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {assignedSchools.map((school) => (
                        <div
                            key={school.id}
                            onClick={() => setSelectedSchool(school)}
                            className="group relative bg-card rounded-3xl border border-border p-1 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_-5px_rgba(var(--primary),0.15)] flex flex-col h-full overflow-hidden dark:hover:bg-primary/5"
                        >
                            <div className="bg-card rounded-[1.4rem] p-5 sm:p-7 flex flex-col h-full relative z-10 w-full overflow-hidden">

                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3.5 bg-primary/10 dark:bg-primary/20 rounded-2xl shrink-0 mt-0.5 group-hover:scale-110 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                                        <School className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                                            {school.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground flex items-start gap-1.5 leading-relaxed mt-2">
                                            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/70" />
                                            <span className="line-clamp-2">{school.address}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6 flex-1 w-full">
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
                                            <div key={idx} className="bg-muted/30 dark:bg-muted/20 border border-border/50 rounded-2xl p-4 transition-colors group-hover:bg-muted/50 w-full">

                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-sm whitespace-nowrap">
                                                            {cat.name}
                                                        </span>
                                                        
                                                        {/* --- PROPER VISUAL TASK BADGE --- */}
                                                        {cat.isTask && (
                                                            <span className="bg-violet-500 text-white px-3 py-1 rounded-full border border-violet-600 text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                                                                <ClipboardList className="w-3.5 h-3.5" /> {t('assigned_schools.task_badge', 'Task')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {distanceText && (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 whitespace-nowrap animate-in fade-in zoom-in duration-300">
                                                            <Navigation className="w-3.5 h-3.5" />
                                                            {distanceText}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-card border border-border px-3.5 py-2 rounded-xl shadow-sm shrink-0">
                                                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                                        <span className="whitespace-nowrap">{startTime}</span>
                                                        <span className="text-muted-foreground font-normal mx-1">{t('assigned_schools.card_to')}</span>
                                                        <span className="whitespace-nowrap">{endTime}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {WEEK_DAYS.map(day => {
                                                            const isAssigned = allowedDays.includes(day);
                                                            return (
                                                                <div
                                                                    key={day}
                                                                    className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold transition-all shrink-0 ${isAssigned
                                                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 border border-emerald-400/50'
                                                                        : 'bg-card border border-border text-muted-foreground/40'
                                                                        }`}
                                                                >
                                                                    {t(`assigned_schools.weekdays.${day}`)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between text-muted-foreground group-hover:text-primary transition-colors">
                                    <span className="text-sm font-bold flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4" /> {t('assigned_schools.view_history')}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
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