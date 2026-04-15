import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import {
    Radio, Clock, MapPin, School, Users, FileText,
    AlertCircle, CheckCircle2, XCircle, Coffee, Star, X, Timer,
    Filter, ChevronDown, LogOut, Settings2, Navigation, Loader2, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// --- HELPER FUNCTION: Calculate Live Distance ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceInMeters = R * c;
    return distanceInMeters < 1000 ? `${Math.round(distanceInMeters)} m` : `${(distanceInMeters / 1000).toFixed(2)} km`;
};

// --- HELPER FUNCTION: Calculate Time Difference (Delays) ---
const calculateTimeDiff = (targetTimeStr, compareDate = new Date()) => {
    if (!targetTimeStr) return null;
    let hours, minutes;
    let match = targetTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
        match = targetTimeStr.match(/(\d+):(\d+)/);
        if (!match) return null;
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
    }
    const expectedTime = new Date(compareDate);
    expectedTime.setHours(hours, minutes, 0, 0);
    const diffMs = compareDate - expectedTime;
    if (diffMs > 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffHours > 0 && diffMins > 0) return `${diffHours}h ${diffMins}m`;
        if (diffHours > 0) return `${diffHours}h`;
        if (diffMins > 0) return `${diffMins}m`;
    }
    return null;
};

