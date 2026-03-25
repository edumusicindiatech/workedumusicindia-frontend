import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import {
    Radio, Clock, MapPin, School, Users, FileText,
    AlertCircle, CheckCircle2, XCircle, Coffee, Star, X, Timer, Filter, ChevronDown, LogOut, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";

// --- SOCKET IMPORT FOR REAL-TIME REFRESH ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const AttendanceFeed = () => {
    // --- GRAB USER FROM REDUX ---
    const { user } = useSelector((state) => state.auth);

    // --- STATE ---
    const [liveData, setLiveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Modal State
    const [selectedNoteRecord, setSelectedNoteRecord] = useState(null);

    // Override States
    const [overrideMode, setOverrideMode] = useState(false);
    const [overrideAction, setOverrideAction] = useState("");
    const [overrideReason, setOverrideReason] = useState("");
    const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

    const filterRef = useRef(null);

    // --- FETCH DATA FUNCTION ---
    const fetchFeed = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const queryStatus = activeFilter.toLowerCase();
            const response = await api.get(`/admin/daily-feed?status=${queryStatus}`);

            if (response.data.success) {
                setLiveData(response.data.data);

                // Smarter state update for the modal
                setSelectedNoteRecord((prevRecord) => {
                    if (!prevRecord) return null;
                    const freshData = response.data.data;

                    // 1. Try to find by exact ID first
                    let updatedRecord = freshData.find(r => r._id === prevRecord._id);

                    // 2. Fallback: Match by employee + school
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
            toast.error("Failed to load live feed.");
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [activeFilter]);

    // --- INITIAL LOAD & POLLING ---
    useEffect(() => {
        fetchFeed(true);
        const interval = setInterval(() => fetchFeed(false), 60000);
        return () => clearInterval(interval);
    }, [fetchFeed]);

    // --- REAL-TIME SOCKET CONNECTION ---
    const currentUserId = user?.id || user?._id;
    useEffect(() => {
        if (!currentUserId) return;

        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = (data) => {
            console.log("Live feed update received!", data);
            fetchFeed(false);
        };

        socket.on("new_notification", handleRealTimeUpdate);
        socket.on("operations_update", handleRealTimeUpdate);
        socket.on("operations_update", (data) => {
            console.log("Silent refresh triggered...");
            fetchFeed(false);
        });
        return () => {
            socket.off("new_notification", handleRealTimeUpdate)
            socket.off("operations_update", handleRealTimeUpdate);
        };
    }, [currentUserId, fetchFeed]);

    // --- CLICK OUTSIDE HANDLER ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- STATUS LOGIC ---
    const getDerivedStatus = (record) => {
        if (record.status === 'Absent') return 'Absent';
        if (record.status === 'Holiday') return 'Holiday';
        if (record.checkOutTime) return 'Completed';
        if (record.status === 'Event' || (record.eventNote && !record.checkOutTime)) return 'Event';
        if (record.checkInTime) return record.status === 'Late' ? 'Late' : 'Running';
        return 'Pending';
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case "Event": return { color: "text-violet-500 bg-violet-500/10 border-violet-500/20", icon: <Star className="w-3.5 h-3.5" />, label: "Event Live" };
            case "Running": return { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Running" };
            case "Late": return { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: <AlertCircle className="w-3.5 h-3.5" />, label: "Late" };
            case "Completed": return { color: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Completed" };
            case "Absent": return { color: "text-destructive bg-destructive/10 border-destructive/20", icon: <XCircle className="w-3.5 h-3.5" />, label: "Absent" };
            case "Holiday": return { color: "text-teal-500 bg-teal-500/10 border-teal-500/20", icon: <Coffee className="w-3.5 h-3.5" />, label: "Holiday" };
            default: return { color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: <Clock className="w-3.5 h-3.5" />, label: "Pending" };
        }
    };

    const filteredAndSortedData = useMemo(() => {
        let filtered = liveData;
        if (activeFilter === "Pending") filtered = liveData.filter(r => getDerivedStatus(r) === "Pending");
        else if (activeFilter === "Running") filtered = liveData.filter(r => ["Running", "Late", "Event"].includes(getDerivedStatus(r)));
        else if (activeFilter === "Completed") filtered = liveData.filter(r => getDerivedStatus(r) === "Completed");
        else if (activeFilter === "Exceptions") filtered = liveData.filter(r => ["Absent", "Holiday"].includes(getDerivedStatus(r)));

        return filtered.sort((a, b) => new Date(b.checkInTime || b.createdAt || b.date) - new Date(a.checkInTime || a.createdAt || a.date));
    }, [liveData, activeFilter]);

    const formatTime = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- OVERRIDE HANDLER ---
    const handleOverrideSubmit = async () => {
        if (!overrideAction) return;
        setIsSubmittingOverride(true);
        const toastId = toast.loading("Applying override...");

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
                toast.success(`Override applied successfully!`, { id: toastId });
                fetchFeed(false);
            }
        } catch (error) {
            console.error("Override failed:", error);
            toast.error(error.response?.data?.message || "Failed to override attendance.", { id: toastId });
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
        <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in pb-24 md:pb-8 h-full">
            {/* --- HEADER SECTION --- */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-4 h-4 rounded-full bg-emerald-500/20 animate-ping" />
                        <div className="relative w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Live Operations</h1>
                </div>

                {/* --- FLOATING FILTER BOX --- */}
                <div className="relative z-40" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 transition-all active:scale-95"
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold hidden sm:inline">{activeFilter}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFilterOpen && (
                        <div className="absolute right-0 mt-3 w-64 sm:w-80 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {["All", "Pending", "Running", "Completed", "Exceptions"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => { setActiveFilter(f); setIsFilterOpen(false); }}
                                        className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border text-center ${activeFilter === f
                                                ? "bg-primary/10 text-primary border-primary"
                                                : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted"
                                            } ${f === 'Exceptions' ? 'col-span-2' : ''}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- FEED CARDS & SHIMMER --- */}
            {loading ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-card rounded-2xl border border-border/40 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">

                            {/* 1. Teacher Info Skeleton */}
                            <div className="flex items-center gap-3 sm:gap-4 md:w-56 shrink-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted/60 animate-pulse shrink-0"></div>
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="h-4 bg-muted/60 rounded-md w-3/4 animate-pulse"></div>
                                    <div className="h-3 bg-muted/40 rounded-md w-1/2 animate-pulse"></div>
                                </div>
                            </div>

                            {/* 2. School & Band Skeleton */}
                            <div className="flex-1 grid grid-cols-2 gap-3 bg-muted/10 p-3 rounded-xl border border-border/30">
                                <div className="space-y-2">
                                    <div className="h-2 bg-muted/40 rounded w-1/3 animate-pulse"></div>
                                    <div className="h-3 bg-muted/60 rounded w-3/4 animate-pulse"></div>
                                </div>
                                <div className="border-l border-border/30 pl-3 space-y-2">
                                    <div className="h-2 bg-muted/40 rounded w-1/3 animate-pulse"></div>
                                    <div className="h-3 bg-muted/60 rounded w-1/2 animate-pulse"></div>
                                </div>
                            </div>

                            {/* 3. Status & Actions Skeleton */}
                            <div className="flex items-center justify-between md:justify-end gap-4 lg:gap-6 md:w-64 shrink-0">
                                <div className="flex flex-col items-start md:items-end gap-2 w-full">
                                    <div className="h-5 bg-muted/60 rounded-md w-20 animate-pulse"></div>
                                    <div className="h-3 bg-muted/40 rounded-md w-32 animate-pulse"></div>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-muted/50 animate-pulse shrink-0"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedData.map((record) => {
                        const uiStatus = getDerivedStatus(record);
                        const statusConfig = getStatusConfig(uiStatus);

                        const isLate = record.status === 'Late' || !!record.lateReason;
                        const hadEvent = !!record.eventNote;
                        const isAbsent = uiStatus === 'Absent';
                        const hasDetails = true;

                        return (
                            <div
                                key={record._id}
                                onClick={() => hasDetails && setSelectedNoteRecord(record)}
                                className={`bg-card rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 
                                    ${hasDetails ? 'cursor-pointer hover:shadow-md hover:border-primary/30 group active:scale-[0.99]' : 'cursor-default opacity-80'} 
                                    ${hadEvent ? 'border-violet-500/40 bg-violet-500/5' : 'border-border'}
                                    ${isAbsent ? 'border-destructive/30 bg-destructive/5' : ''}
                                `}
                            >
                                {/* 1. TEACHER INFO */}
                                <div className="flex items-center gap-3 sm:gap-4 md:w-56 shrink-0">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-inner ${hadEvent ? 'bg-violet-600' : (isAbsent ? 'bg-destructive' : 'bg-primary')
                                        }`}>
                                        {(record.teacher?.name || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                                            {record.teacher?.name || "Unknown"}
                                        </span>
                                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" /> {record.teacher?.zone || "Unassigned"}
                                        </span>
                                    </div>
                                </div>

                                {/* 2. SCHOOL & BAND GRID */}
                                <div className="flex-1 grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl border border-border/50 group-hover:bg-muted/50 transition-colors">
                                    <div className="min-w-0">
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5 opacity-70">Location</span>
                                        <span className="text-[11px] sm:text-xs font-bold text-foreground truncate block">{record.school?.schoolName || "Unknown"}</span>
                                    </div>
                                    <div className="min-w-0 border-l border-border/50 pl-3">
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5 opacity-70">Category</span>
                                        <span className="text-[11px] sm:text-xs font-bold text-foreground truncate block">{record.band}</span>
                                    </div>
                                </div>

                                {/* 3. DUAL STATUS & ACTIONS */}
                                <div className="flex items-center justify-between md:justify-end gap-4 lg:gap-6 md:w-64 shrink-0">
                                    <div className="flex flex-col items-start md:items-end gap-1.5">
                                        <div className="flex gap-2 items-center">
                                            <span className={`px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 ${statusConfig.color}`}>
                                                {statusConfig.icon} {statusConfig.label}
                                            </span>
                                            {isLate && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white animate-pulse">LATE</span>}
                                            {hadEvent && uiStatus === 'Completed' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-500 text-white">EVENT</span>}
                                        </div>
                                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                                            {record.checkInTime ? `In: ${formatTime(record.checkInTime)}` : ((isAbsent || uiStatus === 'Holiday') ? 'Off Duty' : 'Pending')}
                                            {record.checkOutTime && ` • Out: ${formatTime(record.checkOutTime)}`}
                                        </div>
                                    </div>

                                    {hasDetails && (
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${hadEvent ? 'bg-violet-500/20 text-violet-500' : (isAbsent ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary')
                                            }`}>
                                            {hadEvent ? <Star className="w-4 h-4 fill-current" /> : (isAbsent ? <XCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredAndSortedData.length === 0 && (
                        <div className="py-16 flex flex-col items-center justify-center text-center px-4 border border-dashed border-border rounded-3xl bg-muted/10">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-1">No Records Found</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                There are no attendance records matching your current filter.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* --- HIGH-FIDELITY MODAL & OVERRIDE UI --- */}
            {selectedNoteRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeAndResetModal}>
                    <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border flex flex-col overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${!!selectedNoteRecord.eventNote ? 'bg-violet-600' : (selectedNoteRecord.status === 'Absent' ? 'bg-destructive' : 'bg-primary')
                                    } text-primary-foreground shadow-sm`}>
                                    {!!selectedNoteRecord.eventNote ? <Star className="w-5 h-5 fill-current" /> : (selectedNoteRecord.status === 'Absent' ? <XCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />)}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-lg leading-tight text-foreground">Field Intelligence</h3>
                                    <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate max-w-50 sm:max-w-xs">
                                        {selectedNoteRecord.teacher?.name} • {selectedNoteRecord.school?.schoolName}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeAndResetModal} className="p-2.5 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Original Intelligence Details */}
                            {selectedNoteRecord.eventNote && (
                                <div className="p-5 bg-violet-500/10 border border-violet-500/20 rounded-2xl shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-2.5 flex items-center gap-2">
                                        <Star className="w-3.5 h-3.5 fill-current" /> Event Highlights
                                    </h4>
                                    <p className="text-sm font-medium leading-relaxed text-foreground">"{selectedNoteRecord.eventNote}"</p>
                                </div>
                            )}

                            {(selectedNoteRecord.status === 'Absent' || !!selectedNoteRecord.lateReason || !!selectedNoteRecord.teacherNote) && (
                                <div className="p-5 bg-muted/30 border border-border rounded-2xl space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Operations Intel
                                    </h4>

                                    {selectedNoteRecord.status === 'Absent' && (
                                        <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 border-l-4 border-l-destructive">
                                            <span className="font-bold text-[10px] uppercase tracking-wider text-destructive block mb-1">Absence Reason</span>
                                            <p className="text-sm font-medium text-foreground">"{selectedNoteRecord.teacherNote || "No reason provided."}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.lateReason && (
                                        <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 border-l-4 border-l-amber-500">
                                            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-500 block mb-1">Delayed Arrival</span>
                                            <p className="text-sm font-medium text-foreground">"{selectedNoteRecord.lateReason}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.teacherNote && selectedNoteRecord.status !== 'Absent' && (
                                        <div className="p-1">
                                            <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Standard Report</span>
                                            <p className="text-sm font-medium text-foreground leading-relaxed">"{selectedNoteRecord.teacherNote}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 p-5 bg-card border border-border rounded-2xl shadow-sm">
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5 mb-1">
                                        <Clock className="w-3 h-3" /> Arrived
                                    </span>
                                    <p className="text-base font-bold text-foreground">{formatTime(selectedNoteRecord.checkInTime) || "—"}</p>
                                </div>
                                <div className="border-l border-border pl-4">
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5 mb-1">
                                        <LogOut className="w-3 h-3" /> Departed
                                    </span>
                                    <p className="text-base font-bold text-foreground">{formatTime(selectedNoteRecord.checkOutTime) || (selectedNoteRecord.checkInTime ? "On-site" : "—")}</p>
                                </div>
                            </div>

                            {/* --- ADMIN OVERRIDE SECTION --- */}
                            <div className="mt-6 pt-6 border-t border-border border-dashed">
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Settings2 className="w-4 h-4 text-primary" /> Admin Override Options
                                    </h4>
                                    <button
                                        onClick={() => { setOverrideMode(!overrideMode); setOverrideAction(""); }}
                                        className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                                    >
                                        {overrideMode ? "Cancel Override" : "Enable Edit"}
                                    </button>
                                </div>

                                {overrideMode && (
                                    <div className="bg-muted/40 p-5 rounded-2xl border border-border space-y-5 animate-in fade-in slide-in-from-top-2">
                                        {/* Action Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {!selectedNoteRecord.checkInTime && (
                                                <button onClick={() => setOverrideAction("CheckIn")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'CheckIn' ? 'bg-emerald-500 text-white border-emerald-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-emerald-500'}`}>Check In</button>
                                            )}
                                            {selectedNoteRecord.checkInTime && !selectedNoteRecord.checkOutTime && (
                                                <button onClick={() => setOverrideAction("CheckOut")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'CheckOut' ? 'bg-blue-500 text-white border-blue-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-blue-500'}`}>Check Out</button>
                                            )}
                                            <button onClick={() => setOverrideAction("Absent")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Absent' ? 'bg-destructive text-white border-red-700 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-destructive'}`}>Absent</button>
                                            <button onClick={() => setOverrideAction("Late")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Late' ? 'bg-amber-500 text-white border-amber-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-amber-500'}`}>Late</button>
                                            <button onClick={() => setOverrideAction("Event")} className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Event' ? 'bg-violet-500 text-white border-violet-600 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-violet-500'}`}>Event</button>
                                            <button
                                                onClick={() => setOverrideAction("Revoke")}
                                                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${overrideAction === 'Revoke' ? 'bg-slate-800 text-white border-slate-900 shadow-inner scale-[0.98]' : 'bg-card text-foreground hover:border-slate-500'}`}
                                            >
                                                {selectedNoteRecord.checkOutTime ? "Undo Check Out" : "Revoke All"}
                                            </button>
                                        </div>

                                        {/* Reason Input */}
                                        {overrideAction && (
                                            <div className="space-y-4 animate-in fade-in">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Optional Reason / Note</label>
                                                    <textarea
                                                        value={overrideReason}
                                                        onChange={(e) => setOverrideReason(e.target.value)}
                                                        placeholder={`Reason for marking as ${overrideAction}...`}
                                                        className="w-full bg-card border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-24 placeholder:text-muted-foreground/50 transition-all shadow-sm"
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full font-bold h-12 rounded-xl text-base shadow-lg shadow-primary/20"
                                                    onClick={handleOverrideSubmit}
                                                    disabled={isSubmittingOverride}
                                                >
                                                    {isSubmittingOverride ? "Applying Override..." : `Confirm ${overrideAction}`}
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