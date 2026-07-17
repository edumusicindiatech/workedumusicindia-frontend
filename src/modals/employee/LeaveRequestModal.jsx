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

    // Refs for Android-level smooth performance
    const modalRef = useRef(null);
    const backdropRef = useRef(null);
    const dragStartY = useRef(0);
    const currentTranslateY = useRef(0);

    const [formData, setFormData] = useState({
        fromDate: "",
        toDate: "",
        reason: ""
    });

    useEffect(() => {
        if (isOpen) {
            checkActiveLeaveRequest();
            // Reset position on open
            if (modalRef.current) {
                modalRef.current.style.transform = `translateY(0px)`;
                if (backdropRef.current) backdropRef.current.style.opacity = "1";
            }
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
    const handleDismiss = () => {
        setDismissed(true);
        setFormData({ fromDate: "", toDate: "", reason: "" });
    };
    // --- FIX: INPUT HANDLER ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- HIGH PERFORMANCE NATIVE DRAG LOGIC ---
    const handleTouchStart = (e) => {
        // Prevent drag when interacting with inputs/scrollables
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.custom-scrollbar')) return;

        dragStartY.current = e.touches[0].clientY;
        if (modalRef.current) modalRef.current.style.transition = "none";
        if (backdropRef.current) backdropRef.current.style.transition = "none";
    };

    const handleTouchMove = (e) => {
        const deltaY = e.touches[0].clientY - dragStartY.current;

        if (deltaY > 0) {
            // Natural downward drag
            currentTranslateY.current = deltaY;
        } else {
            // Pull-up resistance (Rubber banding effect)
            currentTranslateY.current = deltaY * 0.15;
        }

        if (modalRef.current) {
            modalRef.current.style.transform = `translateY(${currentTranslateY.current}px)`;
        }

        // Dynamic backdrop fade
        if (backdropRef.current) {
            const opacity = Math.max(0, 1 - currentTranslateY.current / 400);
            backdropRef.current.style.opacity = opacity;
        }
    };

    const handleTouchEnd = () => {
        // Set transition back for the snap effect
        if (modalRef.current) modalRef.current.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
        if (backdropRef.current) backdropRef.current.style.transition = "opacity 0.4s ease";

        // Threshold to close (150px)
        if (currentTranslateY.current > 150) {
            handleClose();
        } else {
            currentTranslateY.current = 0;
            if (modalRef.current) modalRef.current.style.transform = `translateY(0px)`;
            if (backdropRef.current) backdropRef.current.style.opacity = "1";
        }
    };

    const handleClose = () => {
        if (actionLoading || loading) return;

        if (modalRef.current) {
            modalRef.current.style.transition = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
            modalRef.current.style.transform = `translateY(100%)`;
        }
        if (backdropRef.current) backdropRef.current.style.opacity = "0";

        setTimeout(() => {
            onClose();
            currentTranslateY.current = 0;
        }, 300);
    };

    const submitLeaveRequest = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const toastId = toast.loading(t('leave_request.toast_submitting', 'Submitting request...'));
        try {
            const res = await api.post('/employee/leave-request', formData);
            toast.success(res.data?.message || t('leave_request.toast_submit_success'), { id: toastId });
            setActiveRequest(res.data.data);
            setDismissed(false);
        } catch (err) {
            toast.error(err.response?.data?.message || t('leave_request.toast_submit_error'), { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const revokeLeaveRequest = async () => {
        setActionLoading(true);
        const toastId = toast.loading(t('leave_request.toast_revoking', 'Revoking...'));
        try {
            await api.delete(`/employee/leave-request/${activeRequest.id || activeRequest._id}`);
            toast.success(t('leave_request.toast_revoke_success'), { id: toastId });
            setActiveRequest(null);
            setFormData({ fromDate: "", toDate: "", reason: "" });
        } catch (err) {
            toast.error(err.response?.data?.message || t('leave_request.toast_revoke_error'), { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-200 flex items-end md:items-center justify-center overflow-hidden">
            {/* Backdrop */}
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={handleClose}
            />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className="bg-card w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden will-change-transform animate-in slide-in-from-bottom-20 duration-500 cubic-bezier(0.32, 0.72, 0, 1)"
                onClick={e => e.stopPropagation()}
            >
                {/* Drag Handle Area - Increased touch targets for better sensitivity */}
                <div
                    className="w-full flex flex-col items-center pt-3 pb-3 md:pt-4 touch-none cursor-grab active:cursor-grabbing"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
                </div>

                {/* HEADER */}
                <div className="px-6 pb-5 flex items-center justify-between border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                            <CalendarPlus className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">
                                {t('leave_request.title', 'Leave Request')}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border hidden md:flex transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('leave_request.checking_status', 'Syncing Data...')}</p>
                        </div>
                    ) : activeRequest && !dismissed ? (
                        <div className="space-y-8 text-center py-4 animate-in fade-in zoom-in-95">
                            <div className="flex justify-center">
                                <div className={`w-24 h-24 rounded-[2.2rem] flex items-center justify-center border shadow-inner transform rotate-3
                                    ${activeRequest.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                        activeRequest.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                            'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                                    {activeRequest.status === 'pending' && <AlertCircle className="w-12 h-12" />}
                                    {activeRequest.status === 'approved' && <CheckCircle2 className="w-12 h-12" />}
                                    {activeRequest.status === 'rejected' && <XCircle className="w-12 h-12" />}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-3xl font-black uppercase tracking-tight text-foreground italic">
                                    {activeRequest.status === 'pending' ? t('leave_request.status_pending') :
                                        activeRequest.status === 'approved' ? t('leave_request.status_approved') :
                                            t('leave_request.status_rejected')}
                                </h4>
                                <p className="text-sm font-medium text-muted-foreground leading-relaxed px-4">
                                    <Trans
                                        i18nKey="leave_request.requested_dates"
                                        values={{ from: new Date(activeRequest.fromDate).toLocaleDateString(), to: new Date(activeRequest.toDate).toLocaleDateString() }}
                                        components={[<span key="0" />, <strong key="1" className="text-foreground font-black" />]}
                                    />
                                </p>
                                {activeRequest.adminRemarks && (
                                    <div className="mt-8 p-5 bg-muted/30 border border-border/60 rounded-3xl text-left shadow-inner">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">{t('leave_request.admin_note', 'Admin Remarks')}</p>
                                        <p className="text-sm font-bold italic text-foreground/90 leading-relaxed">"{activeRequest.adminRemarks}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form id="leave-form" onSubmit={submitLeaveRequest} className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">{t('leave_request.label_from', 'From Date')}</Label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                                        <Input type="date" name="fromDate" required value={formData.fromDate} onChange={handleInputChange} className="h-14 pl-11 rounded-2xl bg-muted/20 border-border/60 font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">{t('leave_request.label_to', 'To Date')}</Label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                                        <Input type="date" name="toDate" required value={formData.toDate} onChange={handleInputChange} className="h-14 pl-11 rounded-2xl bg-muted/20 border-border/60 font-bold" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">{t('leave_request.label_reason', 'Reason')}</Label>
                                <Textarea name="reason" required value={formData.reason} onChange={handleInputChange} placeholder={t('leave_request.placeholder_reason', 'Explain your request...')} className="min-h-37.5 rounded-3xl bg-muted/20 border-border/60 p-5 resize-none text-base font-medium" />
                            </div>
                        </form>
                    )}
                </div>

                {/* FOOTER */}
                {!loading && (
                    <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-end gap-3 pb-safe shrink-0">
                        {activeRequest && !dismissed ? (
                            activeRequest.status === 'pending' ? (
                                <Button variant="destructive" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-destructive/20 active:scale-95 transition-all" onClick={revokeLeaveRequest} disabled={actionLoading}>
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('leave_request.btn_revoke', 'Revoke Request')}
                                </Button>
                            ) : (
                                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-foreground text-background active:scale-95 transition-all" onClick={handleDismiss}>
                                    {t('leave_request.btn_dismiss', 'Back')}
                                </Button>
                            )
                        ) : (
                            <Button type="submit" form="leave-form" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 active:scale-95 gap-2 transition-all" disabled={actionLoading || !formData.fromDate || !formData.toDate || !formData.reason.trim()}>
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                {t('leave_request.btn_submit', 'Send Request')}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveRequestModal;