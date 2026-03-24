import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
// 1. Import your custom api instance
import api from "../../api/axios";
import { X, CheckCircle2, Clock, MapPin, UserX, PartyPopper, ChevronRight, ChevronLeft, CalendarDays, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

import AddEventModal from "./AddEventModal";
import MediaUploadModal from "./MediaUploadModal";

const SchoolDetailsModal = ({ isOpen, onClose, school, onRefresh }) => {
    // Note: We no longer need 'token' here because 'api' handles headers automatically
    const [activeCategory, setActiveCategory] = useState(null);

    // Modal States
    const [eventModalData, setEventModalData] = useState({ isOpen: false, categoryName: null });
    const [mediaModalData, setMediaModalData] = useState({ isOpen: false, categoryName: null });
    const [isSavingEvent, setIsSavingEvent] = useState(false);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveCategory(null);
            setEventModalData({ isOpen: false, categoryName: null });
            setMediaModalData({ isOpen: false, categoryName: null });
        }
    }, [isOpen, school]);

    if (!isOpen || !school) return null;

    // --- API HANDLERS ---

    // 2. Updated Event Handler
    const handleSaveEvent = async (eventData) => {
        setIsSavingEvent(true);
        try {
            const payload = {
                ...eventData,
                schoolId: school.id,
                band: eventModalData.categoryName
            };

            // Use 'api' and remove /api prefix + manual headers
            await api.post('/employee/events', payload);

            setEventModalData({ isOpen: false, categoryName: null });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Event save error:", error);
            alert("Failed to save event. " + (error.response?.data?.message || ""));
        } finally {
            setIsSavingEvent(false);
        }
    };

    // 3. Updated Media Handler
    const handleUploadMedia = async (mediaData) => {
        setIsUploadingMedia(true);
        try {
            const payload = {
                ...mediaData,
                schoolId: school.id,
                band: mediaModalData.categoryName
            };

            // Use 'api' and remove /api prefix + manual headers
            await api.post('/employee/media', payload);

            setMediaModalData({ isOpen: false, categoryName: null });
        } catch (error) {
            console.error("Media upload error:", error);
            alert("Failed to upload media. " + (error.response?.data?.message || ""));
        } finally {
            setIsUploadingMedia(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] transition-all duration-300 ease-out animate-in zoom-in-95 fade-in overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-border flex items-start justify-between bg-muted/30 shrink-0">
                    <div className="flex items-start gap-3">
                        {activeCategory && (
                            <button onClick={() => setActiveCategory(null)} className="mt-0.5 p-1.5 hover:bg-muted rounded-full transition-colors border border-transparent hover:border-border">
                                <ChevronLeft className="w-5 h-5 text-foreground" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                {school.name}
                            </h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5" /> {school.address}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                    {/* VIEW 1: CATEGORY SELECTION */}
                    {!activeCategory ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" /> Assigned Categories
                            </h3>

                            <div className="grid gap-4">
                                {school.categories.map((category, idx) => (
                                    <div key={idx} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-background border border-border hover:border-primary hover:shadow-md transition-all duration-200">

                                        <div className="flex-1 cursor-pointer" onClick={() => setActiveCategory(category)}>
                                            <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                                                {category.name}
                                            </span>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                View 30-day attendance record & past events
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
                                            <Button variant="outline" size="sm" className="h-9 rounded-lg"
                                                onClick={(e) => { e.stopPropagation(); setMediaModalData({ isOpen: true, categoryName: category.name }); }}>
                                                <Camera className="w-4 h-4 sm:mr-1.5" />
                                                <span className="hidden sm:inline">Upload</span>
                                            </Button>

                                            <Button variant="outline" size="sm" className="h-9 rounded-lg border-blue-500/30 text-blue-600 hover:bg-blue-500/10 hover:border-blue-500/50"
                                                onClick={(e) => { e.stopPropagation(); setEventModalData({ isOpen: true, categoryName: category.name }); }}>
                                                <Plus className="w-4 h-4 mr-1.5" /> Event
                                            </Button>

                                            <div onClick={() => setActiveCategory(category)} className="w-9 h-9 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors cursor-pointer ml-1">
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (

                        /* VIEW 2: 30-DAY CATEGORY RECORD */
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                            <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {activeCategory.name}
                                    </span>
                                    <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Last 30 Days</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setMediaModalData({ isOpen: true, categoryName: activeCategory.name })} className="h-8 rounded-lg text-xs">
                                        <Camera className="w-3.5 h-3.5 mr-1.5" /> Media
                                    </Button>
                                    <Button size="sm" onClick={() => setEventModalData({ isOpen: true, categoryName: activeCategory.name })} className="h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-sm text-xs">
                                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Log Event
                                    </Button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                                    <p className="text-2xl font-bold text-emerald-500 leading-none">{activeCategory.stats.present}</p>
                                    <p className="text-[10px] uppercase font-bold text-emerald-500/70 mt-1 tracking-wider">Present</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <Clock className="w-6 h-6 text-amber-500 mb-2" />
                                    <p className="text-2xl font-bold text-amber-500 leading-none">{activeCategory.stats.late}</p>
                                    <p className="text-[10px] uppercase font-bold text-amber-500/70 mt-1 tracking-wider">Late</p>
                                </div>
                                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <UserX className="w-6 h-6 text-destructive mb-2" />
                                    <p className="text-2xl font-bold text-destructive leading-none">{activeCategory.stats.absent}</p>
                                    <p className="text-[10px] uppercase font-bold text-destructive/70 mt-1 tracking-wider">Absent</p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <PartyPopper className="w-6 h-6 text-blue-500 mb-2" />
                                    <p className="text-2xl font-bold text-blue-500 leading-none">{activeCategory.stats.events}</p>
                                    <p className="text-[10px] uppercase font-bold text-blue-500/70 mt-1 tracking-wider">Events</p>
                                </div>
                            </div>

                            {/* Timeline Log */}
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Timeline</h3>
                                <div className="space-y-4">
                                    {activeCategory.history.length > 0 ? (
                                        activeCategory.history.map((log, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className="flex flex-col items-center mt-1">
                                                    <div className={`w-3 h-3 rounded-full shrink-0 ${log.status === 'Present' ? 'bg-emerald-500' : log.status === 'Late' ? 'bg-amber-500' : log.status === 'Absent' ? 'bg-destructive' : 'bg-blue-500'}`} />
                                                    {idx !== activeCategory.history.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                        <p className="font-bold text-sm text-foreground">{log.date}</p>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${log.status === 'Present' ? 'text-emerald-500 bg-emerald-500/10' : log.status === 'Late' ? 'text-amber-500 bg-amber-500/10' : log.status === 'Absent' ? 'text-destructive bg-destructive/10' : 'text-blue-500 bg-blue-500/10'}`}>
                                                            {log.status === 'Event' && <PartyPopper className="w-3 h-3" />}
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                    {log.note && (
                                                        <div className={`p-3 rounded-lg border mt-2 ${log.status === 'Event' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-muted/50 border-border/50'}`}>
                                                            <p className={`text-sm flex items-start gap-2 ${log.status === 'Event' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-muted-foreground italic'}`}>
                                                                {log.status === 'Event' ? <strong className="shrink-0">Description:</strong> : null}
                                                                {log.note}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl border border-border border-dashed">
                                            No attendance records found for the last 30 days.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals rendered on top (z-[60]) */}
            <AddEventModal
                isOpen={eventModalData.isOpen}
                onClose={() => setEventModalData({ isOpen: false, categoryName: null })}
                targetSchool={school.name}
                targetCategory={eventModalData.categoryName}
                onSubmit={handleSaveEvent}
                actionLoading={isSavingEvent}
            />

            <MediaUploadModal
                isOpen={mediaModalData.isOpen}
                onClose={() => setMediaModalData({ isOpen: false, categoryName: null })}
                targetSchool={school.name}
                targetCategory={mediaModalData.categoryName}
                onSubmit={handleUploadMedia}
                actionLoading={isUploadingMedia}
            />

        </div>
    );
};

export default SchoolDetailsModal;