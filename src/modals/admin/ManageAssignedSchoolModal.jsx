import { useState, useEffect } from "react";
import { School, X, MapPin, Map, Calendar, Clock, Edit2, Trash2, Save, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation, Trans } from "react-i18next";

// --- NEW: Helper function to convert 24h to 12h AM/PM format ---
const formatTime12Hour = (time) => {
    if (!time) return "";
    const [hourString, minute] = time.split(":");
    if (!hourString || !minute) return time;
    let hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 becomes 12
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    return `${formattedHour}:${minute} ${ampm}`;
};

const ManageAssignedSchoolModal = ({ isOpen, onClose, assignment, employeeId, onSuccess }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false });

    useEffect(() => {
        if (isOpen && assignment) {
            setIsEditing(false);

            // Safely extract coordinates depending on if it's new GeoJSON or legacy format
            let lat = "";
            let lng = "";
            if (assignment.school?.location?.coordinates) {
                lng = assignment.school.location.coordinates[0];
                lat = assignment.school.location.coordinates[1];
            } else if (assignment.school?.geofence) {
                lat = assignment.school.geofence.latitude;
                lng = assignment.school.geofence.longitude;
            }

            setEditForm({
                schoolName: assignment.school?.schoolName || "",
                schoolAddress: assignment.school?.address || "",
                latitude: lat,
                longitude: lng,
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

    const schoolName = assignment.school?.schoolName || t('manage_assigned_school.unknown_school', 'Unknown School');
    const schoolAddress = assignment.school?.address || t('manage_assigned_school.no_address', 'No Address Provided');

    const toggleEditDay = (day) => {
        setEditForm(prev => ({
            ...prev,
            days: prev.days?.includes(day) ? prev.days.filter(d => d !== day) : [...(prev.days || []), day]
        }));
    };

    const handleSaveEdit = async () => {
        // Basic frontend validation for coordinates
        if ((editForm.latitude && !editForm.longitude) || (!editForm.latitude && editForm.longitude)) {
            toast.error(t('manage_assigned_school.coord_error', 'Both Latitude and Longitude must be provided together.'));
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading(t('manage_assigned_school.updating_toast', 'Updating...'));

        try {
            const payload = {
                schoolName: editForm.schoolName,
                schoolAddress: editForm.schoolAddress,
                latitude: editForm.latitude,
                longitude: editForm.longitude,
                category: editForm.category,
                startDate: editForm.startDate,
                endDate: editForm.endDate,
                startTime: editForm.timeFrom,
                endTime: editForm.timeTo,
                allowedDays: editForm.days
            };

            await api.put(`/admin/employees/${employeeId}/assignments/${assignment._id}`, payload);
            toast.success(t('manage_assigned_school.update_success', 'Updated Successfully'), { id: loadingToast });

            setIsEditing(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || t('manage_assigned_school.update_error', 'Update Failed'), {
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
        const loadingToast = toast.loading(t('manage_assigned_school.revoking_toast', 'Revoking...'));
        try {
            await api.delete(`/admin/employees/${employeeId}/assignments/${assignment._id}`);
            toast.success(t('manage_assigned_school.revoke_success', 'Revoked Successfully'), { id: loadingToast });
            setDeleteModal({ isOpen: false });
            onClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || t('manage_assigned_school.revoke_error', 'Failed to Revoke'), {
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
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t('manage_assigned_school.category', 'Category')}</p>
                                    <span className="px-2.5 py-1 bg-primary/10 text-primary rounded border border-primary/20 text-sm font-bold">{assignment.category}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t('manage_assigned_school.status', 'Status')}</p>
                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20 text-sm font-bold">{t('manage_assigned_school.active', 'Active')}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Calendar className="w-3.5 h-3.5" /> {t('manage_assigned_school.start_date', 'Start Date')}</p>
                                    <p className="text-sm font-bold">{assignment.startDate ? assignment.startDate.split('T')[0] : t('manage_assigned_school.not_set', 'Not Set')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Calendar className="w-3.5 h-3.5" /> {t('manage_assigned_school.end_date', 'End Date')}</p>
                                    <p className="text-sm font-bold">{assignment.endDate ? assignment.endDate.split('T')[0] : t('manage_assigned_school.ongoing', 'Ongoing')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Clock className="w-3.5 h-3.5" /> {t('manage_assigned_school.timings', 'Timings')}</p>
                                    {/* --- NEW: Formatted 12-hour Display --- */}
                                    <p className="text-sm font-bold">{formatTime12Hour(assignment.startTime)} - {formatTime12Hour(assignment.endTime)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t('manage_assigned_school.days', 'Days')}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {assignment.allowedDays?.map(day => (
                                            <span key={day} className="px-2 py-0.5 bg-muted border border-border text-[10px] font-bold rounded">{t(`manage_assigned_school.days_short.${day}`, day)}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">

                            <div className="space-y-4 mb-4 pb-4 border-b border-border/50">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.school_name_label', 'School Name')}</Label>
                                    <Input value={editForm.schoolName} onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.address_label', 'School Address')}</Label>
                                    <Input value={editForm.schoolAddress} onChange={(e) => setEditForm({ ...editForm, schoolAddress: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.category', 'Category')}</Label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    >
                                        <option value="Junior Band">{t('manage_assigned_school.junior_band', 'Junior Band')}</option>
                                        <option value="Senior Band">{t('manage_assigned_school.senior_band', 'Senior Band')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.start_date', 'Start Date')}</Label>
                                    <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.end_date_opt', 'End Date (Opt)')}</Label>
                                    <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.start_time', 'Start Time')}</Label>
                                    <Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({ ...editForm, timeFrom: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('manage_assigned_school.end_time', 'End Time')}</Label>
                                    <Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({ ...editForm, timeTo: e.target.value })} className="h-10 rounded-lg" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">{t('manage_assigned_school.allowed_days', 'Allowed Days')}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button key={day} type="button" onClick={() => toggleEditDay(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${editForm.days?.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>
                                            {t(`manage_assigned_school.days_short.${day}`, day)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <Label className="text-xs flex items-center gap-1.5"><Map className="w-3.5 h-3.5" /> {t('manage_assigned_school.geofence_label', 'Geofence Coordinates')}</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{t('manage_assigned_school.latitude_label', 'Latitude')}</Label>
                                        <Input value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })} className="h-10 rounded-lg" placeholder="e.g. 23.2156" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{t('manage_assigned_school.longitude_label', 'Longitude')}</Label>
                                        <Input value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })} className="h-10 rounded-lg" placeholder="e.g. 72.6369" />
                                    </div>
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
                                <Trash2 className="w-4 h-4 mr-2" /> {t('manage_assigned_school.revoke_btn', 'Revoke Assignment')}
                            </Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-sm" onClick={() => setIsEditing(true)}>
                                <Edit2 className="w-4 h-4 mr-2" /> {t('manage_assigned_school.edit_btn', 'Edit Details')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" disabled={isLoading} className="w-full sm:w-auto h-11" onClick={() => setIsEditing(false)}>{t('manage_assigned_school.cancel_edit', 'Cancel Edit')}</Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-glow" disabled={isLoading} onClick={handleSaveEdit}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                {t('manage_assigned_school.save_changes', 'Save Changes')}
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
                        <h3 className="font-bold text-xl mb-2">{t('manage_assigned_school.delete_title', 'Confirm Revoke')}</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            <Trans
                                i18nKey="manage_assigned_school.delete_desc"
                                defaults="Are you sure you want to revoke <0>{{name}}</0>?"
                                values={{ name: schoolName }}
                                components={[<strong key="0" className="text-foreground" />]}
                            />
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" disabled={isLoading} className="flex-1 h-11 rounded-xl" onClick={() => setDeleteModal({ isOpen: false })}>{t('manage_assigned_school.cancel', 'Cancel')}</Button>
                            <Button variant="destructive" disabled={isLoading} className="flex-1 h-11 rounded-xl font-bold" onClick={confirmDelete}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('manage_assigned_school.confirm_revoke', 'Yes, Revoke')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageAssignedSchoolModal;