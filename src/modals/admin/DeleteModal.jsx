import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const DeleteModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
    const { t } = useTranslation();

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (isDeleting) return; // Prevent closing while processing
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => { 
        if (e.target.closest('button')) return;
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

                {/* Content */}
                <div className="p-6 md:p-8 text-center pt-6 md:pt-10">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-6 shadow-inner border border-destructive/20 relative">
                        <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-50" />
                        <AlertTriangle className="w-10 h-10 relative z-10" />
                    </div>
                    
                    <h3 className="text-2xl font-extrabold text-foreground mb-3 tracking-tight">
                        {t('delete_modal.title', 'Confirm Deletion')}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed px-2">
                        {t('delete_modal.description', 'Are you sure you want to delete this item? This action is permanent and cannot be undone.')}
                    </p>
                </div>

                {/* Footer Buttons */}
                <div className="bg-muted/10 p-5 border-t border-border/50 flex flex-col gap-3 rounded-b-3xl pb-safe">
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        onTouchStart={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full flex items-center justify-center gap-2 h-12 text-sm font-bold bg-destructive text-white hover:bg-destructive/90 rounded-xl transition-all shadow-lg shadow-destructive/20 hover:shadow-destructive/30 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Trash2 className="w-5 h-5" />
                        )}
                        {isDeleting ? t('delete_modal.deleting', 'Deleting...') : t('delete_modal.confirm', 'Yes, Delete')}
                    </button>
                    
                    <button
                        onClick={handleClose}
                        disabled={isDeleting}
                        onTouchStart={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full h-12 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-transparent hover:border-border/80 disabled:opacity-50"
                    >
                        {t('delete_modal.cancel', 'Cancel')}
                    </button>
                </div>
                
            </div>
        </div>
    );
};

export default DeleteModal;