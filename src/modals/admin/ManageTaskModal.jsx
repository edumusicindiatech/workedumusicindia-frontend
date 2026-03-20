import { useState, useEffect } from "react";
import {
    ClipboardList, X, MapPin, Calendar, Clock,
    Edit2, Trash2, Save, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ManageTaskModal = ({ isOpen, onClose, task }) => {
    // UI States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [deleteModal, setDeleteModal] = useState(false);

    useEffect(() => {
        if (isOpen && task) {
            setIsEditing(false);
            setEditForm({ ...task });
            setDeleteModal(false);
        }
    }, [isOpen, task]);

    if (!isOpen || !task) return null;

    // --- HANDLERS ---
    const format12Hour = (time24) => {
        if (!time24) return "";
        const [hour, min] = time24.split(":");
        const h = parseInt(hour);
        const ampm = h >= 12 ? "PM" : "AM";
        return `${h % 12 || 12}:${min} ${ampm}`;
    };

    const toggleEditDay = (day) => {
        setEditForm(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const handleSaveEdit = () => {
        console.log("Saving Task Updates:", editForm);
        // Add API call here
        setIsEditing(false);
    };

    const confirmDelete = () => {
        console.log(`Deleted task ID: ${task.id}`);
        // Add API call here
        setDeleteModal(false);
        onClose();
    };

    const isRejected = task.status === "Rejected";
    const isAccepted = task.status === "Accepted";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>

            {/* MAIN MODAL */}
            <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-border flex items-start justify-between bg-muted/30 shrink-0">
                    <div className="flex items-center gap-3 pr-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground line-clamp-1" title={task.title}>
                                {task.title}
                            </h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> {task.schoolName}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">

                    {/* Status Banner */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${isAccepted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                            isRejected ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                                'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}>
                        {isAccepted ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> :
                            isRejected ? <XCircle className="w-5 h-5 shrink-0 mt-0.5" /> :
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}

                        <div>
                            <p className="font-bold text-sm">Status: {task.status}</p>
                            {isRejected && task.reason && (
                                <p className="text-xs mt-1 opacity-80"><strong>Reason:</strong> {task.reason}</p>
                            )}
                        </div>
                    </div>

                    {!isEditing ? (
                        /* READ-ONLY VIEW */
                        <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider"><Calendar className="w-3.5 h-3.5" /> Start Date</p>
                                    <p className="text-sm font-bold text-foreground">{task.startDate || "Not set"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider"><Calendar className="w-3.5 h-3.5" /> End Date</p>
                                    <p className="text-sm font-bold text-foreground">{task.endDate || "Single Day"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-3.5 h-3.5" /> Timings</p>
                                    <p className="text-sm font-bold text-foreground">
                                        {format12Hour(task.timeFrom)} - {format12Hour(task.timeTo)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">Scheduled Days</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {task.days?.map(day => (
                                            <span key={day} className="px-2 py-0.5 bg-muted border border-border text-foreground text-[10px] font-bold rounded">
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EDIT FORM VIEW */
                        <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-200 p-5 bg-muted/20 border border-border rounded-xl">
                            <div className="space-y-2">
                                <Label className="text-xs">Task Title</Label>
                                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="h-10 rounded-xl text-sm bg-background" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Start Date</Label>
                                    <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="h-10 rounded-xl text-sm bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">End Date <span className="text-muted-foreground font-normal">(Opt)</span></Label>
                                    <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="h-10 rounded-xl text-sm bg-background" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Start Time</Label>
                                    <Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({ ...editForm, timeFrom: e.target.value })} className="h-10 rounded-xl text-sm bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">End Time</Label>
                                    <Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({ ...editForm, timeTo: e.target.value })} className="h-10 rounded-xl text-sm bg-background" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Allowed Days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleEditDay(day)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${editForm.days?.includes(day) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 sm:p-6 border-t border-border bg-background flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-2xl">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" className="w-full sm:w-auto h-11 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteModal(true)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Revoke Task
                            </Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-sm" onClick={() => setIsEditing(true)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit Task Details
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" className="w-full sm:w-auto h-11 font-semibold" onClick={() => setIsEditing(false)}>
                                Cancel Edit
                            </Button>
                            <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-glow bg-primary" onClick={handleSaveEdit}>
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* SUB-MODAL: DELETE CONFIRMATION                           */}
            {/* ======================================================== */}
            {deleteModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setDeleteModal(false)}>
                    <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6 text-center animate-in zoom-in-95 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="font-bold text-xl mb-2 text-foreground">Revoke Task?</h3>
                        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                            Are you sure you want to remove <strong className="text-foreground">{task.title}</strong> from this employee's schedule?
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold" onClick={() => setDeleteModal(false)}>Cancel</Button>
                            <Button variant="destructive" className="flex-1 h-11 rounded-xl font-bold shadow-sm" onClick={confirmDelete}>Yes, Revoke</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ManageTaskModal;