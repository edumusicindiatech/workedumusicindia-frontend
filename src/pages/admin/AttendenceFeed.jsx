import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import {
    Radio, Clock, MapPin, School, Users, FileText,
    AlertCircle, CheckCircle2, XCircle, Coffee, Star, X, Timer, Filter, ChevronDown, LogOut, Settings2, Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// --- HELPER FUNCTION: Calculate Live Distance ---
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

const AttendanceFeed = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [liveData, setLiveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // State to store live GPS coordinates for each employee
    const [liveLocations, setLiveLocations] = useState({});

    const [selectedNoteRecord, setSelectedNoteRecord] = useState(null);
    const [overrideMode, setOverrideMode] = useState(false);
    const [overrideAction, setOverrideAction] = useState("");
    const [overrideReason, setOverrideReason] = useState("");
    const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

    const filterRef = useRef(null);

    const fetchFeed = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const queryStatus = activeFilter.toLowerCase();
            const response = await api.get(`/admin/daily-feed?status=${queryStatus}`);

            if (response.data.success) {
                setLiveData(response.data.data);

                setSelectedNoteRecord((prevRecord) => {
                    if (!prevRecord) return null;
                    const freshData = response.data.data;
                    let updatedRecord = freshData.find(r => r._id === prevRecord._id);
                    if (!updatedRecord) {
                        const prevTeacherId = prevRecord.teacher?._id || prevRecord.teacher;
                        const prevSchoolId = prevRecord.school?._id || prevRecord.school;
                        updatedRecord = freshData.find(r => {
                            const currentTeacherId = r.teacher?._id || r.teacher;
                            const currentSchoolId = r.school?._id || r.school;
                            return currentTeacherId === prevTeacherId &&
                                currentSchoolId === prevSchoolId &&
                                r.date === prevRecord.date;
                        });
                    }
                    return updatedRecord || null;
                });
            }
        } catch (error) {
            console.error("Failed to fetch live feed:", error);
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

        const handleRealTimeUpdate = (data) => {
            fetchFeed(false);
        };

        const handleLocationUpdate = (data) => {
            setLiveLocations(prev => ({
                ...prev,
                [data.employeeId]: {
                    lat: data.lat,
                    lng: data.lng,
                    timestamp: data.timestamp
                }
            }));
        };

        socket.on("new_notification", (data) => {
            if (data.type === 'DailyReport') toast.success(t('attendance_feed.toasts.new_report'));
            if (data.type === 'Event') toast.success(t('attendance_feed.toasts.new_event', { school: data.schoolName }));
            fetchFeed(false);
        });

        socket.on("operations_update", handleRealTimeUpdate);
        socket.on("employee_location_changed", handleLocationUpdate);

        return () => {
            socket.off("new_notification");
            socket.off("operations_update", handleRealTimeUpdate);
            socket.off("employee_location_changed", handleLocationUpdate);
        };
    }, [currentUserId, fetchFeed, t]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getDerivedStatus = (record) => {
        if (record.status === 'Absent') return 'Absent';
        if (record.status === 'Holiday') return 'Holiday';
        if (record.status === 'On Leave') return 'On Leave';
        if (record.checkOutTime) return 'Completed';
        if (record.status === 'Event' || (record.eventNote && !record.checkOutTime)) return 'Event';
        if (record.checkInTime) return record.status === 'Late' ? 'Late' : 'Running';
        return 'Pending';
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

    const filteredAndSortedData = useMemo(() => {
        let filtered = liveData;
        if (activeFilter === "Pending") filtered = liveData.filter(r => getDerivedStatus(r) === "Pending");
        else if (activeFilter === "Running") filtered = liveData.filter(r => ["Running", "Late", "Event"].includes(getDerivedStatus(r)));
        else if (activeFilter === "Completed") filtered = liveData.filter(r => getDerivedStatus(r) === "Completed");
        else if (activeFilter === "Exceptions") filtered = liveData.filter(r => ["Absent", "Holiday", "On Leave"].includes(getDerivedStatus(r)));

        return filtered.sort((a, b) => new Date(b.checkInTime || b.createdAt || b.date) - new Date(a.checkInTime || a.createdAt || a.date));
    }, [liveData, activeFilter]);

    const formatTime = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                setOverrideMode(false);
                setOverrideAction("");
                setOverrideReason("");
                toast.success(t('attendance_feed.toasts.override_success'), { id: toastId });
                fetchFeed(false);
            }
        } catch (error) {
            console.error("Override failed:", error);
            toast.error(error.response?.data?.message || t('attendance_feed.toasts.override_error'), { id: toastId });
        } finally {
            setIsSubmittingOverride(false);
        }
    };

    const closeAndResetModal = () => {
        setSelectedNoteRecord(null);
        setOverrideMode(false);
        setOverrideAction("");
        setOverrideReason("");
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in pb-24 md:pb-8 h-full">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6 sm:mb-8 relative">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative flex items-center justify-center shrink-0">
                        <div className="absolute w-5 h-5 rounded-full bg-emerald-500/20 animate-ping" />
                        <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{t('attendance_feed.title')}</h1>
                </div>

                <div className="relative z-30" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 transition-all active:scale-95"
                    >
                        <Filter className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                        <span className="text-sm font-bold hidden sm:inline">{t(`attendance_feed.filter_${activeFilter.toLowerCase()}`)}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFilterOpen && (
                        <div className="absolute right-0 mt-3 w-64 sm:w-80 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {["All", "Pending", "Running", "Completed", "Exceptions"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => { setActiveFilter(f); setIsFilterOpen(false); }}
                                        className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border text-center ${activeFilter === f
                                            ? "bg-primary/10 text-primary border-primary shadow-sm"
                                            : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted"
                                            } ${f === 'Exceptions' ? 'col-span-2' : ''}`}
                                    >
                                        {t(`attendance_feed.filter_${f.toLowerCase()}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-card rounded-2xl border border-border/40 p-5 h-32 sm:h-24 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-5">
                    {filteredAndSortedData.map((record) => {
                        const uiStatus = getDerivedStatus(record);
                        const statusConfig = getStatusConfig(uiStatus);
                        const isLate = record.status === 'Late' || !!record.lateReason;
                        const hadEvent = !!record.eventNote;
                        const isAbsent = uiStatus === 'Absent';
                        const isHoliday = uiStatus === 'Holiday';
                        const isOnLeave = uiStatus === 'On Leave';

                        const isActiveOrPending = ["Pending", "Running", "Late"].includes(uiStatus);

                        const teacherId = record.teacher?._id?.toString() || record.teacher?.id?.toString() || (typeof record.teacher === 'string' ? record.teacher : null);
                        const employeeLocation = liveLocations[teacherId];

                        const rawLng = record.school?.location?.coordinates?.[0] || record.school?.coordinates?.[0] || record.school?.longitude;
                        const rawLat = record.school?.location?.coordinates?.[1] || record.school?.coordinates?.[1] || record.school?.latitude;

                        const schoolLng = parseFloat(rawLng);
                        const schoolLat = parseFloat(rawLat);

                        let liveDistance = null;
                        if (isActiveOrPending && employeeLocation && !isNaN(schoolLat) && !isNaN(schoolLng)) {
                            liveDistance = calculateDistance(
                                employeeLocation.lat,
                                employeeLocation.lng,
                                schoolLat,
                                schoolLng
                            );
                        }

                        return (
                            <div
                                key={record._id}
                                onClick={() => setSelectedNoteRecord(record)}
                                className={`bg-card rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 cursor-pointer hover:shadow-md hover:border-primary/40 group active:scale-[0.99] overflow-hidden relative
                                    ${hadEvent ? 'border-violet-500/40 bg-violet-500/5' : 'border-border'}
                                    ${isAbsent ? 'border-destructive/30 bg-destructive/5' : ''}
                                    ${isHoliday ? 'border-teal-500/30 bg-teal-500/5' : ''} 
                                    ${isOnLeave ? 'border-pink-500/30 bg-pink-500/5' : ''} 
                                `}
                            >
                                {/* Left Section: Profile Info */}
                                <div className="flex items-center gap-3 sm:gap-4 lg:w-[22%] shrink-0">
                                    <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-inner overflow-hidden border-2 border-background ${hadEvent ? 'bg-violet-600' : (isAbsent ? 'bg-destructive' : (isHoliday ? 'bg-teal-500' : (isOnLeave ? 'bg-pink-500' : 'bg-primary')))}`}>
                                        {record?.teacher?.profilePicture ? (
                                            typeof record?.teacher?.profilePicture === 'string' && record?.teacher?.profilePicture.startsWith('http')
                                                ? <img src={record?.teacher?.profilePicture} alt={record?.teacher?.profilePicture} className="w-full h-full object-cover" />
                                                : record?.teacher?.profilePicture
                                        ) : (
                                            record?.teacher?.name?.charAt(0).toUpperCase() || "U"
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                                            {record.teacher?.name || "Unknown"}
                                        </span>
                                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3 text-primary/70 shrink-0" /> <span className="truncate">{record.teacher?.zone || "Unassigned"}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Middle Section: School Info & Tracking */}
                                <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 dark:bg-muted/20 p-3.5 rounded-xl border border-border/40 group-hover:bg-muted/60 transition-colors">
                                        <div className="min-w-0 flex flex-col justify-center">
                                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">School</span>
                                            <span className="text-xs sm:text-sm font-bold text-foreground truncate block flex-1">{record.school?.schoolName || "Unknown"}</span>
                                        </div>
                                        <div className="min-w-0 sm:border-l border-border/60 sm:pl-4 flex flex-col justify-center">
                                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">Category</span>
                                            <span className="text-xs sm:text-sm font-bold text-foreground truncate block">{record.band}</span>
                                        </div>
                                    </div>

                                    {/* Live Tracking Dynamic Bar */}
                                    {isActiveOrPending && employeeLocation && (
                                        <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                                            {liveDistance && (
                                                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-300 backdrop-blur-sm">
                                                    <div className="relative flex items-center justify-center w-2 h-2">
                                                        <div className="absolute w-2 h-2 rounded-full bg-blue-500 animate-ping opacity-75" />
                                                        <div className="relative w-1.5 h-1.5 rounded-full bg-blue-600" />
                                                    </div>
                                                    {liveDistance}
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`https://www.google.com/maps?q=${employeeLocation.lat},${employeeLocation.lng}`, '_blank');
                                                }}
                                                className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white hover:shadow-md px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-300 animate-in fade-in zoom-in"
                                            >
                                                <Navigation className="w-3.5 h-3.5" />
                                                {t('attendance_feed.card.live_map', 'Locate Employee')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Right Section: Status & Timestamps */}
                                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:w-[22%] shrink-0 border-t lg:border-none border-border/50 pt-4 lg:pt-0 mt-2 lg:mt-0">
                                    <div className="flex flex-col items-start lg:items-end gap-2.5">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${statusConfig.color}`}>
                                                {statusConfig.icon} {statusConfig.label}
                                            </span>
                                            {isLate && <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm animate-pulse">{t('attendance_feed.card.late_badge')}</span>}
                                            {hadEvent && uiStatus === 'Completed' && <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-violet-500 text-white shadow-sm">{t('attendance_feed.card.event_badge')}</span>}
                                        </div>
                                        <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground flex flex-col sm:flex-row lg:flex-col gap-1 sm:gap-2 lg:gap-0.5 items-start lg:items-end">
                                            <span>{record.checkInTime ? `${t('attendance_feed.card.arrived')}: ${formatTime(record.checkInTime)}` : ((isAbsent || isHoliday || isOnLeave) ? t('attendance_feed.card.off_duty') : t('attendance_feed.card.pending'))}</span>
                                            {record.checkOutTime && <span className="hidden sm:inline lg:hidden">•</span>}
                                            {record.checkOutTime && <span>{t('attendance_feed.card.departed')}: {formatTime(record.checkOutTime)}</span>}
                                        </div>
                                    </div>
                                    <div className={`hidden lg:flex w-10 h-10 rounded-full items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm ${hadEvent ? 'bg-violet-500/15 text-violet-600' : (isAbsent ? 'bg-red-500/10 text-red-600' : (isHoliday ? 'bg-teal-500/10 text-teal-600' : (isOnLeave ? 'bg-pink-500/10 text-pink-600' : 'bg-primary/10 text-primary')))}`}>
                                        {hadEvent ? <Star className="w-5 h-5 fill-current" /> : (isAbsent ? <XCircle className="w-5 h-5" /> : (isHoliday ? <Coffee className="w-5 h-5" /> : (isOnLeave ? <Timer className="w-5 h-5" /> : <FileText className="w-5 h-5" />)))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredAndSortedData.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-4 border border-dashed border-border rounded-4xl bg-muted/10 shadow-inner">
                            <div className="w-20 h-20 rounded-full bg-background border border-border shadow-sm flex items-center justify-center mb-5 relative">
                                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20"></div>
                                <Clock className="w-10 h-10 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-xl font-extrabold text-foreground mb-2 tracking-tight">{t('attendance_feed.no_records_title')}</h3>
                            <p className="text-sm font-medium text-muted-foreground max-w-md leading-relaxed">{t('attendance_feed.no_records_desc')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal remains visually unchanged to preserve reliable interaction */}
            {selectedNoteRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeAndResetModal}>
                    <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border flex flex-col overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground shadow-sm ${!!selectedNoteRecord.eventNote ? 'bg-violet-600' : (selectedNoteRecord.status === 'Absent' ? 'bg-destructive' : (selectedNoteRecord.status === 'On Leave' ? 'bg-pink-500' : 'bg-primary'))}`}>
                                    {!!selectedNoteRecord.eventNote ? <Star className="w-5 h-5 fill-current" /> : (selectedNoteRecord.status === 'Absent' ? <XCircle className="w-5 h-5" /> : (selectedNoteRecord.status === 'On Leave' ? <Timer className="w-5 h-5" /> : <FileText className="w-5 h-5" />))}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-lg leading-tight text-foreground">{t('attendance_feed.modal.title')}</h3>
                                    <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate max-w-50 sm:max-w-xs">
                                        {selectedNoteRecord.teacher?.name} • {selectedNoteRecord.school?.schoolName}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeAndResetModal} className="p-2.5 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {selectedNoteRecord.eventNote && (
                                <div className="p-5 bg-violet-500/10 border border-violet-500/20 rounded-2xl shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-2.5 flex items-center gap-2">
                                        <Star className="w-3.5 h-3.5 fill-current" /> {t('attendance_feed.modal.event_highlights')}
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed text-foreground">"{selectedNoteRecord.eventNote}"</p>
                                </div>
                            )}

                            {(selectedNoteRecord.status === 'Absent' || selectedNoteRecord.status === 'On Leave' || !!selectedNoteRecord.lateReason || !!selectedNoteRecord.teacherNote) && (
                                <div className="p-5 bg-muted/30 border border-border rounded-2xl space-y-4 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {t('attendance_feed.modal.ops_intel')}
                                    </h4>

                                    {selectedNoteRecord.status === 'Absent' && (
                                        <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 border-l-4 border-l-destructive">
                                            <span className="font-bold text-[10px] uppercase tracking-wider text-destructive block mb-1">{t('attendance_feed.modal.absence_reason')}</span>
                                            <p className="text-sm font-medium text-foreground">"{selectedNoteRecord.teacherNote || t('attendance_feed.modal.no_reason')}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.status === 'On Leave' && (
                                        <div className="bg-pink-500/5 p-4 rounded-xl border border-pink-500/10 border-l-4 border-l-pink-500">
                                            <span className="font-bold text-[10px] uppercase tracking-wider text-pink-600 dark:text-pink-500 block mb-1">{t('attendance_feed.status.on_leave')}</span>
                                            <p className="text-sm font-medium text-foreground">"{selectedNoteRecord.teacherNote || 'Approved Leave'}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.lateReason && (
                                        <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 border-l-4 border-l-amber-500">
                                            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-500 block mb-1">{t('attendance_feed.modal.delayed_arrival')}</span>
                                            <p className="text-sm font-medium text-foreground">"{selectedNoteRecord.lateReason}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.teacherNote && selectedNoteRecord.status !== 'Absent' && selectedNoteRecord.status !== 'On Leave' && (
                                        <div className="p-1">
                                            <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">{t('attendance_feed.modal.standard_report')}</span>
                                            <p className="text-sm font-medium text-foreground leading-relaxed">"{selectedNoteRecord.teacherNote}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 p-5 bg-card border border-border rounded-2xl shadow-sm">
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5 mb-1">
                                        <Clock className="w-3 h-3" /> {t('attendance_feed.card.arrived')}
                                    </span>
                                    <p className="text-base font-bold text-foreground">{formatTime(selectedNoteRecord.checkInTime) || "—"}</p>
                                </div>
                                <div className="border-l border-border pl-4">
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5 mb-1">
                                        <LogOut className="w-3 h-3" /> {t('attendance_feed.card.departed')}
                                    </span>
                                    <p className="text-base font-bold text-foreground">{formatTime(selectedNoteRecord.checkOutTime) || (selectedNoteRecord.checkInTime ? t('attendance_feed.card.on_site') : "—")}</p>
                                </div>
                            </div>

                            {/* OVERRIDE SECTION */}
                            <div className="mt-6 pt-6 border-t border-border border-dashed">
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Settings2 className="w-4 h-4 text-primary" /> {t('attendance_feed.modal.override_title')}
                                    </h4>
                                    <button
                                        onClick={() => { setOverrideMode(!overrideMode); setOverrideAction(""); }}
                                        className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors shadow-sm"
                                    >
                                        {overrideMode ? t('attendance_feed.modal.btn_cancel_override') : t('attendance_feed.modal.btn_enable_edit')}
                                    </button>
                                </div>

                                {overrideMode && (
                                    <div className="bg-muted/40 p-5 rounded-2xl border border-border space-y-5 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {!selectedNoteRecord.checkInTime && (
                                                <button onClick={() => setOverrideAction("CheckIn")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'CheckIn' ? 'bg-emerald-500 text-white border-emerald-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-emerald-500'}`}>{t('attendance_feed.modal.actions.CheckIn')}</button>
                                            )}
                                            {selectedNoteRecord.checkInTime && !selectedNoteRecord.checkOutTime && (
                                                <button onClick={() => setOverrideAction("CheckOut")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'CheckOut' ? 'bg-blue-500 text-white border-blue-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-blue-500'}`}>{t('attendance_feed.modal.actions.CheckOut')}</button>
                                            )}
                                            <button onClick={() => setOverrideAction("Absent")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Absent' ? 'bg-destructive text-white border-red-700 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-destructive'}`}>{t('attendance_feed.modal.actions.Absent')}</button>
                                            <button onClick={() => setOverrideAction("Late")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Late' ? 'bg-amber-500 text-white border-amber-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-amber-500'}`}>{t('attendance_feed.modal.actions.Late')}</button>
                                            <button onClick={() => setOverrideAction("Event")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Event' ? 'bg-violet-500 text-white border-violet-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-violet-500'}`}>{t('attendance_feed.modal.actions.Event')}</button>
                                            <button
                                                onClick={() => setOverrideAction("Revoke")}
                                                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Revoke' ? 'bg-slate-800 text-white border-slate-900 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-slate-500'}`}
                                            >
                                                {selectedNoteRecord.checkOutTime ? t('attendance_feed.modal.actions.Revoke_Undo') : t('attendance_feed.modal.actions.Revoke_All')}
                                            </button>
                                        </div>

                                        {overrideAction && (
                                            <div className="space-y-4 animate-in fade-in">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">{t('attendance_feed.modal.optional_note')}</label>
                                                    <textarea
                                                        value={overrideReason}
                                                        onChange={(e) => setOverrideReason(e.target.value)}
                                                        placeholder={t('attendance_feed.modal.placeholder_note', { action: t(`attendance_feed.modal.actions.${overrideAction === 'Revoke' ? (selectedNoteRecord.checkOutTime ? 'Revoke_Undo' : 'Revoke_All') : overrideAction}`).toLowerCase() })}
                                                        className="w-full bg-card border border-border rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary outline-none resize-none h-24 placeholder:text-muted-foreground/40 transition-all shadow-sm"
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full font-extrabold h-12 rounded-xl text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                                                    onClick={handleOverrideSubmit}
                                                    disabled={isSubmittingOverride}
                                                >
                                                    {isSubmittingOverride ? t('attendance_feed.modal.btn_applying') : t('attendance_feed.modal.btn_confirm', { action: t(`attendance_feed.modal.actions.${overrideAction === 'Revoke' ? (selectedNoteRecord.checkOutTime ? 'Revoke_Undo' : 'Revoke_All') : overrideAction}`) })}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceFeed;