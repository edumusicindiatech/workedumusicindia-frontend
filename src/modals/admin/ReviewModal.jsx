import { useState, useEffect, useRef } from "react";
import {
    School, CheckCircle2, X, AlertTriangle, Plus, Minus, MessageSquare, Loader2, PlayCircle, Star
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ReviewModal = ({ isOpen, onClose, activeReview, reviewMarks, setReviewMarks, reviewRemark, setReviewRemark, submitReview, isSubmitting, videoErrors, handleVideoError, selectedSchool }) => {
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

    if (!isOpen || !activeReview) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (isSubmitting) return;
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

    const incrementMarks = () => setReviewMarks(prev => Math.min(10, Number(prev) + 1));
    const decrementMarks = () => setReviewMarks(prev => Math.max(0, Number(prev) - 1));

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300 md:p-6 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`} onClick={!isSubmitting ? handleClose : undefined}>
            <div
                className={`bg-card w-full max-w-6xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border-t md:border border-border/50 flex flex-col lg:flex-row max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >
                {/* --- TOP ACCENT BORDER --- */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-50 rounded-t-[inherit] pointer-events-none" />

                {/* --- MOBILE DRAG HANDLE --- */}
                <div className="absolute top-0 left-0 w-full flex justify-center pt-3 pb-3 lg:hidden z-50 touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full shadow-sm" />
                </div>

                {/* --- LEFT SECTION: MEDIA PLAYER --- */}
                <div className="w-full lg:w-3/5 bg-black relative flex flex-col shrink-0 items-center justify-center min-h-[35vh] sm:min-h-[40vh] lg:min-h-full border-b lg:border-b-0 lg:border-r border-border/20 pt-6 lg:pt-0">

                    {/* School Overlay Badge */}
                    <div className="absolute top-8 lg:top-6 left-4 lg:left-6 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl z-40 max-w-[80%]">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <School className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{t('review_modal.school_label', 'Assigned School')}</span>
                            <span className="text-sm font-extrabold text-white truncate leading-tight">{selectedSchool?.schoolName || 'Unknown School'}</span>
                        </div>
                    </div>

                    {/* Media Content */}
                    {videoErrors[activeReview.fileId] || !activeReview.videoUrl ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-50" />
                                <AlertTriangle className="w-10 h-10 text-destructive relative z-10" />
                            </div>
                            <h3 className="font-extrabold text-xl sm:text-2xl text-white mb-2">{t('review_modal.media_not_found', 'Media Unavailable')}</h3>
                            <p className="text-sm text-white/50 max-w-xs">{t('review_modal.media_error_desc', 'The video file could not be loaded or may have been removed.')}</p>
                        </div>
                    ) : (
                        <div className="w-full h-full relative group">
                            <video
                                src={activeReview.videoUrl}
                                controls
                                className="w-full h-full max-h-[45vh] lg:max-h-[85vh] object-contain bg-black"
                                onError={() => handleVideoError(activeReview.fileId)}
                                preload="metadata"
                            />
                            {/* Custom Play Overlay (Optional visual enhancement before play) */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors opacity-0">
                                <PlayCircle className="w-16 h-16 text-white/50 drop-shadow-lg" />
                            </div>
                        </div>
                    )}
                </div>

                {/* --- RIGHT SECTION: GRADING FORM --- */}
                <div className="w-full lg:w-2/5 flex flex-col bg-card overflow-hidden">

                    {/* Header */}
                    <div className="px-6 lg:px-8 py-6 border-b border-border/50 flex items-start justify-between bg-muted/10 sticky top-0 z-10">
                        <div>
                            <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                                <Star className="w-6 h-6 text-amber-500 fill-amber-500/20" />
                                {t('review_modal.grade_performance', 'Grade Performance')}
                            </h2>
                            <p className="text-sm font-bold text-muted-foreground mt-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                                {activeReview.eventName || t('review_modal.regular_class', 'Regular Class')} <span className="opacity-50">•</span> {activeReview.eventDate}
                            </p>
                        </div>
                        <button onClick={handleClose} disabled={isSubmitting} className="p-2.5 bg-muted/50 hover:bg-muted border border-border/50 rounded-full text-muted-foreground transition-colors shrink-0 hidden lg:flex">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="p-6 lg:px-8 lg:py-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">

                        {/* Score Selector */}
                        <div className="space-y-3">
                            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-foreground ml-1">
                                <span>{t('review_modal.score_label', 'Performance Score')} <span className="text-destructive">*</span></span>
                                <span className="text-muted-foreground font-medium lowercase tracking-normal">out of 10</span>
                            </label>

                            <div className="flex items-center justify-between bg-muted/20 border border-border/80 p-2.5 rounded-3xl shadow-sm">
                                <button
                                    onClick={decrementMarks}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-card border border-border hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive flex items-center justify-center transition-all shadow-sm active:scale-95"
                                >
                                    <Minus className="w-6 h-6" />
                                </button>

                                <div className="flex flex-col items-center justify-center w-24">
                                    <span className="text-5xl font-black text-foreground tabular-nums tracking-tighter leading-none">{reviewMarks}</span>
                                </div>

                                <button
                                    onClick={incrementMarks}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-card border border-border hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 flex items-center justify-center transition-all shadow-sm active:scale-95"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Feedback Textarea */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground ml-1">
                                <MessageSquare className="w-4 h-4 text-primary/70" /> {t('review_modal.admin_feedback', 'Admin Feedback')}
                            </label>
                            <Textarea
                                rows={5}
                                value={reviewRemark}
                                onChange={(e) => setReviewRemark(e.target.value)}
                                className="w-full p-5 bg-muted/20 border-border/80 rounded-3xl text-base font-medium focus-visible:ring-primary/30 resize-none shadow-sm"
                                placeholder={t('review_modal.feedback_placeholder', 'Add constructive feedback for the employee...')}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-end gap-3 rounded-b-3xl pb-safe lg:pb-6">
                        <Button
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto h-12 lg:h-14 px-6 rounded-2xl font-bold text-muted-foreground hover:bg-muted transition-colors"
                        >
                            {t('review_modal.cancel', 'Cancel')}
                        </Button>
                        <Button
                            onClick={submitReview}
                            disabled={isSubmitting || videoErrors[activeReview.fileId]}
                            className={`w-full sm:w-auto h-12 lg:h-14 px-8 rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg flex-1 sm:flex-none ${videoErrors[activeReview.fileId] ? 'opacity-50' : 'hover:scale-[1.02] shadow-primary/20'}`}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('review_modal.saving', 'Saving...')}</>
                            ) : (
                                <><CheckCircle2 className="w-5 h-5 mr-2" /> {t('review_modal.submit_grade', 'Submit Grade')}</>
                            )}
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ReviewModal;