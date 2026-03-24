import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import {
    School, MapPin, ChevronRight, Loader2, Map,
    Clock, Navigation, CalendarDays
} from "lucide-react";
import toast from "react-hot-toast"; // <-- Custom Toast
import SchoolDetailsModal from "../../modals/employee/SchoolDetailsModal";

// --- SOCKET IMPORT FOR REAL-TIME REFRESH ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// --- Haversine Distance Calculator ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const AssignedSchools = () => {
    const { user } = useSelector((state) => state.auth);
    const [assignedSchools, setAssignedSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // 1. Get User's Live Location
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.warn("Location access denied or unavailable", err),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // 2. Fetch School Data
    const fetchSchools = useCallback(async () => {
        try {
            const response = await api.get('/employee/assigned-schools');
            if (response.data.success) {
                setAssignedSchools(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch assigned schools:", error);
            toast.error("Failed to load your assigned schools. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchools();
    }, [fetchSchools]);

    // 3. --- REAL-TIME DATA SYNC (The Fix!) ---
    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;

        // Tell THIS specific socket connection to join the user's room
        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = () => {
            console.log("New school assigned! Refreshing the list...");
            fetchSchools();
        };

        socket.on("new_notification", handleRealTimeUpdate);

        return () => {
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [fetchSchools, user]);

    // ==========================================
    // RENDER: LOADING STATE
    // ==========================================
    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-5">
                <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 w-16 h-16 bg-primary/20 rounded-full animate-ping" />
                    <div className="w-16 h-16 bg-card border border-border rounded-2xl shadow-xl flex items-center justify-center relative z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                </div>
                <p className="text-muted-foreground font-medium animate-pulse tracking-wide">Loading your assignments...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">

            {/* --- PREMIUM HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-border/40">
                <div className="space-y-1.5">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                        Assigned Locations
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
                        <Map className="w-4 h-4 text-primary/70" />
                        Select a school to view your 30-day attendance history.
                    </p>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            {assignedSchools.length === 0 ? (
                /* --- EMPTY STATE --- */
                <div className="bg-card border border-border rounded-4xl p-10 sm:p-16 mt-8 shadow-sm text-center flex flex-col items-center relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-muted via-muted-foreground/30 to-muted" />
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />
                    <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />

                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-muted dark:bg-muted/30 rounded-full flex items-center justify-center border-4 border-white dark:border-card shadow-sm z-10">
                            <School className="w-10 h-10 text-muted-foreground/70" />
                        </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3 tracking-tight">No Assignments Yet</h2>
                    <p className="text-muted-foreground mb-4 max-w-md text-base sm:text-lg leading-relaxed">
                        You currently do not have any schools permanently assigned to your profile. Check back later!
                    </p>
                </div>
            ) : (
                /* --- PREMIUM CARD GRID --- */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {assignedSchools.map((school) => (
                        <div
                            key={school.id}
                            onClick={() => setSelectedSchool(school)}
                            className="group relative bg-card rounded-3xl border border-border p-1 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_-5px_rgba(var(--primary),0.15)] flex flex-col h-full overflow-hidden dark:hover:bg-primary/5"
                        >
                            {/* Inner wrapper for gradient border illusion */}
                            <div className="bg-card rounded-[1.4rem] p-5 sm:p-7 flex flex-col h-full relative z-10 w-full overflow-hidden">

                                {/* Header: Icon, Title, Address */}
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

                                {/* Dynamic Details per Category */}
                                <div className="space-y-4 mb-6 flex-1 w-full">
                                    {school.categories.map((cat, idx) => {
                                        const userAssignment = user?.assignments?.find(a =>
                                            (a.school._id || a.school) === school.id && a.category === cat.name
                                        );

                                        const startTime = userAssignment?.startTime || "N/A";
                                        const endTime = userAssignment?.endTime || "N/A";
                                        const allowedDays = userAssignment?.allowedDays || [];

                                        // Calculate Distance
                                        let distanceText = null;
                                        if (userLocation && userAssignment?.geofence) {
                                            const dist = calculateDistance(
                                                userLocation.lat, userLocation.lng,
                                                userAssignment.geofence.latitude, userAssignment.geofence.longitude
                                            );
                                            if (dist) distanceText = `${dist} km away`;
                                        }

                                        return (
                                            <div key={idx} className="bg-muted/30 dark:bg-muted/20 border border-border/50 rounded-2xl p-4 transition-colors group-hover:bg-muted/50 w-full">

                                                {/* Top Row: Category Pill & Distance */}
                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-sm whitespace-nowrap">
                                                        {cat.name}
                                                    </span>
                                                    {distanceText && (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 whitespace-nowrap">
                                                            <Navigation className="w-3.5 h-3.5" />
                                                            {distanceText}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Bottom Row: Time and Days */}
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    {/* Timing Pill */}
                                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-card border border-border px-3.5 py-2 rounded-xl shadow-sm shrink-0">
                                                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                                        <span className="whitespace-nowrap">{startTime}</span>
                                                        <span className="text-muted-foreground font-normal mx-1">to</span>
                                                        <span className="whitespace-nowrap">{endTime}</span>
                                                    </div>

                                                    {/* Beautiful Weekday Bubbles */}
                                                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                                        {WEEK_DAYS.map(day => {
                                                            const isAssigned = allowedDays.includes(day);
                                                            return (
                                                                <div
                                                                    key={day}
                                                                    title={day}
                                                                    className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold transition-all shrink-0 ${isAssigned
                                                                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 border border-emerald-400/50'
                                                                            : 'bg-card border border-border text-muted-foreground/40'
                                                                        }`}
                                                                >
                                                                    {day.charAt(0)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer Action */}
                                <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between text-muted-foreground group-hover:text-primary transition-colors">
                                    <span className="text-sm font-bold flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4" /> View Attendance History
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

            {/* --- Detailed History Modal --- */}
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