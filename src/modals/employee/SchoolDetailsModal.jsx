import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, Clock, MapPin, UserX, PartyPopper, ChevronRight, ChevronLeft, CalendarDays, Plus, CalendarOff, School, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

import AddEventModal from "./AddEventModal";

const SchoolDetailsModal = ({ isOpen, onClose, school, onRefresh }) => {
    const { t } = useTranslation();
    const [activeCategory, setActiveCategory] = useState(null);

    // Modal States
    const [eventModalData, setEventModalData] = useState({ isOpen: false, categoryName: null });
    const [isSavingEvent, setIsSavingEvent] = useState(false);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setActiveCategory(null);
            setEventModalData({ isOpen: false, categoryName: null });
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen, school]);

    if (!isOpen || !school) return null;

    // --- ANIMATION HANDLERS ---
    const handleCloseModal = () => {
        if (isSavingEvent) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.overflow-y-auto')) return;
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

    const handleSaveEvent = async (eventData) => {
        setIsSavingEvent(true);
        const toastId = toast.loading(t('school_details.toast_saving_event'));
        try {
            const payload = {
                ...eventData,
                schoolId: school.id,
                band: eventModalData.categoryName
            };
            await api.post('/employee/events', payload);
            toast.success(t('school_details.toast_event_success'), { id: toastId });
            setEventModalData({ isOpen: false, categoryName: null });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Event save error:", error);
            toast.error(t('school_details.toast_event_error') + (error.response?.data?.message || ""), { id: toastId });
        } finally {
            setIsSavingEvent(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleCloseModal}>
            <div 
                className={`bg-card w-full max-w-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border-t md:border border-border/50 flex flex-col relative max-h-[90vh] md:max-h-[85vh] overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} 
                style={{ transform: `translateY(${dragOffset}px)` }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 px-6 py-5 border-b border-border/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 pr-4">
                        {activeCategory ? (
                            <button onClick={() => setActiveCategory(null)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-muted/50 hover:bg-muted flex items-center justify-center shrink-0 border border-border/60 transition-colors group">
                                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        ) : (
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <School className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-black text-foreground truncate leading-tight tracking-tight">
                                {school.name}
                            </h2>
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest truncate flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-primary/70 shrink-0" /> {school.address}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleCloseModal} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-card">

                    {/* VIEW 1: CATEGORY SELECTION */}
                    {!activeCategory ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ml-1">
                                <CalendarDays className="w-4 h-4 text-primary/70" /> {t('school_details.assigned_categories')}
                            </h3>

                            <div className="grid gap-3">
                                {school.categories.map((category, idx) => (
                                    <div key={idx} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-3xl bg-muted/10 border border-border/60 hover:border-primary/40 hover:bg-muted/20 hover:shadow-md transition-all duration-300">
                                        <div className="flex-1 cursor-pointer min-w-0" onClick={() => setActiveCategory(category)}>
                                            <div className="flex items-center gap-3.5 mb-1 sm:mb-0">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-extrabold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors truncate">
                                                        {category.name}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                                        {t('school_details.category_subtitle')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 mt-4 sm:mt-0 shrink-0 pl-14 sm:pl-0">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-10 rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 font-bold px-4 transition-all active:scale-95"
                                                onClick={(e) => { e.stopPropagation(); setEventModalData({ isOpen: true, categoryName: category.name }); }}
                                            >
                                                <Plus className="w-4 h-4 mr-1.5" /> {t('school_details.btn_event')}
                                            </Button>

                                            <div onClick={() => setActiveCategory(category)} className="w-10 h-10 rounded-xl bg-background border border-border group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95">
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-current" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (

                        /* VIEW 2: 30-DAY CATEGORY RECORD */
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            
                            <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/20 p-4 sm:p-5 rounded-4xl border border-border/50">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                        <Users className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-foreground tracking-tight">{activeCategory.name}</h3>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('school_details.last_30_days')}</p>
                                    </div>
                                </div>
                                <Button onClick={() => setEventModalData({ isOpen: true, categoryName: activeCategory.name })} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 w-full sm:w-auto">
                                    <Plus className="w-4 h-4 mr-1.5" /> {t('school_details.btn_log_event')}
                                </Button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                                    <p className="text-3xl font-black text-emerald-500 leading-none">{activeCategory.stats.present || 0}</p>
                                    <p className="text-[10px] uppercase font-black text-emerald-600/80 dark:text-emerald-400/80 mt-1.5 tracking-widest">{t('school_details.stat_present') || 'PRESENT'}</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                    <Clock className="w-5 h-5 text-amber-500 mb-2" />
                                    <p className="text-3xl font-black text-amber-500 leading-none">{activeCategory.stats.late || 0}</p>
                                    <p className="text-[10px] uppercase font-black text-amber-600/80 dark:text-amber-400/80 mt-1.5 tracking-widest">{t('school_details.stat_late') || 'LATE'}</p>
                                </div>
                                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                    <UserX className="w-5 h-5 text-destructive mb-2" />
                                    <p className="text-3xl font-black text-destructive leading-none">{activeCategory.stats.absent || 0}</p>
                                    <p className="text-[10px] uppercase font-black text-destructive/80 dark:text-red-400/80 mt-1.5 tracking-widest">{t('school_details.stat_absent') || 'ABSENT'}</p>
                                </div>
                                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                    <CalendarOff className="w-5 h-5 text-purple-500 mb-2" />
                                    <p className="text-3xl font-black text-purple-500 leading-none">{activeCategory.stats.leaves || 0}</p>
                                    <p className="text-[10px] uppercase font-black text-purple-600/80 dark:text-purple-400/80 mt-1.5 tracking-widest">{t('school_details.stat_leaves') || 'LEAVES'}</p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm col-span-2 sm:col-span-1">
                                    <PartyPopper className="w-5 h-5 text-blue-500 mb-2" />
                                    <p className="text-3xl font-black text-blue-500 leading-none">{activeCategory.stats.events || 0}</p>
                                    <p className="text-[10px] uppercase font-black text-blue-600/80 dark:text-blue-400/80 mt-1.5 tracking-widest">{t('school_details.stat_events') || 'EVENTS'}</p>
                                </div>
                            </div>

                            {/* Timeline Log */}
                            <div className="pt-2">
                                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2 ml-1">
                                    <FileText className="w-4 h-4 text-primary/70" /> {t('school_details.timeline_title')}
                                </h3>
                                
                                <div className="space-y-0 pl-2">
                                    {activeCategory.history.length > 0 ? (
                                        activeCategory.history.map((log, idx) => {
                                            const isLast = idx === activeCategory.history.length - 1;
                                            
                                            let dotColor = 'bg-blue-500';
                                            let badgeClass = 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
                                            
                                            if (log.status === 'Present') { 
                                                dotColor = 'bg-emerald-500'; 
                                                badgeClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'; 
                                            } else if (log.status === 'Late') { 
                                                dotColor = 'bg-amber-500'; 
                                                badgeClass = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'; 
                                            } else if (log.status === 'Absent') { 
                                                dotColor = 'bg-destructive'; 
                                                badgeClass = 'text-destructive dark:text-red-400 bg-destructive/10 border-destructive/20'; 
                                            } else if (log.status === 'Leave' || log.status === 'Holiday') { 
                                                dotColor = 'bg-purple-500'; 
                                                badgeClass = 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20'; 
                                            }

                                            return (
                                                <div key={idx} className="flex gap-4 relative">
                                                    <div className="flex flex-col items-center relative z-10">
                                                        <div className={`w-3.5 h-3.5 rounded-full shrink-0 border-[3px] border-card shadow-sm ${dotColor}`} />
                                                        {!isLast && <div className="w-0.5 h-full bg-border my-1.5 rounded-full" />}
                                                    </div>
                                                    <div className="flex-1 pb-8 -mt-1.5">
                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                            <p className="font-extrabold text-sm sm:text-base text-foreground">{log.date}</p>
                                                            <span className={`text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${badgeClass}`}>
                                                                {log.status === 'Event' && <PartyPopper className="w-3 h-3" />}
                                                                {log.status === 'Leave' && <CalendarOff className="w-3 h-3" />}
                                                                {t(`school_details.statuses.${log.status}`) || log.status}
                                                            </span>
                                                        </div>
                                                        {log.note && (
                                                            <div className={`p-4 sm:p-5 rounded-2xl border ${log.status === 'Event' ? 'bg-blue-500/5 border-blue-500/20 shadow-sm' : 'bg-muted/30 border-border/50'}`}>
                                                                <p className={`text-sm font-medium leading-relaxed ${log.status === 'Event' ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground italic'}`}>
                                                                    {log.status === 'Event' && <strong className="mr-2 font-black uppercase tracking-wider block mb-1">{t('school_details.timeline_description')}</strong>}
                                                                    "{log.note}"
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-12 bg-muted/10 rounded-4xl border-2 border-border/50 border-dashed text-center flex flex-col items-center justify-center">
                                            <CalendarDays className="w-8 h-8 text-muted-foreground/30 mb-3" />
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('school_details.no_records')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* EVENT CREATION MODAL */}
            <AddEventModal
                isOpen={eventModalData.isOpen}
                onClose={() => setEventModalData({ isOpen: false, categoryName: null })}
                targetSchool={school.name}
                targetCategory={eventModalData.categoryName}
                onSubmit={handleSaveEvent}
                actionLoading={isSavingEvent}
            />
        </div>
    );
};

export default SchoolDetailsModal;