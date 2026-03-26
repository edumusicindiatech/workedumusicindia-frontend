import { useState, useEffect } from "react";
import { School, X, MapPin, Calendar, Clock, Edit2, Trash2, Save, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation, Trans } from "react-i18next"; // <-- Added imports

const ManageAssignedSchoolModal = ({ isOpen, onClose, assignment, employeeId, onSuccess }) => {
    const { t } = useTranslation(); // <-- Initialize hook
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false });

    useEffect(() => {
        if (isOpen && assignment) {
            setIsEditing(false);
            setEditForm({
                category: assignment.category || "",
                startDate: assignment.startDate ? assignment.startDate.split('T')[0] : "",
                endDate: assignment.endDate ? assignment.endDate.split('T')[0] : "",
                timeFrom: assignment.startTime || "",
                timeTo: assignment.endTime || "",
                days: assignment.allowedDays || []
            });
            setDeleteModal({ isOpen: false });
        }
    }, [isOpen, assignment]);

    if (!isOpen || !assignment) return null;

    const schoolName = assignment.school?.schoolName || t('manage_assigned_school.unknown_school');
    const schoolAddress = assignment.school?.address || t('manage_assigned_school.no_address');

    const toggleEditDay = (day) => {
        setEditForm(prev => ({
            ...prev,
            days: prev.days?.includes(day) ? prev.days.filter(d => d !== day) : [...(prev.days || []), day]
        }));
    };

    const handleSaveEdit = async () => {
        setIsLoading(true);
        const loadingToast = toast.loading(t('manage_assigned_school.updating_toast'));
        try {
            const payload = {
                category: editForm.category,
                startDate: editForm.startDate,
                endDate: editForm.endDate,
                startTime: editForm.timeFrom,
                endTime: editForm.timeTo,
                allowedDays: editForm.days
            };

            await api.put(`/admin/employees/${employeeId}/assignments/${assignment._id}`, payload);
            toast.success(t('manage_assigned_school.update_success'), { id: loadingToast });

            setIsEditing(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || t('manage_assigned_school.update_error'), {
                id: loadingToast,
                duration: 6000,
                style: {
                    maxWidth: '500px',
                    padding: '16px',
                    lineHeight: '1.5',
                    textAlign: 'center'
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = async () => {
        setIsLoading(true);
        const loadingToast = toast.loading(t('manage_assigned_school.revoking_toast'));
        try {
            await api.delete(`/admin/employees/${employeeId}/assignments/${assignment._id}`);
            toast.success(t('manage_assigned_school.revoke_success'), { id: loadingToast });
            setDeleteModal({ isOpen: false });
            onClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || t('manage_assigned_school.revoke_error'), {
                id: loadingToast,
                duration: 6000,
                style: { maxWidth: '500px', padding: '16px', lineHeight: '1.5', textAlign: 'center' }
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={!isLoading ? onClose : undefined}>

            <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3 pr-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <School className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground line-clamp-1">{schoolName}</h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> {schoolAddress}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isLoading} className="p-2 hover:bg-muted rounded-full bg-background border border-border shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">

                    {!isEditing ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t('manage_assigned_school.category')}</p>
                                    <span className="px-2.5 py-1 bg-primary/10 text-primary rounded border border-primary/20 text-sm font-bold">{assignment.category}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t('manage_assigned_school.status')}</p>
                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20 text-sm font-bold">{t('manage_assigned_school.active')}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Calendar className="w-3.5 h-3.5" /> {t('manage_assigned_school.start_date')}</p>
                                    <p className="text-sm font-bold">{assignment.startDate ? assignment.startDate.split('T')[0] : t('manage_assigned_school.not_set')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Calendar className="w-3.5 h-3.5" /> {t('manage_assigned_school.end_date')}</p>
                                    <p className="text-sm font-bold">{assignment.endDate ? assignment.endDate.split('T')[0] : t('manage_assigned_school.ongoing')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Clock className="w-3.5 h-3.5" /> {t('manage_assigned_school.timings')}</p>
                                    <p className="text-sm font-bold">{assignment.startTime} - {assignment.endTime}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t('manage_assigned_school.days')}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {assignment.allowedDays?.map(day => (
                                            <span key={day} className="px-2 py-0.5 bg-muted border border-border text-[10px] font-bold rounded">{t(`manage_assigned_school.days_short.${day}`)}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.category')}</Label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    >
                                        <option value="Junior Band">{t('manage_assigned_school.junior_band')}</option>
                                        <option value="Senior Band">{t('manage_assigned_school.senior_band')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.start_date')}</Label>
                                    <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.end_date_opt')}</Label>
                                    <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.start_time')}</Label>
                                    <Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({ ...editForm, timeFrom: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.end_time')}</Label>
                                    <Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({ ...editForm, timeTo: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">{t('manage_assigned_school.allowed_days')}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button key={day} type="button" onClick={() => toggleEditDay(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${editForm.days?.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>
                                            {t(`manage_assigned_school.days_short.${day}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 sm:p-6 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" className="w-full sm:w-auto h-11 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteModal({ isOpen: true })}>
                                <Trash2 className="w-4 h-4 mr-2" /> {t('manage_assigned_school.revoke_btn')}
                            </Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-sm" onClick={() => setIsEditing(true)}>
                                <Edit2 className="w-4 h-4 mr-2" /> {t('manage_assigned_school.edit_btn')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" disabled={isLoading} className="w-full sm:w-auto h-11" onClick={() => setIsEditing(false)}>{t('manage_assigned_school.cancel_edit')}</Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-glow" disabled={isLoading} onClick={handleSaveEdit}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                {t('manage_assigned_school.save_changes')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* DELETE CONFIRMATION SUB-MODAL */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setDeleteModal({ isOpen: false })}>
                    <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6 text-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="font-bold text-xl mb-2">{t('manage_assigned_school.delete_title')}</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            <Trans
                                i18nKey="manage_assigned_school.delete_desc"
                                values={{ name: schoolName }}
                                components={[<span key="0" />, <strong key="1" />]}
                            />
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" disabled={isLoading} className="flex-1 h-11 rounded-xl" onClick={() => setDeleteModal({ isOpen: false })}>{t('manage_assigned_school.cancel')}</Button>
                            <Button variant="destructive" disabled={isLoading} className="flex-1 h-11 rounded-xl font-bold" onClick={confirmDelete}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('manage_assigned_school.confirm_revoke')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageAssignedSchoolModal;