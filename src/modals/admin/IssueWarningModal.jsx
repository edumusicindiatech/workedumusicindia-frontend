import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, ChevronDown, Check, Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next"; 

const IssueWarningModal = ({ isOpen, onClose, employeeId, onSuccess }) => {
    const { t } = useTranslation(); 
    const [warningForm, setWarningForm] = useState({ type: "Verbal", reason: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setWarningForm({ type: "Verbal", reason: "" });
            setIsDropdownOpen(false);
            setIsSubmitting(false);
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; setIsDragging(true); };
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

    // --- API HANDLER ---
    const handleSave = async () => {
        if (!warningForm.reason.trim()) {
            toast.error(t('issue_warning.error_validation', 'Please provide a reason for the warning.'));
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading(t('issue_warning.issuing', 'Issuing Warning...'));

        try {
            await api.post(`/admin/employees/${employeeId}/warnings`, {
                level: warningForm.type,
                reason: warningForm.reason
            });

            toast.success(t('issue_warning.toast_success', 'Warning issued successfully.'), { id: loadingToast });
            if (onSuccess) onSuccess();
            handleClose();
        } catch (error) {
            console.error("Warning Error:", error);
            toast.error(error.response?.data?.message || t('issue_warning.toast_error', 'Failed to issue warning.'), { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = warningForm.reason.trim().length > 0;

    const getTypeLabel = (type) => {
        const key = type.toLowerCase();
        return `${t(`issue_warning.${key}`, type)} ${t('issue_warning.warning_suffix', 'Warning')}`;
    };

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={!isSubmitting ? handleClose : undefined}>
            <div className={`bg-card w-full max-w-xl rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} style={{ transform: `translateY(${dragOffset}px)` }} onClick={e => e.stopPropagation()}>

                {/* Overlapping Top Border Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40 z-20" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden"><div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div></div>
                    
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20 shadow-inner">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground line-clamp-1 tracking-tight">
                                    {t('issue_warning.title', 'Issue Warning')}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                    {t('issue_warning.subtitle', 'Record a formal infraction')}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={isSubmitting} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-muted/5">

                    <div className="space-y-3" ref={dropdownRef}>
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('issue_warning.level_label', 'Warning Level')}</Label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full h-12 rounded-xl border border-border/60 bg-card px-4 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-all hover:bg-muted/30 shadow-sm"
                            >
                                <span className={`font-bold ${warningForm.type === "Final" ? "text-destructive" : warningForm.type === "Written" ? "text-orange-500" : "text-amber-500"}`}>
                                    {getTypeLabel(warningForm.type)}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-1.5 flex flex-col gap-1">
                                        {["Verbal", "Written", "Final"].map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => {
                                                    setWarningForm({ ...warningForm, type: option });
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${warningForm.type === option ? "bg-muted font-bold text-foreground" : "text-foreground hover:bg-muted/50 font-medium"}`}
                                            >
                                                <span>{getTypeLabel(option)}</span>
                                                {warningForm.type === option && <Check className="w-4 h-4 text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('issue_warning.reason_label', 'Reason & Details')}</Label>
                        <textarea
                            placeholder={t('issue_warning.reason_placeholder', 'Provide specific details about the infraction...')}
                            value={warningForm.reason}
                            onChange={(e) => setWarningForm({ ...warningForm, reason: e.target.value })}
                            className="w-full min-h-35 rounded-xl border border-border/60 bg-card p-4 text-sm font-medium leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-shadow custom-scrollbar shadow-sm"
                        />
                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-end gap-3 rounded-b-4xl pb-safe">
                    <Button 
                        variant="ghost" 
                        onClick={handleClose} 
                        disabled={isSubmitting} 
                        className="w-full sm:w-auto h-12 rounded-xl font-bold text-muted-foreground border-border/80 hover:bg-muted transition-colors flex-1 sm:flex-none"
                    >
                        {t('issue_warning.cancel', 'Cancel')}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={!isFormValid || isSubmitting} 
                        className="w-full sm:w-auto h-12 sm:px-10 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all active:scale-[0.98] flex-2 sm:flex-none"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} 
                        {t('issue_warning.submit', 'Issue Warning')}
                    </Button>
                </div>
                
            </div>
        </div>
    );
};

export default IssueWarningModal;