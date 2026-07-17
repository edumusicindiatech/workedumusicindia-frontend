import React, { useState, useEffect, useRef } from "react";
import { PartyPopper, Calendar, Clock, FileText, Loader2, X, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

const AddEventModal = ({ isOpen, onClose, onSubmit, targetSchool, targetCategory, actionLoading }) => {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [timeFrom, setTimeFrom] = useState("");
    const [timeTo, setTimeTo] = useState("");
    const [description, setDescription] = useState("");

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setStartDate("");
            setEndDate("");
            setTimeFrom("");
            setTimeTo("");
            setDescription("");
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (actionLoading) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
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
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    const handleSubmit = () => {
        onSubmit({
            schoolName: targetSchool,
            categoryName: targetCategory,
            startDate,
            endDate: endDate || startDate,
            timeFrom,
            timeTo,
            description: description.trim()
        });
    };

    const isFormValid = startDate && timeFrom && timeTo && description.trim();

    return (
        <div className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleClose}>
            <div
                className={`bg-card w-full max-w-lg rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Blue Accent Border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500/40 via-blue-500 to-blue-500/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* HEADER SECTION */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 px-6 py-5 border-b border-border/50 flex items-center justify-between shrink-0 touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="flex items-center gap-4 pr-4 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-inner">
                            <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                                {t('add_event_modal.title', 'Log Event')}
                            </h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 truncate max-w-50 sm:max-w-62.5">
                                {targetSchool} • {targetCategory}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} disabled={actionLoading} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* BODY / FORM SECTION */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">

                    {/* Dates Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1 flex items-center gap-1.5">
                                {t('add_event_modal.from_date', 'Start Date')} <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-12 pl-10 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-blue-500/30 font-medium scheme-light dark:scheme-dark"
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1 flex items-center justify-between">
                                <span>{t('add_event_modal.to_date', 'End Date')}</span>
                                <span className="lowercase font-medium tracking-normal opacity-60">({t('add_event_modal.optional', 'Optional')})</span>
                            </Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    min={startDate}
                                    className="h-12 pl-10 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-blue-500/30 font-medium scheme-light dark:scheme-dark"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Times Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1 flex items-center gap-1.5">
                                {t('add_event_modal.start_time', 'Start Time')} <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="time"
                                    value={timeFrom}
                                    onChange={(e) => setTimeFrom(e.target.value)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-12 pl-10 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-blue-500/30 font-medium scheme-light dark:scheme-dark"
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1 flex items-center gap-1.5">
                                {t('add_event_modal.end_time', 'End Time')} <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="time"
                                    value={timeTo}
                                    onChange={(e) => setTimeTo(e.target.value)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-12 pl-10 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-blue-500/30 font-medium scheme-light dark:scheme-dark"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1 flex items-center gap-1.5">
                            {t('add_event_modal.description_label', 'Event Description')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onPointerDown={(e) => e.stopPropagation()}
                                placeholder={t('add_event_modal.description_placeholder', 'Describe what this event is about...')}
                                className="w-full min-h-30 pl-10 p-4 rounded-2xl border border-border/80 bg-muted/20 text-sm focus-visible:ring-blue-500/30 resize-none transition-all shadow-sm font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* FOOTER ACTION BUTTONS */}
                <div className="bg-muted/10 p-4 sm:p-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-end gap-3 rounded-b-3xl pb-safe shrink-0">
                    <Button
                        variant="ghost"
                        className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors sm:order-1 order-2"
                        onClick={handleClose}
                        disabled={actionLoading}
                    >
                        {t('add_event_modal.cancel', 'Cancel')}
                    </Button>
                    <Button
                        className="w-full sm:w-auto h-12 px-10 rounded-xl font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 bg-blue-500 hover:bg-blue-600 text-white hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none sm:order-2 order-1"
                        onClick={handleSubmit}
                        disabled={!isFormValid || actionLoading}
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PartyPopper className="w-4 h-4 mr-2" />}
                        {actionLoading ? t('add_event_modal.saving', 'Saving...') : t('add_event_modal.save_event', 'Log Event')}
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default AddEventModal;