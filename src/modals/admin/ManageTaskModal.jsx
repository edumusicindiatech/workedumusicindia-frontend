import { useState, useEffect, useRef } from "react";
import { ClipboardList, X, MapPin, Calendar, Clock, Edit2, Trash2, Save, AlertTriangle, Loader2, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner"; // <-- Ensure you are using Sonner here as well!
import api from "../../api/axios";

const ManageTaskModal = ({ isOpen, onClose, task, employeeId, onSuccess }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false });

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    const isRejected = task?.status?.toLowerCase() === "rejected";

    // Initialize form when modal opens
    useEffect(() => {
        if (isOpen && task) {
            let parsedStartDate = "";
            let parsedEndDate = "";
            if (task.duration) {
                const durationParts = task.duration.split(" to ");
                parsedStartDate = durationParts[0] || "";
                parsedEndDate = durationParts[1] || "";
            }

            let parsedTimeFrom = "";
            let parsedTimeTo = "";
            if (task.timing) {
                const timeParts = task.timing.split(" - ");
                parsedTimeFrom = timeParts[0] || "";
                parsedTimeTo = timeParts[1] || "";
            }

            // Force editing to false, especially if rejected
            setIsEditing(false);
            setEditForm({
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

    const schoolName = task.school?.schoolName || task.schoolName || "Unknown School";
    const schoolAddress = task.school?.address || task.location || "No address provided";

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

    const toggleEditDay = (day) => {
        setEditForm(prev => ({ ...prev, days: prev.days?.includes(day) ? prev.days.filter(d => d !== day) : [...(prev.days || []), day] }));
    };

    // --- API HANDLERS ---
    const handleSaveEdit = async () => {
        setIsLoading(true);
        const loadingToast = toast.loading("Updating task...");
        try {
            const payload = {
                taskDescription: editForm.taskDescription,
                category: editForm.category,
                daysAllotted: editForm.days,
                duration: editForm.endDate ? `${editForm.startDate} to ${editForm.endDate}` : editForm.startDate,
                timing: `${editForm.timeFrom} - ${editForm.timeTo}`
            };

            await api.put(`/admin/tasks/${task._id || task.id}`, payload);
            toast.success("Task updated successfully!", { id: loadingToast });

            setIsEditing(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update task.", { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = async () => {
        setIsLoading(true);
        const loadingToast = toast.loading("Revoking task...");
        try {
            await api.delete(`/admin/tasks/${task._id || task.id}`);
            toast.success("Task revoked successfully!", { id: loadingToast });
            setDeleteModal({ isOpen: false });
            handleClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to revoke task.", { id: loadingToast });
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

                {/* Decorative Top Line */}
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
                                <strong className="block text-xs uppercase tracking-wider opacity-80 mb-0.5">Reason for Rejection:</strong>
                                <span className="font-medium text-base">{task.rejectReason}</span>
                            </div>
                        </div>
                    )}

                    {!isEditing ? (
                        /* READ-ONLY VIEW */
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-muted/20 p-5 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Primary Objective</p>
                                    <p className="text-base sm:text-lg font-bold text-foreground leading-snug">{task.taskDescription}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Category</p>
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20 text-sm font-bold">{task.category || "Task"}</span>
                                </div>
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Status</p>
                                    <span className={`px-3 py-1 rounded-lg border text-sm font-bold capitalize ${getStatusColor(task.status)}`}>{task.status}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2"><Calendar className="w-3.5 h-3.5" /> Start Date</p>
                                    <p className="text-sm font-bold text-foreground">{editForm.startDate || "Not set"}</p>
                                </div>
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2"><Calendar className="w-3.5 h-3.5" /> End Date</p>
                                    <p className="text-sm font-bold text-foreground">{editForm.endDate || "Ongoing"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2"><Clock className="w-3.5 h-3.5" /> Timings</p>
                                    <p className="text-sm font-bold text-foreground">{editForm.timeFrom} - {editForm.timeTo}</p>
                                </div>
                                <div className="bg-muted/20 p-4 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Days</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {editForm.days?.map(day => (
                                            <span key={day} className="px-2.5 py-1 bg-card border border-border/80 text-[11px] font-bold rounded-md shadow-sm">{day}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EDIT FORM VIEW */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 bg-muted/10 p-5 rounded-2xl border border-border/50">
                            <div className="space-y-2.5">
                                <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Primary Task / Objective</Label>
                                <Input value={editForm.taskDescription} onChange={(e) => setEditForm({ ...editForm, taskDescription: e.target.value })} className="h-12 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/10" />
                            </div>

                            <div className="pt-2">
                                <Label className="text-xs text-foreground uppercase tracking-wider font-bold mb-3 block ml-1">Task Category</Label>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setEditForm({ ...editForm, category: "Junior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-bold text-sm transition-all ${editForm.category === "Junior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-card border-border/60 text-muted-foreground hover:bg-muted'}`}>
                                        {editForm.category === "Junior Band" && <Check className="w-4 h-4" />} Junior Band
                                    </button>
                                    <button type="button" onClick={() => setEditForm({ ...editForm, category: "Senior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-bold text-sm transition-all ${editForm.category === "Senior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-card border-border/60 text-muted-foreground hover:bg-muted'}`}>
                                        {editForm.category === "Senior Band" && <Check className="w-4 h-4" />} Senior Band
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Start Date</Label><Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">End Date (Opt)</Label><Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Start Time</Label><Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({ ...editForm, timeFrom: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                                <div className="space-y-2.5"><Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">End Time</Label><Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({ ...editForm, timeTo: e.target.value })} className="h-12 rounded-xl bg-card border-border/60" /></div>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Allowed Days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button key={day} type="button" onClick={() => toggleEditDay(day)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${editForm.days?.includes(day) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card text-muted-foreground border-border/60 hover:border-border hover:bg-muted/50'}`}>
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-4xl pb-safe">
                    {!isEditing ? (
                        <>
                            {/* --- THE FIX: Edit button hidden if rejected! --- */}
                            <Button
                                variant="outline"
                                className={`h-12 font-bold rounded-xl text-destructive border-destructive/30 hover:bg-destructive hover:text-white hover:border-destructive transition-all ${isRejected ? 'w-full' : 'w-full sm:w-auto'}`}
                                onClick={() => setDeleteModal({ isOpen: true })}
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Revoke Task
                            </Button>

                            {!isRejected && (
                                <Button
                                    className="w-full sm:w-auto h-12 px-10 font-bold shadow-lg shadow-primary/25 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="flex w-full gap-3">
                            <Button variant="outline" disabled={isLoading} className="flex-1 sm:flex-none h-12 rounded-xl font-bold border-border/80 hover:bg-muted transition-colors" onClick={() => setIsEditing(false)}>
                                Cancel Edit
                            </Button>
                            <Button className="flex-2 sm:flex-none sm:px-10 h-12 font-bold shadow-lg shadow-primary/25 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]" disabled={isLoading} onClick={handleSaveEdit}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                Save Changes
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

                        <h3 className="font-extrabold text-2xl mb-2 text-foreground">Revoke Task?</h3>
                        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                            Are you sure you want to permanently remove this task from <strong>{schoolName}</strong>? The employee will be notified immediately.
                        </p>

                        <div className="flex w-full gap-3">
                            <Button variant="outline" disabled={isLoading} className="flex-1 h-12 rounded-xl font-bold border-border/80 hover:bg-muted" onClick={() => setDeleteModal({ isOpen: false })}>
                                Cancel
                            </Button>
                            <Button variant="destructive" disabled={isLoading} className="flex-1 h-12 rounded-xl font-bold shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)]" onClick={confirmDelete}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Revoke"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTaskModal;