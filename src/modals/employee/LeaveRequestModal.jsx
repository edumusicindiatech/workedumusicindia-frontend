import React, { useState, useEffect, useRef } from "react";
import { X, CalendarPlus, Loader2, AlertCircle, CheckCircle2, XCircle, FileText, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation, Trans } from "react-i18next";

const LeaveRequestModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [activeRequest, setActiveRequest] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    const [formData, setFormData] = useState({
        fromDate: "",
        toDate: "",
        reason: ""
    });

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setDragOffset(0);
            checkActiveLeaveRequest();
        } else {
            setDismissed(false);
            setFormData({ fromDate: "", toDate: "", reason: "" });
        }
    }, [isOpen]);

    const checkActiveLeaveRequest = async () => {
        setLoading(true);
        try {
            const res = await api.get('/employee/leave-request/status');
            if (res.data.success && res.data.data) {
                setActiveRequest(res.data.data);
                setDismissed(false);
            } else {
                setActiveRequest(null);
            }
        } catch (err) {
            console.error("Failed to fetch leave status", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (actionLoading || loading) return;
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

    // --- API HANDLERS ---
    const submitLeaveRequest = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const toastId = toast.loading(t('leave_request.toast_submitting', 'Submitting request...'));

        try {
            const res = await api.post('/employee/leave-request', formData);
            toast.success(res.data?.message || t('leave_request.toast_submit_success', 'Leave requested successfully'), { id: toastId });
            setActiveRequest(res.data.data);
            setDismissed(false);
        } catch (err) {
            toast.error(err.response?.data?.message || t('leave_request.toast_submit_error', 'Failed to submit request'), { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const revokeLeaveRequest = async () => {
        setActionLoading(true);
        const toastId = toast.loading(t('leave_request.toast_revoking', 'Revoking request...'));

        try {
            await api.delete(`/employee/leave-request/${activeRequest.id || activeRequest._id}`);
            toast.success(t('leave_request.toast_revoke_success', 'Leave request revoked'), { id: toastId });
            setActiveRequest(null);
            setFormData({ fromDate: "", toDate: "", reason: "" });
        } catch (err) {
            toast.error(err.response?.data?.message || t('leave_request.toast_revoke_error', 'Failed to revoke request'), { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setFormData({ fromDate: "", toDate: "", reason: "" });
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-sm animate-in fade-in'}`} onClick={handleClose}>
            <div 
                className={`bg-card w-full max-w-md rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} 
                style={{ transform: `translateY(${dragOffset}px)` }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
                    </div>
                    
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <CalendarPlus className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                                    {t('leave_request.title', 'Request Leave')}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5 font-medium line-clamp-1">
                                    {t('leave_request.subtitle', 'Manage your time off')}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleClose} 
                            disabled={actionLoading || loading} 
                            onTouchStart={(e) => e.stopPropagation()} 
                            className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-inner relative">
                                <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                                <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
                            </div>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('leave_request.checking_status', 'Verifying Status...')}</p>
                        </div>
                    ) : activeRequest && !dismissed ? (
                        
                        <div className="space-y-6 text-center py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Dynamic Status Icon */}
                            <div className="flex justify-center mb-6 relative">
                                {activeRequest.status === 'pending' && (
                                    <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 shadow-inner relative">
                                        <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping opacity-30" />
                                        <AlertCircle className="w-12 h-12 text-amber-500 relative z-10" />
                                    </div>
                                )}
                                {activeRequest.status === 'approved' && (
                                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-inner relative">
                                        <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping opacity-30" />
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500 relative z-10" />
                                    </div>
                                )}
                                {activeRequest.status === 'rejected' && (
                                    <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20 shadow-inner relative">
                                        <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-30" />
                                        <XCircle className="w-12 h-12 text-destructive relative z-10" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-2xl font-black uppercase tracking-tight text-foreground">
                                    {activeRequest.status === 'pending' && t('leave_request.status_pending', 'Under Review')}
                                    {activeRequest.status === 'approved' && t('leave_request.status_approved', 'Approved')}
                                    {activeRequest.status === 'rejected' && t('leave_request.status_rejected', 'Rejected')}
                                </h4>
                                
                                <p className="text-sm font-medium text-muted-foreground px-4 leading-relaxed">
                                    <Trans
                                        i18nKey="leave_request.requested_dates"
                                        values={{ from: new Date(activeRequest.fromDate).toLocaleDateString(), to: new Date(activeRequest.toDate).toLocaleDateString() }}
                                        components={[<span key="0" className="opacity-80" />, <strong key="1" className="text-foreground" />]}
                                    />
                                </p>

                                {activeRequest.adminRemarks && (
                                    <div className="mt-6 p-4 bg-muted/30 border border-border/60 rounded-2xl text-left animate-in slide-in-from-top-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                            <FileText className="w-3 h-3" /> {t('leave_request.admin_note', 'Admin Note')}
                                        </span>
                                        <p className="text-sm font-bold italic text-foreground">"{activeRequest.adminRemarks}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    ) : (

                        <form id="leave-form" onSubmit={submitLeaveRequest} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1">
                                        {t('leave_request.label_from', 'Start Date')} <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            type="date"
                                            name="fromDate"
                                            required
                                            value={formData.fromDate}
                                            onChange={handleInputChange}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="h-12 pl-10 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1">
                                        {t('leave_request.label_to', 'End Date')} <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            type="date"
                                            name="toDate"
                                            required
                                            value={formData.toDate}
                                            onChange={handleInputChange}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="h-12 pl-10 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1">
                                    {t('leave_request.label_reason', 'Reason for Leave')} <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    name="reason"
                                    required
                                    value={formData.reason}
                                    onChange={handleInputChange}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    placeholder={t('leave_request.placeholder_reason', 'Please provide a detailed reason...')}
                                    className="min-h-30 rounded-2xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 p-4 resize-none shadow-sm font-medium"
                                />
                            </div>
                        </form>

                    )}
                </div>

                {/* FOOTER ACTIONS */}
                {!loading && (
                    <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-end gap-3 rounded-b-3xl pb-safe">
                        {activeRequest && !dismissed ? (
                            activeRequest.status === 'pending' ? (
                                <>
                                    <Button
                                        variant="outline"
                                        className="w-full sm:flex-1 h-12 rounded-xl font-bold border-border/80 hover:bg-muted text-muted-foreground transition-all"
                                        onClick={handleDismiss}
                                        disabled={actionLoading}
                                    >
                                        {t('leave_request.btn_dismiss', 'Close')}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full sm:flex-1 h-12 rounded-xl font-black uppercase tracking-wider shadow-lg shadow-destructive/20 active:scale-[0.98] transition-all"
                                        onClick={revokeLeaveRequest}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
                                        {t('leave_request.btn_revoke', 'Revoke Request')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        className="w-full sm:flex-1 h-12 rounded-xl font-bold border-border/80 hover:bg-muted text-muted-foreground transition-all"
                                        onClick={handleClose}
                                    >
                                        {t('leave_request.btn_dismiss', 'Close')}
                                    </Button>
                                    <Button
                                        className="w-full sm:flex-1 h-12 rounded-xl font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-all gap-2"
                                        onClick={handleDismiss}
                                    >
                                        <CalendarPlus className="w-5 h-5" />
                                        {t('leave_request.btn_new_request', 'New Request')}
                                    </Button>
                                </>
                            )
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleClose}
                                    className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors"
                                    disabled={actionLoading}
                                >
                                    {t('leave_request.btn_cancel', 'Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    form="leave-form"
                                    className="w-full sm:w-auto h-12 px-10 rounded-xl font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-all gap-2"
                                    disabled={actionLoading || !formData.fromDate || !formData.toDate || !formData.reason.trim()}
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    {actionLoading ? t('leave_request.toast_submitting', 'Submitting...') : t('leave_request.btn_submit', 'Submit Request')}
                                </Button>
                            </>
                        )}
                    </div>
                )}
                
            </div>
        </div>
    );
};

export default LeaveRequestModal;