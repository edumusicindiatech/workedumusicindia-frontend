import React, { useState, useEffect, useRef } from "react";
import { X, Calendar, Plus, Trash2, Edit3, Save, Loader2, Palmtree, History, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useTranslation, Trans } from "react-i18next";

const SchoolHolidayModal = ({ isOpen, onClose, schoolId, schoolName, category }) => {
    const { t } = useTranslation();
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ title: "", startDate: "", endDate: "" });

    // Custom Delete Confirmation Modal State
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    // --- ANIMATION STATES ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen && schoolId) {
            setIsClosing(false);
            setDragOffset(0);
            fetchHolidayHistory();
        } else {
            // Reset state when closed
            setEditId(null);
            setForm({ title: "", startDate: "", endDate: "" });
            setDeleteConfirmId(null);
        }
    }, [isOpen, schoolId]);

    const fetchHolidayHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/school-holidays?schoolId=${schoolId}&category=${category}`);
            setHolidays(res.data.data);
        } catch (err) {
            toast.error(t('school_holiday_modal.toast_fetch_error', 'Failed to load history'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // ==========================================
        // DATE VALIDATIONS
        // ==========================================
        const start = new Date(form.startDate);
        const end = new Date(form.endDate);

        // Strip the time from today's date for an accurate "past day" check
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            toast.error(t('school_holiday_modal.error_past_date', 'Past holidays cannot be scheduled.'));
            return;
        }

        if (start > end) {
            toast.error(t('school_holiday_modal.error_invalid_range', 'Valid Date Range should be there.'));
            return;
        }
        // ==========================================

        setSubmitting(true);
        const toastId = toast.loading(t('school_holiday_modal.toast_saving', 'Saving...'));
        try {
            const payload = { ...form, affectedSchools: [schoolId], category };

            if (editId) {
                await api.put(`/admin/school-holidays/${editId}`, payload);
                toast.success(t('school_holiday_modal.toast_update_success', 'Holiday updated'), { id: toastId });
            } else {
                await api.post(`/admin/school-holidays`, payload);
                toast.success(t('school_holiday_modal.toast_add_success', 'Holiday scheduled'), { id: toastId });
            }

            setForm({ title: "", startDate: "", endDate: "" });
            setEditId(null);
            fetchHolidayHistory();
        } catch (err) {
            toast.error(err.response?.data?.message || t('school_holiday_modal.toast_save_error', 'Failed to save record'), { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateForInput = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        setSubmitting(true);
        const toastId = toast.loading(t('school_holiday_modal.toast_deleting', 'Deleting...'));
        try {
            await api.delete(`/admin/school-holidays/${deleteConfirmId}`);
            toast.success(t('school_holiday_modal.toast_delete_success', 'Record deleted'), { id: toastId });
            setDeleteConfirmId(null);
            fetchHolidayHistory();
        } catch (err) {
            toast.error(t('school_holiday_modal.toast_delete_error', 'Delete failed'), { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

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

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={!submitting && !deleteConfirmId ? handleClose : undefined}>
            <div className={`bg-card w-full max-w-2xl rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} style={{ transform: `translateY(${dragOffset}px)` }} onClick={e => e.stopPropagation()}>

                {/* Decoration Accent - FIXED TO BEND WITH CORNERS */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-amber-500/40 via-amber-500 to-amber-500/40 z-20 rounded-t-[2.5rem] md:rounded-t-4xl" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden"><div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div></div>
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner">
                                <Palmtree className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground line-clamp-1 tracking-tight">{t('school_holiday_modal.title', 'Holiday Management')}</h2>
                                <p className="text-sm text-muted-foreground mt-1 font-medium leading-tight">
                                    {schoolName} <span className="text-primary/40 inline-block mx-1.5">•</span> <span className="text-primary font-bold whitespace-nowrap">{category}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={submitting} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">

                    {/* ADD / EDIT FORM */}
                    <form onSubmit={handleSave} className="bg-muted/30 p-5 rounded-3xl border border-border/60 space-y-5 shadow-inner">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2">
                            {editId ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {editId ? t('school_holiday_modal.edit_heading', 'Modify Schedule') : t('school_holiday_modal.add_heading', 'Schedule New Closure')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2.5 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">{t('school_holiday_modal.label_title', 'Holiday Title / Reason')}</Label>
                                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('school_holiday_modal.placeholder_title', 'e.g. Summer Vacation 2026')} required className="h-12 rounded-xl bg-card border-border/60" />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">{t('school_holiday_modal.label_start', 'Starts From')}</Label>
                                <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="h-12 rounded-xl bg-card border-border/60" />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">{t('school_holiday_modal.label_end', 'Ends At')}</Label>
                                <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className="h-12 rounded-xl bg-card border-border/60" />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                            {editId && (
                                <Button type="button" variant="outline" className="w-full sm:w-auto h-12 rounded-xl font-bold" onClick={() => { setEditId(null); setForm({ title: "", startDate: "", endDate: "" }) }}>
                                    {t('school_holiday_modal.btn_cancel', 'Cancel')}
                                </Button>
                            )}
                            <Button type="submit" disabled={submitting} className={`w-full sm:w-auto h-12 font-black uppercase tracking-widest rounded-xl px-8 shadow-lg active:scale-95 transition-all ${editId ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-amber-600 hover:bg-amber-700'}`}>
                                {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : editId ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                {editId ? t('school_holiday_modal.btn_update', 'Update History') : t('school_holiday_modal.btn_add', 'Mark Holiday')}
                            </Button>
                        </div>
                    </form>

                    {/* HISTORY LIST */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 px-1 border-b border-border/50 pb-3">
                            <History className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{t('school_holiday_modal.history_title', 'Historical Records')}</h3>
                        </div>

                        {loading ? (
                            <div className="py-12 flex flex-col items-center gap-3">
                                <Loader2 className="animate-spin w-8 h-8 text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{t('school_holiday_modal.syncing', 'Syncing Records...')}</p>
                            </div>
                        ) : holidays.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-border/60 rounded-3xl bg-muted/10">
                                <p className="text-sm font-medium text-muted-foreground italic">{t('school_holiday_modal.history_empty', 'No holidays have been scheduled yet for this band.')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {holidays.map(h => (
                                    <div key={h._id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border/60 rounded-2xl hover:border-amber-500/40 transition-all shadow-sm hover:shadow-md gap-3 sm:gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 shrink-0 rounded-xl bg-muted flex items-center justify-center border border-border group-hover:bg-amber-500/10 group-hover:border-amber-500/20 transition-colors">
                                                <Calendar className="w-5 h-5 text-muted-foreground group-hover:text-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-base text-foreground mb-1">{h.title}</h4>
                                                <p className="text-xs font-bold text-muted-foreground tracking-tight">
                                                    {new Date(h.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {new Date(h.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                            <Button variant="outline" size="sm" onClick={() => {
                                                setEditId(h._id);
                                                setForm({
                                                    title: h.title,
                                                    startDate: formatDateForInput(h.startDate),
                                                    endDate: formatDateForInput(h.endDate)
                                                });
                                            }} className="flex-1 sm:flex-none rounded-lg h-9 text-primary border-primary/20 hover:bg-primary/10 justify-center">
                                                <Edit3 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">{t('school_holiday_modal.btn_edit_sm', 'Edit')}</span>
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(h._id)} className="flex-1 sm:flex-none rounded-lg h-9 text-destructive border-destructive/20 hover:bg-destructive/10 justify-center">
                                                <Trash2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">{t('school_holiday_modal.btn_delete_sm', 'Delete')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* DELETE CONFIRMATION SUB-MODAL */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setDeleteConfirmId(null)}>
                    <div className="bg-card w-full max-w-sm rounded-4xl shadow-2xl border border-border/50 p-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-300 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>

                        {/* Decoration Accent - FIXED HERE TOO */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40 rounded-t-4xl" />

                        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 border border-destructive/20 relative">
                            <div className="absolute inset-0 bg-destructive/20 rounded-2xl animate-ping opacity-20" />
                            <AlertTriangle className="w-10 h-10 text-destructive relative z-10" />
                        </div>

                        <h3 className="font-extrabold text-2xl mb-2 text-foreground">{t('school_holiday_modal.delete_confirm_title', 'Confirm Deletion')}</h3>
                        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                            {t('school_holiday_modal.delete_confirm_desc', 'Are you sure you want to permanently delete this holiday record?')}
                        </p>

                        <div className="flex flex-col-reverse sm:flex-row w-full gap-2 sm:gap-3">
                            <Button variant="outline" disabled={submitting} className="w-full sm:flex-1 h-12 rounded-xl font-bold border-border/80 hover:bg-muted" onClick={() => setDeleteConfirmId(null)}>
                                {t('school_holiday_modal.btn_cancel', 'Cancel')}
                            </Button>
                            <Button variant="destructive" disabled={submitting} className="w-full sm:flex-1 h-12 rounded-xl font-bold shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)]" onClick={confirmDelete}>
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('school_holiday_modal.btn_confirm_delete', 'Yes, Delete')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolHolidayModal;