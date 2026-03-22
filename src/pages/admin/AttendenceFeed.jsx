import React, { useState, useEffect, useMemo } from "react";
import {
    Radio, Clock, MapPin, School, Users, FileText,
    AlertCircle, CheckCircle2, XCircle, Coffee, Star, X, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "../../api/axios";

const AttendanceFeed = () => {
    const [liveData, setLiveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");
    const [selectedNoteRecord, setSelectedNoteRecord] = useState(null);

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
        const interval = setInterval(fetchFeed, 60000);
        return () => clearInterval(interval);
    }, [activeFilter]);

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
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in pb-24 md:pb-8">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute w-4 h-4 rounded-full bg-emerald-500/20 animate-ping" />
                            <div className="relative w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Live Operations Feed</h1>
                        <Radio className="w-5 h-5 text-primary ml-1 opacity-70" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">Real-time daily board monitoring all school assignments.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm">
                    {["All", "Pending", "Running", "Completed", "Exceptions"].map((f) => (
                        <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeFilter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>{f}</button>
                    ))}
                </div>
            </div>

            {/* CARDS LIST */}
            {loading ? (
                <div className="p-12 text-center text-muted-foreground animate-pulse flex flex-col items-center"><Clock className="w-12 h-12 mb-4 opacity-20" /><h3 className="text-lg font-bold">Syncing Records...</h3></div>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedData.map((record) => {
                        const uiStatus = getDerivedStatus(record);
                        const statusConfig = getStatusConfig(uiStatus);
                        const isLate = record.status === 'Late' || !!record.lateReason;
                        const hasEvent = !!record.eventNote;
                        const isAbsent = uiStatus === 'Absent';
                        const hasDetails = !!record.checkInTime || hasEvent || isLate || !!record.teacherNote || isAbsent;

                        return (
                            <div
                                key={record._id}
                                onClick={() => hasDetails && setSelectedNoteRecord(record)}
                                className={`bg-card rounded-xl border p-4 md:p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 
                  ${hasDetails ? 'cursor-pointer hover:shadow-md group' : 'cursor-default opacity-80'} 
                  ${hasEvent ? 'border-violet-500/40 bg-violet-500/2' : 'border-border'}
                  ${isAbsent ? 'border-destructive/30 bg-destructive/2' : ''}
                `}
                            >
                                {/* 1. TEACHER INFO */}
                                <div className="flex items-center gap-4 min-w-55">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-inner ${hasEvent ? 'bg-violet-600' : (isAbsent ? 'bg-destructive' : 'bg-blue-600')}`}>
                                        {(record.teacher?.name || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{record.teacher?.name || "Unknown"}</span>
                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" /> {record.teacher?.zone || "Unassigned"}
                                        </span>
                                    </div>
                                </div>

                                {/* 2. SCHOOL INFO */}
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/20 p-3 rounded-lg border border-border/50">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5 opacity-70">School</span>
                                        <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground italic">
                                            <School className={`w-4 h-4 ${hasEvent ? 'text-violet-400' : 'text-indigo-400'}`} /> {record.school?.schoolName || "Unknown"}
                                        </span>
                                    </div>
                                    <div className="hidden sm:block w-px h-8 bg-border"></div>
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5 opacity-70">Category</span>
                                        <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground tracking-tight">
                                            <Users className={`w-4 h-4 ${hasEvent ? 'text-violet-400' : 'text-violet-400'}`} /> {record.band}
                                        </span>
                                    </div>
                                </div>

                                {/* 3. DUAL STATUS & TIME */}
                                <div className="flex items-center justify-between md:justify-end gap-6 min-w-50">
                                    <div className="flex flex-col items-start md:items-end gap-1.5">
                                        <div className="flex gap-2 items-center">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 ${statusConfig.color}`}>
                                                {statusConfig.icon} {statusConfig.label}
                                            </span>
                                            {isLate && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white border border-amber-600 animate-pulse">LATE</span>}
                                            {hasEvent && uiStatus === 'Completed' && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-violet-500 text-white border border-violet-600">EVENT</span>}
                                        </div>

                                        <div className="text-xs font-medium flex flex-col items-start md:items-end gap-0.5 mt-0.5">
                                            {record.checkInTime ? (
                                                <span className={`${isLate ? 'text-amber-500 font-bold' : 'text-foreground'}`}>In: {formatTime(record.checkInTime)}</span>
                                            ) : (
                                                <span className="text-muted-foreground opacity-50 italic text-[10px]">{isAbsent ? 'Absent' : 'Pending Check-in'}</span>
                                            )}
                                            {record.checkOutTime && <span className="text-muted-foreground font-semibold">Out: {formatTime(record.checkOutTime)}</span>}
                                        </div>
                                    </div>

                                    {/* ACTION INDICATOR */}
                                    {hasDetails && (
                                        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${hasEvent ? 'bg-violet-500/20 text-violet-500' : (isAbsent ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-blue-500')}`}>
                                                {hasEvent ? <Star className="w-4 h-4 fill-current" /> : (isAbsent ? <XCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />)}
                                            </div>
                                            <span className={`text-[9px] font-bold tracking-wider ${hasEvent ? 'text-violet-500' : (isAbsent ? 'text-red-500' : 'text-blue-500')}`}>
                                                {hasEvent ? 'EVENT' : (isAbsent ? 'ABSENT' : 'LOGS')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- DRILL-DOWN MODAL (IMPROVED UI) --- */}
            {selectedNoteRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedNoteRecord(null)}>
                    <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>

                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${!!selectedNoteRecord.eventNote ? 'bg-violet-600' : (selectedNoteRecord.status === 'Absent' ? 'bg-destructive' : 'bg-blue-600')} text-white`}>
                                    {!!selectedNoteRecord.eventNote ? <Star className="w-5 h-5 fill-current" /> : (selectedNoteRecord.status === 'Absent' ? <XCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />)}
                                </div>
                                <div><h3 className="font-bold text-lg leading-tight">Field Intelligence</h3><p className="text-xs text-muted-foreground">{selectedNoteRecord.teacher?.name} • {selectedNoteRecord.school?.schoolName}</p></div>
                            </div>
                            <button onClick={() => setSelectedNoteRecord(null)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 ${getStatusConfig(getDerivedStatus(selectedNoteRecord)).color}`}>
                                    {getStatusConfig(getDerivedStatus(selectedNoteRecord)).icon} {getDerivedStatus(selectedNoteRecord)}
                                </span>
                                {(selectedNoteRecord.status === 'Late' || !!selectedNoteRecord.lateReason) && <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Late Arrival</span>}
                            </div>

                            {/* EVENT HIGHLIGHTS BLOCK */}
                            {selectedNoteRecord.eventNote && (
                                <div className="p-5 bg-violet-600/10 border border-violet-500/30 rounded-xl text-violet-700 dark:text-violet-300">
                                    <h4 className="text-[10px] font-black uppercase text-violet-600 mb-2 flex items-center gap-2">
                                        <Star className="w-4 h-4 fill-current" /> Event Highlights
                                    </h4>
                                    <p className="text-sm italic font-medium leading-relaxed">"{selectedNoteRecord.eventNote}"</p>
                                </div>
                            )}

                            {/* FIELD INTELLIGENCE BLOCK */}
                            {(selectedNoteRecord.status === 'Absent' || !!selectedNoteRecord.lateReason || !!selectedNoteRecord.teacherNote) && (
                                <div className="p-5 bg-muted/20 border border-border rounded-xl space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-1 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Field Intelligence
                                    </h4>

                                    {selectedNoteRecord.status === 'Absent' && (
                                        <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/20 border-l-4 border-l-red-500">
                                            <span className="font-bold text-[10px] uppercase text-red-600 block mb-1">Absence Reason</span>
                                            <p className="text-sm italic text-red-900 font-medium">"{selectedNoteRecord.teacherNote || "Staff did not provide a specific reason."}"</p>
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

                            {/* TIMELINE GRID */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-card border border-border rounded-xl">
                                <div><span className="text-[9px] font-bold text-muted-foreground uppercase">Clock-In</span><p className="text-sm font-bold">{formatTime(selectedNoteRecord.checkInTime) || "—"}</p></div>
                                <div><span className="text-[9px] font-bold text-muted-foreground uppercase">Clock-Out</span><p className="text-sm font-bold">{formatTime(selectedNoteRecord.checkOutTime) || (selectedNoteRecord.checkInTime ? "Active" : "—")}</p></div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border flex justify-end bg-muted/10">
                            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setSelectedNoteRecord(null)}>Close Operations Feed</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceFeed;