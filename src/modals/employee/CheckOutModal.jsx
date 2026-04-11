import React, { useState, useEffect, useRef } from "react";
import { LogOut, Clock, Loader2, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

const CheckOutModal = ({ isOpen, onClose, visit, overtimeMinutes, onSubmit, actionLoading }) => {
    const { t } = useTranslation();
    const [overtimeReason, setOvertimeReason] = useState("");

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    // Reset field when modal opens
    useEffect(() => {
        if (isOpen) {
            setOvertimeReason("");
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    if (!isOpen || !visit) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (actionLoading) return; // Prevent closing while processing
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
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
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    const handleSubmit = () => {
        onSubmit(visit.id, { overtimeReason });
    };

    return (
        <div className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleClose}>
            <div
                className={`bg-card w-full max-w-sm rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Red Accent Border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* HEADER SECTION */}
                <div className="p-6 md:p-8 text-center pt-6 md:pt-10">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-6 shadow-inner border border-destructive/20 relative">
                        <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-40" />
                        <LogOut className="w-10 h-10 relative z-10 ml-1" />
                    </div>

                    <h2 className="text-2xl font-extrabold text-foreground mb-2 tracking-tight">
                        {t('check_out_modal.title', 'Check Out')}
                    </h2>

                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-muted border border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-widest truncate max-w-full">
                        {visit.schoolName} ({visit.category})
                    </div>
                </div>

                {/* BODY / FORM SECTION */}
                <div className="px-6 md:px-8 pb-8 space-y-4 text-center">

                    {/* Overtime Alert & Input */}
                    {overtimeMinutes > 0 ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-1.5 text-center">
                                <Clock className="w-5 h-5 text-amber-500 mb-1" />
                                <span className="text-sm font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">
                                    {t('check_out_modal.overtime_alert', { count: overtimeMinutes })}
                                </span>
                            </div>

                            <div className="space-y-2.5 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <MessageSquareWarning className="w-3.5 h-3.5 text-amber-500" />
                                        {t('check_out_modal.overtime_reason_label', 'Overtime Reason')}
                                    </span>
                                    <span className="opacity-60 lowercase font-medium tracking-normal">(Optional)</span>
                                </Label>
                                <Textarea
                                    value={overtimeReason}
                                    onChange={(e) => setOvertimeReason(e.target.value)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    placeholder={t('check_out_modal.overtime_placeholder', 'Why did this visit run late?')}
                                    disabled={actionLoading}
                                    className="w-full min-h-25 p-4 rounded-2xl border border-border/80 bg-muted/20 text-sm focus-visible:ring-amber-500/30 resize-none transition-all shadow-sm font-medium disabled:opacity-50"
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed px-4">
                            {t('check_out_modal.confirm_msg', 'Are you sure you want to end this visit? This action cannot be undone.')}
                        </p>
                    )}
                </div>

                {/* FOOTER ACTION BUTTONS */}
                <div className="bg-muted/10 p-5 border-t border-border/50 flex flex-col gap-3 rounded-b-3xl pb-safe">
                    <Button
                        variant="destructive"
                        className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-destructive/20 hover:shadow-destructive/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                        onClick={handleSubmit}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('check_out_modal.confirm', 'Confirm Check Out')}
                    </Button>
                    <button
                        onClick={handleClose}
                        disabled={actionLoading}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="w-full h-12 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-transparent hover:border-border/80 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {t('check_out_modal.cancel', 'Cancel')}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CheckOutModal;