// --- HELPER FUNCTION: Parse "HH:MM AM/PM" to comparable minutes for sorting ---
const parseTimeStringToMinutes = (timeStr) => {
    if (!timeStr) return Number.MAX_SAFE_INTEGER; // Items without schedule go to bottom

    // 1. Try to read 12-hour format with AM/PM
    let match12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        let minutes = parseInt(match12[2], 10);
        const ampm = match12[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    // 2. Fallback to reading raw 24-hour format (e.g., "16:20", "11:00")
    let match24 = timeStr.match(/(\d+):(\d+)/);
    if (match24) {
        let hours = parseInt(match24[1], 10);
        let minutes = parseInt(match24[2], 10);
        return hours * 60 + minutes;
    }

    return Number.MAX_SAFE_INTEGER;
};

const AttendanceFeed = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [liveData, setLiveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [liveLocations, setLiveLocations] = useState({});

    // Modal States
    const [selectedNoteRecord, setSelectedNoteRecord] = useState(null);
    const [overrideMode, setOverrideMode] = useState(false);
    const [overrideAction, setOverrideAction] = useState("");
    const [overrideReason, setOverrideReason] = useState("");
    const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

    // Animation & Swipe states for Modal
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);
    const filterRef = useRef(null);

    const getDerivedStatus = (record) => {
        if (!record) return 'Pending';
        if (record.status === 'Absent') return 'Absent';
        if (record.status === 'Holiday') return 'Holiday';
        if (record.status === 'On Leave') return 'On Leave';
        if (record.checkOutTime) return 'Completed';
        if (record.status === 'Event' || (record.eventNote && !record.checkOutTime)) return 'Event';
        if (record.checkInTime) return record.status === 'Late' ? 'Late' : 'Running';
        return 'Pending';
    };

    const fetchFeed = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const queryStatus = activeFilter.toLowerCase();
            const response = await api.get(`/admin/daily-feed?status=${queryStatus}`);
            if (response.data.success) {
                setLiveData(response.data.data);
                setSelectedNoteRecord((prev) => {
                    if (!prev) return null;
                    return response.data.data.find(r => r._id === prev._id) || prev;
                });
            }
        } catch (error) {
            toast.error(t('attendance_feed.toasts.load_error'));
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [activeFilter, t]);

    useEffect(() => {
        fetchFeed(true);
        const interval = setInterval(() => fetchFeed(false), 60000);
        return () => clearInterval(interval);
    }, [fetchFeed]);

    const currentUserId = user?.id || user?._id;

    useEffect(() => {
        if (!currentUserId) return;
        socket.emit("join_room", currentUserId);
        socket.emit("join_admin_room");

        socket.on("new_notification", (data) => {
            if (data.type === 'DailyReport') toast.success(t('attendance_feed.toasts.new_report'));
            if (data.type === 'Event') toast.success(t('attendance_feed.toasts.new_event', { school: data.schoolName }));
            fetchFeed(false);
        });

        socket.on("operations_update", () => fetchFeed(false));
        socket.on("employee_location_changed", (data) => {
            setLiveLocations(prev => ({ ...prev, [data.employeeId]: { lat: data.lat, lng: data.lng, timestamp: data.timestamp } }));
        });

        return () => {
            socket.off("new_notification");
            socket.off("operations_update");
            socket.off("employee_location_changed");
        };
    }, [currentUserId, fetchFeed, t]);

    const handleCloseModal = () => {
        if (isSubmittingOverride) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            setSelectedNoteRecord(null);
            setOverrideMode(false);
            setOverrideAction("");
            setOverrideReason("");
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('textarea')) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) setDragOffset(delta);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 120) handleCloseModal();
        else setDragOffset(0);
    };

    const handleOverrideSubmit = async () => {
        if (!overrideAction) return;
        setIsSubmittingOverride(true);
        const toastId = toast.loading(t('attendance_feed.toasts.applying_override'));
        try {
            const res = await api.put(`/admin/attendance/${selectedNoteRecord._id}/override`, {
                action: overrideAction,
                reason: overrideReason,
                teacherId: selectedNoteRecord.teacher?._id,
                schoolId: selectedNoteRecord.school?._id,
                band: selectedNoteRecord.band,
                date: selectedNoteRecord.date || new Date().toISOString().split('T')[0]
            });
            if (res.data.success) {
                toast.success(t('attendance_feed.toasts.override_success'), { id: toastId });
                fetchFeed(false);
                handleCloseModal();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('attendance_feed.toasts.override_error'), { id: toastId });
        } finally {
            setIsSubmittingOverride(false);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case "Event": return { color: "text-violet-500 bg-violet-500/10 border-violet-500/20", icon: <Star className="w-3.5 h-3.5" />, label: t('attendance_feed.status.event') };
            case "Running": return { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: t('attendance_feed.status.running') };
            case "Late": return { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: <AlertCircle className="w-3.5 h-3.5" />, label: t('attendance_feed.status.late') };
            case "Completed": return { color: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: t('attendance_feed.status.completed') };
            case "Absent": return { color: "text-destructive bg-destructive/10 border-destructive/20", icon: <XCircle className="w-3.5 h-3.5" />, label: t('attendance_feed.status.absent') };
            case "Holiday": return { color: "text-teal-500 bg-teal-500/10 border-teal-500/20", icon: <Coffee className="w-3.5 h-3.5" />, label: t('attendance_feed.status.holiday') };
            case "On Leave": return { color: "text-pink-500 bg-pink-500/10 border-pink-500/20", icon: <Timer className="w-3.5 h-3.5" />, label: t('attendance_feed.status.on_leave') };
            default: return { color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: <Clock className="w-3.5 h-3.5" />, label: t('attendance_feed.status.pending') };
        }
    };

    // --- PRIORITY ENGINE SORTING ---
    const filteredAndSortedData = useMemo(() => {
        let filtered = liveData;
        if (activeFilter === "Pending") filtered = liveData.filter(r => getDerivedStatus(r) === "Pending");
        else if (activeFilter === "Running") filtered = liveData.filter(r => ["Running", "Late", "Event"].includes(getDerivedStatus(r)));
        else if (activeFilter === "Completed") filtered = liveData.filter(r => getDerivedStatus(r) === "Completed");
        else if (activeFilter === "Exceptions") filtered = liveData.filter(r => ["Absent", "Holiday", "On Leave"].includes(getDerivedStatus(r)));

        const priorityMap = {
            'Pending': 1,
            'Running': 2,
            'Late': 2,
            'Event': 2,
            'Completed': 3,
            'Absent': 4,
            'Holiday': 4,
            'On Leave': 4
        };

        return filtered.sort((a, b) => {
            const statusA = getDerivedStatus(a);
            const statusB = getDerivedStatus(b);
            const priorityA = priorityMap[statusA] || 5;
            const priorityB = priorityMap[statusB] || 5;

            if (priorityA !== priorityB) return priorityA - priorityB;

            if (priorityA === 1) {
                const timeA = parseTimeStringToMinutes(a.expectedStartTime);
                const timeB = parseTimeStringToMinutes(b.expectedStartTime);
                return timeA - timeB;
            }

            const timeA = new Date(a.checkOutTime || a.checkInTime || a.createdAt || a.date).getTime();
            const timeB = new Date(b.checkOutTime || b.checkInTime || b.createdAt || b.date).getTime();
            return timeB - timeA;
        });
    }, [liveData, activeFilter]);

    const formatTime = (timeInput) => {
        if (!timeInput) return null;

        // 1. If it's a raw "HH:MM" string (like expectedStartTime "08:00" or "14:30")
        if (typeof timeInput === 'string' && !timeInput.includes('T') && timeInput.includes(':')) {
            if (timeInput.toLowerCase().includes('am') || timeInput.toLowerCase().includes('pm')) {
                return timeInput.toUpperCase(); // Already has AM/PM
            }
            let [hours, minutes] = timeInput.split(':');
            hours = parseInt(hours, 10);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12; // Convert 0 to 12 for midnight
            return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
        }

        // 2. If it's a full Date string (like checkInTime)
        const dateObj = new Date(timeInput);
        if (!isNaN(dateObj)) {
            // Enforce US locale to guarantee 12-hour AM/PM format
            return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }

        return timeInput;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24 h-full mt-2 md:mt-0">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center shrink-0">
                        <div className="absolute w-8 h-8 rounded-full bg-emerald-500/20 animate-ping" />
                        <div className="relative w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase">{t('attendance_feed.title')}</h1>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Radio className="w-3 h-3 text-destructive animate-pulse" /> {t('attendance_feed.live_monitoring', 'Live Monitoring Active')}
                        </p>
                    </div>
                </div>

                <div className="relative z-10" ref={filterRef}>
                    <Button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="gap-2 h-11 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <Filter className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-black uppercase tracking-wider hidden sm:inline">
                            {t(`attendance_feed.filter_${activeFilter.toLowerCase()}`)}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </Button>

                    {isFilterOpen && (
                        <div className="absolute right-0 mt-3 w-64 sm:w-72 bg-card border border-border shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-100">
                            <div className="p-3 grid grid-cols-1 gap-1">
                                {["All", "Pending", "Running", "Completed", "Exceptions"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => { setActiveFilter(f); setIsFilterOpen(false); }}
                                        className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${activeFilter === f
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            }`}
                                    >
                                        <span className="uppercase tracking-widest">{t(`attendance_feed.filter_${f.toLowerCase()}`)}</span>
                                        {activeFilter === f && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* List Section */}
            {loading ? (
                <div className="space-y-4 animate-in fade-in">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-card rounded-4xl border border-border/40 p-6 h-28 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedData.map((record) => {
                        const uiStatus = getDerivedStatus(record);
                        const statusConfig = getStatusConfig(uiStatus);
                        const teacherId = record.teacher?._id?.toString() || record.teacher?.id?.toString() || record.teacher;
                        const employeeLocation = liveLocations[teacherId];
                        const isActiveOrPending = ["Pending", "Running", "Late"].includes(uiStatus);

                        let arrivalDelayBadge = null;
                        if (!["Absent", "Holiday", "On Leave"].includes(uiStatus)) {
                            if (record.expectedStartTime) {
                                const delay = calculateTimeDiff(record.expectedStartTime, record.checkInTime ? new Date(record.checkInTime) : new Date());
                                if (delay) arrivalDelayBadge = `+ ${delay}`;
                            }
                        }

                        return (
                            <div
                                key={record._id}
                                onClick={() => setSelectedNoteRecord(record)}
                                className={`group bg-card rounded-4xl border p-4 sm:p-5 transition-all duration-300 flex flex-col cursor-pointer hover:border-primary/50 hover:bg-blue-500/2 hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.98] relative overflow-hidden
                                    ${record.status === 'Event' ? 'border-violet-500/30' : 'border-border/60'}
                                    ${uiStatus === 'Absent' ? 'border-destructive/30' : ''}
                                `}
                            >
                                {/* TOP ROW: Identities and Locations */}
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-6">
                                    <div className="flex items-center gap-4 lg:w-[30%] shrink-0">
                                        <div className="relative">
                                            <div className={`w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xl font-black shadow-lg overflow-hidden border-2 border-background
                                                ${uiStatus === 'Absent' ? 'from-destructive to-destructive/80' : ''}
                                                ${uiStatus === 'Holiday' ? 'from-teal-500 to-teal-500/80' : ''}
                                            `}>
                                                {record.teacher?.profilePicture ? (
                                                    <img src={record.teacher.profilePicture} className="w-full h-full object-cover" alt="" />
                                                ) : record.teacher?.name?.charAt(0) || "U"}
                                            </div>
                                            {["Running", "Late"].includes(uiStatus) && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-card flex items-center justify-center shadow-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-extrabold text-base text-foreground truncate group-hover:text-primary transition-colors">{record.teacher?.name || "Unknown Staff"}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <MapPin className="w-3 h-3 text-primary/60" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{record.teacher?.zone || "Global"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="bg-muted/30 rounded-2xl p-3 sm:p-4 border border-border/40 group-hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="min-w-0 flex items-center gap-3">
                                                <div className="p-2 bg-background rounded-xl border border-border/50 shadow-sm shrink-0">
                                                    <School className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground block leading-none mb-1">{t('attendance_feed.assigned_location', 'Assigned Location')}</span>
                                                    <p className="text-sm font-extrabold text-foreground truncate">{record.school?.schoolName || "Not Found"}</p>
                                                </div>
                                            </div>

                                            {isActiveOrPending && employeeLocation && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const mapUrl = `https://www.google.com/maps?q=${employeeLocation.lat},${employeeLocation.lng}`;
                                                        window.open(mapUrl, '_blank', 'noopener,noreferrer');
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider animate-in slide-in-from-right-4 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
                                                >
                                                    <Navigation className="w-3 h-3 animate-pulse" />
                                                    <span>Live tracking</span>
                                                    {(() => {
                                                        const schoolLat = record.school?.latitude || record.school?.location?.coordinates?.[1];
                                                        const schoolLng = record.school?.longitude || record.school?.location?.coordinates?.[0];
                                                        if (schoolLat && schoolLng) {
                                                            return (
                                                                <span className="ml-1 border-l border-blue-500/30 pl-2">
                                                                    {calculateDistance(employeeLocation.lat, employeeLocation.lng, schoolLat, schoolLng)} away
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden lg:flex justify-end shrink-0 pt-2 pr-2">
                                        <ChevronDown className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1 -rotate-90" />
                                    </div>
                                </div>

                                {/* BOTTOM ROW: Status (Left) & Times (Right) */}
                                <div className="mt-4 pt-4 border-t border-dashed border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                                    {/* Bottom Left: Activity / Status */}
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${statusConfig.color}`}>
                                            {statusConfig.icon} {statusConfig.label}
                                        </span>
                                        {arrivalDelayBadge && (
                                            <span className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[9px] font-black shadow-sm shadow-amber-500/20 animate-in zoom-in">{arrivalDelayBadge}</span>
                                        )}
                                    </div>

                                    {/* Bottom Right: Scheduled & Actual Times */}
                                    <div className="flex flex-col items-start sm:items-end gap-1">

                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-foreground uppercase tracking-tight">
                                            <Clock className="w-3 h-3 text-primary" />

                                            {/* Logic: If checked in, show time. If Absent/Holiday/Leave, show blank dashes. Otherwise show WAITING */}
                                            {record.checkInTime
                                                ? formatTime(record.checkInTime)
                                                : (["Absent", "Holiday", "On Leave"].includes(uiStatus) ? "--:--" : "WAITING FOR ARRIVAL")
                                            }

                                            {record.checkOutTime && <span className="text-muted-foreground/50 mx-1">→</span>}
                                            {record.checkOutTime && formatTime(record.checkOutTime)}
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            <Timer className="w-2.5 h-2.5" />
                                            {/* Wrap expected times in our new formatter so "08:00" becomes "08:00 AM" */}
                                            SCH: {formatTime(record.expectedStartTime) || "--:--"} → {formatTime(record.expectedEndTime) || "--:--"}
                                        </div>

                                    </div>

                                </div>
                            </div>
                        );
                    })}

                    {filteredAndSortedData.length === 0 && (
                        <div className="py-24 text-center border-2 border-dashed border-border/60 rounded-[3rem] bg-muted/10">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="w-10 h-10 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-2xl font-black text-foreground mb-2 uppercase">{t('attendance_feed.no_records_title')}</h3>
                            <p className="text-muted-foreground text-sm font-medium">{t('attendance_feed.no_records_desc')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* DETAIL & OVERRIDE MODAL */}
            {selectedNoteRecord && (
                <div className={`fixed inset-0 z-150 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleCloseModal}>
                    <div
                        className={`bg-card w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border-t md:border border-border/50 flex flex-col relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`}
                        style={{ transform: `translateY(${dragOffset}px)` }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                        </div>

                        <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 px-6 py-5 border-b border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner
                                    ${selectedNoteRecord.status === 'Absent' ? 'bg-destructive/10 text-destructive' : 'text-primary'}
                                `}>
                                    {selectedNoteRecord.status === 'Absent' ? <XCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-lg text-foreground truncate leading-tight uppercase">{selectedNoteRecord.teacher?.name}</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] truncate">{selectedNoteRecord.school?.schoolName}</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {(selectedNoteRecord.eventNote || selectedNoteRecord.lateReason || selectedNoteRecord.teacherNote) && (
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">{t('attendance_feed.modal.field_intelligence', 'Field Intelligence')}</Label>

                                    {selectedNoteRecord.eventNote && (
                                        <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl animate-in slide-in-from-top-2">
                                            <p className="text-[9px] font-black uppercase tracking-tighter text-violet-600 mb-1 flex items-center gap-1.5">
                                                <Star className="w-3 h-3 fill-current" /> {t('attendance_feed.modal.event_highlights', 'Event Highlights')}
                                            </p>
                                            <p className="text-sm font-semibold text-foreground italic">"{selectedNoteRecord.eventNote}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.lateReason && (
                                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in slide-in-from-top-2">
                                            <p className="text-[9px] font-black uppercase tracking-tighter text-amber-600 mb-1 flex items-center gap-1.5">
                                                <AlertCircle className="w-3 h-3" /> {t('attendance_feed.modal.delay_justification', 'Delay Justification')}
                                            </p>
                                            <p className="text-sm font-semibold text-foreground italic">"{selectedNoteRecord.lateReason}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.teacherNote && (
                                        <div className="p-4 bg-muted/30 border border-border rounded-2xl animate-in slide-in-from-top-2">
                                            <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mb-1 flex items-center gap-1.5">
                                                <FileText className="w-3 h-3" /> {t('attendance_feed.modal.operations_report', 'Operations Report')}
                                            </p>
                                            <p className="text-sm font-semibold text-foreground italic">"{selectedNoteRecord.teacherNote}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block mb-1">{t('attendance_feed.modal.arrival', 'Arrival')}</span>
                                    <p className="text-lg font-black text-foreground tabular-nums">
                                        {/* Added formatTime() around expectedStartTime */}
                                        {formatTime(selectedNoteRecord.checkInTime) || formatTime(selectedNoteRecord.expectedStartTime) || "Pending"}
                                    </p>
                                </div>
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block mb-1">{t('attendance_feed.modal.departure', 'Departure')}</span>
                                    <p className="text-lg font-black text-foreground tabular-nums">
                                        {/* Added formatTime() around expectedEndTime */}
                                        {formatTime(selectedNoteRecord.checkOutTime) || (selectedNoteRecord.checkInTime ? "On Site" : (formatTime(selectedNoteRecord.expectedEndTime) || "Pending"))}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-dashed border-border/60">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2 text-foreground font-black uppercase tracking-tighter">
                                        <Settings2 className="w-5 h-5 text-primary" /> {t('attendance_feed.modal.system_override', 'System Override')}
                                    </div>
                                    <button
                                        onClick={() => { setOverrideMode(!overrideMode); setOverrideAction(""); }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm
                                            ${overrideMode ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground hover:bg-border'}
                                        `}
                                    >
                                        {overrideMode ? t('attendance_feed.modal.btn_cancel_override', 'Cancel Override') : t('attendance_feed.modal.btn_edit_mode', 'Enable Edit Mode')}
                                    </button>
                                </div>

                                {overrideMode && (
                                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: "CheckIn", label: t('attendance_feed.modal.action_check_in', "Check In"), color: "hover:border-emerald-500", active: "bg-emerald-500 text-white border-emerald-600" },
                                                { id: "CheckOut", label: t('attendance_feed.modal.action_check_out', "Check Out"), color: "hover:border-blue-500", active: "bg-blue-500 text-white border-blue-600" },
                                                { id: "Absent", label: t('attendance_feed.status.absent'), color: "hover:border-destructive", active: "bg-destructive text-white border-destructive/60" },
                                                { id: "Late", label: t('attendance_feed.status.late'), color: "hover:border-amber-500", active: "bg-amber-500 text-white border-amber-600" },
                                                { id: "Holiday", label: t('attendance_feed.status.holiday', "Holiday"), color: "hover:border-teal-500", active: "bg-teal-500 text-white border-teal-600" },
                                                { id: "Event", label: t('attendance_feed.status.event'), color: "hover:border-violet-500", active: "bg-violet-500 text-white border-violet-600" },
                                                { id: "Revoke", label: t('attendance_feed.modal.action_revoke', "Revoke"), color: "hover:border-slate-800", active: "bg-slate-800 text-white border-black" },
                                            ].map((action) => {
                                                if (action.id === 'CheckIn' && selectedNoteRecord.checkInTime) return null;
                                                if (action.id === 'CheckOut' && (!selectedNoteRecord.checkInTime || selectedNoteRecord.checkOutTime)) return null;

                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => setOverrideAction(action.id)}
                                                        className={`p-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xs
                                                            ${overrideAction === action.id ? action.active : `bg-background border-border/80 text-muted-foreground ${action.color}`}
                                                        `}
                                                    >
                                                        {action.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {overrideAction && (
                                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('attendance_feed.modal.admin_note', 'Administrative Note (Required)')}</Label>
                                                    <Textarea
                                                        value={overrideReason}
                                                        onChange={(e) => setOverrideReason(e.target.value)}
                                                        placeholder="Explain why this override is being performed..."
                                                        className="rounded-3xl bg-muted/20 border-border/80 focus-visible:ring-primary/30 p-4 min-h-25 text-sm font-medium"
                                                    />
                                                </div>
                                                <Button
                                                    onClick={handleOverrideSubmit}
                                                    disabled={isSubmittingOverride || !overrideReason.trim()}
                                                    className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                                                >
                                                    {isSubmittingOverride ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        t('attendance_feed.modal.btn_confirm_override', "Confirm Override")
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pb-safe" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceFeed;