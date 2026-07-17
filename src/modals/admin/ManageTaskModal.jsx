import { useState, useEffect, useRef } from "react";
import { ClipboardList, X, MapPin, Map, Calendar, Clock, Edit2, Trash2, Save, AlertTriangle, Loader2, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation, Trans } from "react-i18next";

// --- Helper function to convert 24h to 12h AM/PM format ---
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

// --- FIX: Add the IST Date String Helper ---
const toISTDateString = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
    }); // Returns "YYYY-MM-DD" format accurately adjusted for IST
};

const ManageTaskModal = ({ isOpen, onClose, task, employeeId, onSuccess }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false });

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    const isRejected = task?.status?.toLowerCase() === "rejected";

    useEffect(() => {
        if (isOpen && task) {
            setIsEditing(false);

            // Safely extract coordinates depending on if it's new GeoJSON or legacy format
            let lat = "";
            let lng = "";
            if (task.school?.location?.coordinates) {
                lng = task.school.location.coordinates[0];
                lat = task.school.location.coordinates[1];
            } else if (task.school?.geofence) {
                lat = task.school.geofence.latitude;
                lng = task.school.geofence.longitude;
            }

            // --- FIX: Use toISTDateString instead of .split('T')[0] ---
            let parsedStartDate = task.startDate ? toISTDateString(task.startDate) : "";
            let parsedEndDate = task.endDate ? toISTDateString(task.endDate) : "";

            if (!parsedStartDate && task.duration) {
                const durationParts = task.duration.split(" to ");
                parsedStartDate = durationParts[0] || "";
                parsedEndDate = durationParts[1] || "";
            }

            let parsedTimeFrom = task.startTime || "";
            let parsedTimeTo = task.endTime || "";
            if (!parsedTimeFrom && task.timing) {
                // If using the very old "09:00 AM - 03:00 PM" format, it will need to be re-entered.
                const timeParts = task.timing.split(" - ");
                parsedTimeFrom = timeParts[0] || "";
                parsedTimeTo = timeParts[1] || "";
            }

            setEditForm({
                schoolName: task.school?.schoolName || "",
                schoolAddress: task.school?.address || "",
                latitude: lat,
                longitude: lng,
                taskDescription: task.taskDescription || "",
                category: task.category || "Junior Band",
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                timeFrom: parsedTimeFrom,
                timeTo: parsedTimeTo,
                days: task.daysAllotted || []
            });
            setDeleteModal({ isOpen: false });
        }
    }, [isOpen, task]);

    if (!isOpen || !task) return null;

    const schoolName = task.school?.schoolName || task.schoolName || t('manage_task.unknown_school');
    const schoolAddress = task.school?.address || task.location || t('manage_task.no_address');

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

    const toggleEditDay = (day) => {
        setEditForm(prev => ({ ...prev, days: prev.days?.includes(day) ? prev.days.filter(d => d !== day) : [...(prev.days || []), day] }));
    };

    const handleSaveEdit = async () => {
        if ((editForm.latitude && !editForm.longitude) || (!editForm.latitude && editForm.longitude)) {
            toast.error(t('manage_assigned_school.coord_error', 'Both Latitude and Longitude must be provided together.'));
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading(t('manage_task.updating_toast'));

        try {
            const payload = {
                schoolName: editForm.schoolName,
                schoolAddress: editForm.schoolAddress,
                latitude: editForm.latitude,
                longitude: editForm.longitude,
                taskDescription: editForm.taskDescription,
                category: editForm.category,
                daysAllotted: editForm.days,
                startDate: editForm.startDate,
                endDate: editForm.endDate,
                startTime: editForm.timeFrom,
                endTime: editForm.timeTo
            };

            await api.put(`/admin/tasks/${task._id || task.id}`, payload);
            toast.success(t('manage_task.update_success'), { id: loadingToast });

            setIsEditing(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || t('manage_task.update_error'), {
                id: loadingToast,
                duration: 6000,
                style: { maxWidth: '500px', padding: '16px', lineHeight: '1.5', textAlign: 'center' }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = async () => {
        setIsLoading(true);
        const loadingToast = toast.loading(t('manage_task.revoking_toast'));
        try {
            await api.delete(`/admin/tasks/${task._id || task.id}`);
            toast.success(t('manage_task.revoke_success'), { id: loadingToast });
            setDeleteModal({ isOpen: false });
            handleClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || t('manage_task.revoke_error'), {
                id: loadingToast,
                duration: 6000,
                style: { maxWidth: '500px', padding: '16px', lineHeight: '1.5', textAlign: 'center' }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const s = status.toLowerCase();
        if (s === "accepted") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    };

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={!isLoading ? handleClose : undefined}>
            <div className={`bg-card w-full max-w-xl rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} style={{ transform: `translateY(${dragOffset}px)` }} onClick={e => e.stopPropagation()}>

                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden"><div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div></div>
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <ClipboardList className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground line-clamp-1 tracking-tight">{schoolName}</h2>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                                    <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" /> {schoolAddress}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={isLoading} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                    {/* Rejection Banner */}
                    {!isEditing && isRejected && task.rejectReason && (
                        <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl text-sm text-destructive flex items-start gap-3 shadow-sm">
                            <Info className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <strong className="block text-xs uppercase tracking-wider opacity-80 mb-0.5">{t('manage_task.rejection_reason')}</strong>
                                <span className="font-medium text-base">{task.rejectReason}</span>
                            </div>
                        </div>
                    )}

                    {!isEditing ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-muted/20 p-5 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">{t('manage_task.primary_objective')}</p>
                                    <p className="text-base sm:text-lg font-bold text-foreground leading-snug">{task.taskDescription}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">{t('manage_task.category')}</p>
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20 text-sm font-bold">{task.category || t('manage_task.task_placeholder')}</span>
                                </div>
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">{t('manage_task.status')}</p>
                                    <span className={`px-3 py-1 rounded-lg border text-sm font-bold capitalize ${getStatusColor(task.status)}`}>{task.status}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2"><Calendar className="w-3.5 h-3.5" /> {t('manage_task.start_date')}</p>
                                    <p className="text-sm font-bold text-foreground">{editForm.startDate || t('manage_task.not_set')}</p>
                                </div>
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2"><Calendar className="w-3.5 h-3.5" /> {t('manage_task.end_date')}</p>
                                    <p className="text-sm font-bold text-foreground">{editForm.endDate || t('manage_task.ongoing')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2"><Clock className="w-3.5 h-3.5" /> {t('manage_task.timings')}</p>
                                    <p className="text-sm font-bold text-foreground">
                                        {formatTime12Hour(editForm.timeFrom)} - {formatTime12Hour(editForm.timeTo)}
                                    </p>
                                </div>
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">{t('manage_task.days')}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {editForm.days?.map(day => (
                                            <span key={day} className="px-2.5 py-1 bg-card border border-border/80 text-[11px] font-bold rounded-md shadow-sm">{day}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 bg-muted/10 p-5 rounded-2xl border border-border/50">

                            {/* --- NEW: School Info Edit Block --- */}
                            <div className="space-y-4 mb-4 pb-4 border-b border-border/50">
                                <div className="space-y-2.5">
                                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.school_name_label', 'School Name')}</Label>
                                    <Input value={editForm.schoolName} onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" />
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.address_label', 'School Address')}</Label>
                                    <Input value={editForm.schoolAddress} onChange={(e) => setEditForm({ ...editForm, schoolAddress: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.primary_objective_label')}</Label>
                                <Input value={editForm.taskDescription} onChange={(e) => setEditForm({ ...editForm, taskDescription: e.target.value })} className="h-12 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/10" />
                            </div>

                            <div className="pt-2">
                                <Label className="text-xs text-foreground uppercase tracking-wider font-bold mb-3 block ml-1">{t('manage_task.task_category')}</Label>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setEditForm({ ...editForm, category: "Junior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-bold text-sm transition-all ${editForm.category === "Junior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-card border-border/60 text-muted-foreground hover:bg-muted'}`}>
                                        {editForm.category === "Junior Band" && <Check className="w-4 h-4" />} {t('manage_task.junior_band')}
                                    </button>
                                    <button type="button" onClick={() => setEditForm({ ...editForm, category: "Senior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-bold text-sm transition-all ${editForm.category === "Senior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-card border-border/60 text-muted-foreground hover:bg-muted'}`}>
                                        {editForm.category === "Senior Band" && <Check className="w-4 h-4" />} {t('manage_task.senior_band')}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.start_date')}</Label><Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.end_date_opt')}</Label><Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.start_time')}</Label><Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({ ...editForm, timeFrom: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.end_time')}</Label><Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({ ...editForm, timeTo: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('manage_task.allowed_days')}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button key={day} type="button" onClick={() => toggleEditDay(day)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${editForm.days?.includes(day) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card text-muted-foreground border-border/60 hover:border-border hover:bg-muted/50'}`}>
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* --- NEW: Geofence Block --- */}
                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <Label className="text-xs flex items-center gap-1.5 font-bold uppercase tracking-wider ml-1"><Map className="w-3.5 h-3.5" /> {t('manage_task.geofence_label', 'Geofence Coordinates')}</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{t('manage_task.latitude_label', 'Latitude')}</Label>
                                        <Input value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" placeholder="e.g. 23.2156" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{t('manage_task.longitude_label', 'Longitude')}</Label>
                                        <Input value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" placeholder="e.g. 72.6369" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-4xl pb-safe">
                    {!isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                className={`h-12 font-bold rounded-xl text-destructive border-destructive/30 hover:bg-destructive hover:text-white hover:border-destructive transition-all ${isRejected ? 'w-full' : 'w-full sm:w-auto'}`}
                                onClick={() => setDeleteModal({ isOpen: true })}
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> {t('manage_task.revoke_btn')}
                            </Button>

                            {!isRejected && (
                                <Button
                                    className="w-full sm:w-auto h-12 px-10 font-bold shadow-lg shadow-primary/25 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit2 className="w-4 h-4 mr-2" /> {t('manage_task.edit_btn')}
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="flex w-full gap-3">
                            <Button variant="outline" disabled={isLoading} className="flex-1 sm:flex-none h-12 rounded-xl font-bold border-border/80 hover:bg-muted transition-colors" onClick={() => setIsEditing(false)}>
                                {t('manage_task.cancel_edit')}
                            </Button>
                            <Button className="flex-2 sm:flex-none sm:px-10 h-12 font-bold shadow-lg shadow-primary/25 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]" disabled={isLoading} onClick={handleSaveEdit}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                {t('manage_task.save_changes')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* DELETE CONFIRMATION SUB-MODAL */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setDeleteModal({ isOpen: false })}>
                    <div className="bg-card w-full max-w-sm rounded-4xl shadow-2xl border border-border/50 p-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-300 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40" />

                        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 border border-destructive/20 relative">
                            <div className="absolute inset-0 bg-destructive/20 rounded-2xl animate-ping opacity-20" />
                            <AlertTriangle className="w-10 h-10 text-destructive relative z-10" />
                        </div>

                        <h3 className="font-extrabold text-2xl mb-2 text-foreground">{t('manage_task.delete_title')}</h3>
                        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                            <Trans
                                i18nKey="manage_task.delete_desc"
                                values={{ name: schoolName }}
                                components={[<span key="0" />, <strong key="1" />]}
                            />
                        </p>

                        <div className="flex w-full gap-3">
                            <Button variant="outline" disabled={isLoading} className="flex-1 h-12 rounded-xl font-bold border-border/80 hover:bg-muted" onClick={() => setDeleteModal({ isOpen: false })}>
                                {t('manage_task.cancel')}
                            </Button>
                            <Button variant="destructive" disabled={isLoading} className="flex-1 h-12 rounded-xl font-bold shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)]" onClick={confirmDelete}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('manage_task.confirm_revoke')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTaskModal;