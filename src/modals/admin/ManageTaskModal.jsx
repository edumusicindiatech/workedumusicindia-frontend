import React, { useState, useEffect, useRef } from "react";
import { ClipboardList, X, MapPin, Calendar, Clock, Edit2, Trash2, Save, AlertTriangle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
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

    const schoolName = task.school?.schoolName || "Unknown School";
    const schoolAddress = task.school?.address || "No address provided";

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

            await api.put(`/admin/tasks/${task._id}`, payload);
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
            await api.delete(`/admin/tasks/${task._id}`);
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
        if (status === "Accepted") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        if (status === "Rejected") return "bg-destructive/10 text-destructive border-destructive/20";
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-sm animate-in fade-in'}`} onClick={!isLoading ? handleClose : undefined}>
            <div className={`bg-card w-full max-w-xl rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0' : ''}`} style={{ transform: `translateY(${dragOffset}px)` }} onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className="sticky top-0 bg-muted/30 z-10 rounded-t-3xl md:rounded-t-2xl touch-none border-b border-border" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-4 pb-2 md:hidden"><div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div></div>
                    <div className="px-6 pb-4 pt-1 md:pt-5 flex items-center justify-between">
                        <div className="flex items-center gap-3 pr-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground line-clamp-1">{schoolName}</h2>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {schoolAddress}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={isLoading} className="p-2 hover:bg-muted rounded-full bg-background border border-border shrink-0 hidden md:block">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                    {/* Rejection Banner */}
                    {!isEditing && task.status === 'Rejected' && task.rejectReason && (
                        <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-sm text-destructive">
                            <strong className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Reason for Rejection:</strong>
                            <p>{task.rejectReason}</p>
                        </div>
                    )}

                    {!isEditing ? (
                        /* READ-ONLY VIEW */
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Primary Objective</p>
                                    <p className="text-sm font-bold text-foreground">{task.taskDescription}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Category</p>
                                    <span className="px-2.5 py-1 bg-primary/10 text-primary rounded border border-primary/20 text-sm font-bold">{task.category || "Task"}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Status</p>
                                    <span className={`px-2.5 py-1 rounded border text-sm font-bold ${getStatusColor(task.status)}`}>{task.status}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Calendar className="w-3.5 h-3.5" /> Start Date</p>
                                    <p className="text-sm font-bold">{editForm.startDate || "Not set"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Calendar className="w-3.5 h-3.5" /> End Date</p>
                                    <p className="text-sm font-bold">{editForm.endDate || "Ongoing"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider mb-1"><Clock className="w-3.5 h-3.5" /> Timings</p>
                                    <p className="text-sm font-bold">{editForm.timeFrom} - {editForm.timeTo}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Days</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {editForm.days?.map(day => (
                                            <span key={day} className="px-2 py-0.5 bg-muted border border-border text-[10px] font-bold rounded">{day}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EDIT FORM VIEW */
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
                            <div className="space-y-2">
                                <Label className="text-xs">Primary Task / Objective</Label>
                                <Input value={editForm.taskDescription} onChange={(e) => setEditForm({ ...editForm, taskDescription: e.target.value })} className="h-10 rounded-lg" />
                            </div>

                            <div className="pt-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">Task Category</Label>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setEditForm({ ...editForm, category: "Junior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border font-bold text-xs transition-all ${editForm.category === "Junior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                                        {editForm.category === "Junior Band" && <Check className="w-3.5 h-3.5" />} Junior Band
                                    </button>
                                    <button type="button" onClick={() => setEditForm({ ...editForm, category: "Senior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border font-bold text-xs transition-all ${editForm.category === "Senior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                                        {editForm.category === "Senior Band" && <Check className="w-3.5 h-3.5" />} Senior Band
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-xs">Start Date</Label><Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="h-10 rounded-lg" /></div>
                                <div className="space-y-2"><Label className="text-xs">End Date (Opt)</Label><Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="h-10 rounded-lg" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-xs">Start Time</Label><Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({ ...editForm, timeFrom: e.target.value })} className="h-10 rounded-lg" /></div>
                                <div className="space-y-2"><Label className="text-xs">End Time</Label><Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({ ...editForm, timeTo: e.target.value })} className="h-10 rounded-lg" /></div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Allowed Days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button key={day} type="button" onClick={() => toggleEditDay(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${editForm.days?.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 sm:p-6 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-3xl md:rounded-b-2xl pb-safe">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" className="w-full sm:w-auto h-11 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl" onClick={() => setDeleteModal({ isOpen: true })}>
                                <Trash2 className="w-4 h-4 mr-2" /> Revoke Task
                            </Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-sm rounded-xl" onClick={() => setIsEditing(true)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" disabled={isLoading} className="w-full sm:w-auto h-11 rounded-xl" onClick={() => setIsEditing(false)}>Cancel Edit</Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-glow rounded-xl" disabled={isLoading} onClick={handleSaveEdit}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Changes
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
                        <h3 className="font-bold text-xl mb-2">Revoke Task?</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Are you sure you want to remove this task from <strong>{schoolName}</strong>? This will notify them immediately.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" disabled={isLoading} className="flex-1 h-11 rounded-xl" onClick={() => setDeleteModal({ isOpen: false })}>Cancel</Button>
                            <Button variant="destructive" disabled={isLoading} className="flex-1 h-11 rounded-xl font-bold" onClick={confirmDelete}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Revoke"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTaskModal;