import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Radio, Clock, MapPin, School, Users, FileText,
    AlertCircle, CheckCircle2, XCircle, Coffee, Star, X, Timer, Filter, ChevronDown, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "../../api/axios";

const AttendanceFeed = () => {
    // --- STATE ---
    const [liveData, setLiveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedNoteRecord, setSelectedNoteRecord] = useState(null);

    const filterRef = useRef(null);

    // --- FETCH & POLL DATA ---
    useEffect(() => {
        const fetchFeed = async () => {
            setLoading(true);
            try {
                const queryStatus = activeFilter.toLowerCase();
                const response = await api.get(`/admin/daily-feed?status=${queryStatus}`);
                if (response.data.success) {
                    setLiveData(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch live feed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
        const interval = setInterval(fetchFeed, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [activeFilter]);

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

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in pb-24 md:pb-8">

            {/* --- HEADER SECTION --- */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-4 h-4 rounded-full bg-emerald-500/20 animate-ping" />
                        <div className="relative w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Live Operations</h1>
                </div>

                {/* --- FLOATING FILTER BOX --- */}
                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all active:scale-95"
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold hidden sm:inline">{activeFilter}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFilterOpen && (
                        <div className="absolute right-0 mt-3 w-64 sm:w-80 bg-card border border-border shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {["All", "Pending", "Running", "Completed", "Exceptions"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => { setActiveFilter(f); setIsFilterOpen(false); }}
                                        className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border text-center ${activeFilter === f ? "bg-primary/10 text-primary border-primary" : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted"
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

            {/* --- FEED CARDS --- */}
            {loading ? (
                <div className="p-12 text-center animate-pulse flex flex-col items-center border border-dashed border-border rounded-3xl">
                    <Clock className="w-10 h-10 mb-4 opacity-20" />
                    <h3 className="text-base font-bold text-muted-foreground">Syncing Field Data...</h3>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedData.map((record) => {
                        const uiStatus = getDerivedStatus(record);
                        const statusConfig = getStatusConfig(uiStatus);

                        // LOGIC PRESERVATION: Check for these even if completed
                        const isLate = record.status === 'Late' || !!record.lateReason;
                        const hadEvent = !!record.eventNote;
                        const isAbsent = uiStatus === 'Absent';
                        const hasDetails = !!record.checkInTime || hadEvent || isLate || !!record.teacherNote || isAbsent;

                        return (
                            <div
                                key={record._id}
                                onClick={() => hasDetails && setSelectedNoteRecord(record)}
                                className={`bg-card rounded-2xl border p-3 sm:p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 
                  ${hasDetails ? 'cursor-pointer hover:shadow-md group active:scale-[0.99]' : 'cursor-default opacity-80'} 
                  ${hadEvent ? 'border-violet-500/40 bg-violet-500/2' : 'border-border'}
                  ${isAbsent ? 'border-destructive/30 bg-destructive/1' : ''}
                `}
                            >
                                {/* 1. TEACHER INFO */}
                                <div className="flex items-center gap-3 sm:gap-4 md:w-56 shrink-0">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-inner ${hadEvent ? 'bg-violet-600' : (isAbsent ? 'bg-destructive' : 'bg-blue-600')}`}>
                                        {(record.teacher?.name || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">{record.teacher?.name || "Unknown"}</span>
                                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" /> {record.teacher?.zone || "Unassigned"}
                                        </span>
                                    </div>
                                </div>

                                {/* 2. SCHOOL & BAND GRID */}
                                <div className="flex-1 grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                                    <div className="min-w-0">
                                        <span className="text-[8px] font-bold uppercase text-muted-foreground block mb-0.5 opacity-70">Location</span>
                                        <span className="text-[11px] sm:text-xs font-bold text-foreground truncate block italic">{record.school?.schoolName || "Unknown"}</span>
                                    </div>
                                    <div className="min-w-0 border-l border-border/50 pl-3">
                                        <span className="text-[8px] font-bold uppercase text-muted-foreground block mb-0.5 opacity-70">Category</span>
                                        <span className="text-[11px] sm:text-xs font-bold text-foreground truncate block">{record.band}</span>
                                    </div>
                                </div>

                                {/* 3. DUAL STATUS & ACTIONS */}
                                <div className="flex items-center justify-between md:justify-end gap-4 lg:gap-6 md:w-64 shrink-0">
                                    <div className="flex flex-col items-start md:items-end gap-1.5">
                                        <div className="flex gap-2 items-center">
                                            <span className={`px-2 py-0.5 sm:py-1 rounded-md text-[8px] sm:text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1 sm:gap-1.5 ${statusConfig.color}`}>
                                                {statusConfig.icon} {statusConfig.label}
                                            </span>
                                            {isLate && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white animate-pulse">LATE</span>}
                                            {hadEvent && uiStatus === 'Completed' && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-500 text-white">EVENT</span>}
                                        </div>
                                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                                            {record.checkInTime ? `In: ${formatTime(record.checkInTime)}` : (isAbsent ? 'Off Duty' : 'Pending')}
                                            {record.checkOutTime && ` • Out: ${formatTime(record.checkOutTime)}`}
                                        </div>
                                    </div>

                                    {hasDetails && (
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${hadEvent ? 'bg-violet-500/20 text-violet-500' : (isAbsent ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-blue-500')}`}>
                                            {hadEvent ? <Star className="w-4 h-4 fill-current" /> : (isAbsent ? <XCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- HIGH-FIDELITY MODAL --- */}
            {selectedNoteRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedNoteRecord(null)}>
                    <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${!!selectedNoteRecord.eventNote ? 'bg-violet-600' : (selectedNoteRecord.status === 'Absent' ? 'bg-destructive' : 'bg-blue-600')} text-white`}>
                                    {!!selectedNoteRecord.eventNote ? <Star className="w-5 h-5 fill-current" /> : (selectedNoteRecord.status === 'Absent' ? <XCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">Field Intelligence</h3>
                                    <p className="text-xs text-muted-foreground">{selectedNoteRecord.teacher?.name} • {selectedNoteRecord.school?.schoolName}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedNoteRecord(null)} className="p-2 hover:bg-muted rounded-full text-muted-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Event Block */}
                            {selectedNoteRecord.eventNote && (
                                <div className="p-5 bg-violet-600/10 border border-violet-500/20 rounded-2xl">
                                    <h4 className="text-[10px] font-black uppercase text-violet-600 mb-2 flex items-center gap-2"><Star className="w-3.5 h-3.5 fill-current" /> Event Highlights</h4>
                                    <p className="text-sm italic font-medium leading-relaxed">"{selectedNoteRecord.eventNote}"</p>
                                </div>
                            )}

                            {/* Intelligence Blocks */}
                            {(selectedNoteRecord.status === 'Absent' || !!selectedNoteRecord.lateReason || !!selectedNoteRecord.teacherNote) && (
                                <div className="p-5 bg-muted/20 border border-border rounded-2xl space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Operations Intel</h4>

                                    {selectedNoteRecord.status === 'Absent' && (
                                        <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/20 border-l-4 border-l-red-500">
                                            <span className="font-bold text-[10px] uppercase text-red-600 block mb-1">Absence Reason</span>
                                            <p className="text-sm italic text-red-900 font-medium">"{selectedNoteRecord.teacherNote || "No reason provided."}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.lateReason && (
                                        <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 border-l-4 border-l-amber-500">
                                            <span className="font-bold text-[10px] uppercase text-amber-600 block mb-1">Delayed Arrival</span>
                                            <p className="text-sm italic text-amber-900 font-medium">"{selectedNoteRecord.lateReason}"</p>
                                        </div>
                                    )}

                                    {selectedNoteRecord.teacherNote && selectedNoteRecord.status !== 'Absent' && (
                                        <div>
                                            <span className="font-bold text-[10px] uppercase text-muted-foreground block mb-1">Standard Report</span>
                                            <p className="text-sm italic text-foreground/80 leading-relaxed">"{selectedNoteRecord.teacherNote}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Grid Footer */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-card border border-border rounded-xl">
                                <div><span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Arrived</span><p className="text-sm font-bold">{formatTime(selectedNoteRecord.checkInTime) || "—"}</p></div>
                                <div><span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1"><LogOut className="w-2.5 h-2.5" /> Departed</span><p className="text-sm font-bold">{formatTime(selectedNoteRecord.checkOutTime) || (selectedNoteRecord.checkInTime ? "On-site" : "—")}</p></div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border flex justify-end bg-muted/10">
                            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setSelectedNoteRecord(null)}>Close Dashboard</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceFeed;