import React, { useState, useEffect, useRef } from "react";
import { LogOut, Clock, Loader2, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

const CheckOutModal = ({ isOpen, onClose, visit, overtimeMinutes, onSubmit, actionLoading }) => {
    const { t } = useTranslation();
    const [overtimeReason, setOvertimeReason] = useState("");
    const [isClosing, setIsClosing] = useState(false);

    // High-Performance Animation Refs (Replaces State)
    const modalRef = useRef(null);
    const dragStartY = useRef(0);
    const currentDragY = useRef(0);

    // Reset field when modal opens
    useEffect(() => {
        if (isOpen) {
            setOvertimeReason("");
            setIsClosing(false);
            
            // Reset position when opened
            if (modalRef.current) {
                modalRef.current.style.transform = 'translateY(0px)';
                modalRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            }
        }
    }, [isOpen]);

    if (!isOpen || !visit) return null;

    // --- NATIVE 60FPS DRAG HANDLERS ---
    const handleTouchStart = (e) => {
        // Prevent dragging if the user is interacting with form elements
        if (e.target.closest('button') || e.target.closest('textarea')) return;
        
        dragStartY.current = e.touches[0].clientY;
        if (modalRef.current) {
            // Remove transition during drag for 1:1 finger tracking (Zero lag)
            modalRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e) => {
        if (dragStartY.current === 0) return; // Prevent stray moves

        const delta = e.touches[0].clientY - dragStartY.current;
        
        // Only allow dragging downwards
        if (delta > 0) {
            currentDragY.current = delta;
            if (modalRef.current) {
                // Direct GPU manipulation bypassing React lifecycle
                modalRef.current.style.transform = `translateY(${delta}px)`;
            }
        }
    };

    const handleTouchEnd = () => {
        dragStartY.current = 0;

        if (modalRef.current) {
            // Re-enable smooth spring transition for the snap
            modalRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            
            // If dragged down more than 120px, close it. Otherwise, snap back up.
            if (currentDragY.current > 120 && !actionLoading) {
                handleClose();
            } else {
                modalRef.current.style.transform = 'translateY(0px)';
            }
        }
        currentDragY.current = 0;
    };

    const handleClose = () => {
        if (actionLoading) return; // Prevent closing while processing
        setIsClosing(true);
        
        // Trigger exit animation natively
        if (modalRef.current) {
            modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            modalRef.current.style.transform = 'translateY(100%)';
        }

        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    const handleSubmit = () => {
        onSubmit(visit.id, { overtimeReason });
    };

    return (
        <div className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none pointer-events-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleClose}>
            
            <div
                ref={modalRef}
                className={`bg-card w-full max-w-sm rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative overflow-hidden will-change-transform ${!isClosing ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95' : ''}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Red Accent Border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40 z-20 pointer-events-none" />

                {/* --- HEADER SECTION (Drag Target Area) --- */}
                <div 
                    className="w-full touch-none cursor-grab active:cursor-grabbing shrink-0"
                    onTouchStart={handleTouchStart} 
                    onTouchMove={handleTouchMove} 
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Mobile Drag Handle */}
                    <div className="w-full flex justify-center pt-4 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                    </div>

                    <div className="p-6 md:p-8 text-center pt-2 md:pt-10 pointer-events-none">
                        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-6 shadow-inner border border-destructive/20 relative pointer-events-auto">
                            <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-40" />
                            <LogOut className="w-10 h-10 relative z-10 ml-1" />
                        </div>

                        <h2 className="text-2xl font-extrabold text-foreground mb-4 tracking-tight">
                            {t('check_out_modal.title', 'Check Out')}
                        </h2>

                        <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-muted border border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-widest truncate max-w-full">
                            {visit.schoolName} ({visit.category})
                        </div>
                    </div>
                </div>

                {/* --- BODY / FORM SECTION --- */}
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
                                    onPointerDown={(e) => e.stopPropagation()} // Prevents drag events when trying to select text
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

                {/* --- FOOTER ACTION BUTTONS --- */}
                <div className="bg-muted/10 p-5 border-t border-border/50 flex flex-col gap-3 rounded-b-[inherit] pb-safe shrink-0">
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