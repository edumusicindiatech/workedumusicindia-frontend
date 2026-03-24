import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
    ClipboardList, MapPin, Plus, CheckCircle2,
    AlertCircle, XCircle, CalendarDays, Clock,
    Pencil, Trash2, CheckSquare, Info, Sparkles
} from "lucide-react";

import AssignTaskModal from "../../../modals/admin/AssignTaskModal";
import ManageTaskModal from "../../../modals/admin/ManageTaskModal";

// --- SOCKET IMPORT FOR REAL-TIME REFRESH ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const TasksTab = ({ tasks, employeeId, onSuccess }) => {
    // 1. Grab Admin user to join the socket room
    const { user } = useSelector((state) => state.auth);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [manageModalData, setManageModalData] = useState({ isOpen: false, task: null });

    // ==========================================
    // 2. REAL-TIME DATA SYNC
    // ==========================================
    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;

        // Ensure Admin is in their room to hear updates
        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = () => {
            console.log("Task response received from Employee! Refreshing Admin list...");
            if (onSuccess) onSuccess();
        };

        socket.on("new_notification", handleRealTimeUpdate);

        return () => {
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [user, onSuccess]);

    // --- UI Helpers ---
    const getStatusIcon = (status) => {
        if (status === "Accepted" || status === "accepted") return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
        if (status === "Rejected" || status === "rejected") return <XCircle className="w-4 h-4 mr-1.5" />;
        return <AlertCircle className="w-4 h-4 mr-1.5" />;
    };

    const getStatusColor = (status) => {
        if (status === "Accepted" || status === "accepted") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        if (status === "Rejected" || status === "rejected") return "bg-destructive/10 text-destructive dark:text-red-400 border-destructive/20";
        return "bg-primary/10 text-primary border-primary/20"; // Pending status
    };

    return (
        <div className="bg-card rounded-4xl shadow-sm border border-border overflow-hidden animate-in fade-in duration-500">

            {/* --- PREMIUM HEADER --- */}
            <div className="p-5 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/40 via-primary to-primary/40" />
                <h3 className="text-xl font-extrabold flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <ClipboardList className="w-5 h-5 text-primary shrink-0" />
                    </div>
                    Assigned Tasks
                </h3>
                <Button
                    className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold h-11 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95"
                    onClick={() => setIsAssignModalOpen(true)}
                >
                    <Plus className="w-5 h-5 shrink-0" /> Assign New Task
                </Button>
            </div>

            {/* --- TASK LIST --- */}
            <div className="p-4 sm:p-6">
                {(!tasks || tasks.length === 0) ? (
                    /* --- PREMIUM EMPTY STATE --- */
                    <div className="border border-dashed border-border/60 rounded-4xl p-10 sm:p-14 text-center flex flex-col items-center relative overflow-hidden group hover:bg-muted/5 transition-colors">
                        <div className="w-20 h-20 mb-5 relative">
                            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                            <div className="relative w-full h-full bg-muted rounded-full flex items-center justify-center border-4 border-card shadow-sm z-10">
                                <CheckSquare className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">No Tasks Assigned</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm text-sm sm:text-base">
                            This employee currently has no active or pending tasks.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => setIsAssignModalOpen(true)}
                            className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold"
                        >
                            <Sparkles className="w-4 h-4 mr-2" /> Assign their first task
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.map((task) => {
                            const isPending = task.status.toLowerCase() === "pending";
                            const isRejected = task.status.toLowerCase() === "rejected";

                            return (
                                <div
                                    key={task._id || task.id}
                                    className={`relative group flex flex-col p-5 sm:p-6 rounded-2xl border transition-all duration-300 ${isPending
                                            ? "bg-card border-primary/30 shadow-sm hover:border-primary/60 hover:shadow-md"
                                            : "bg-muted/10 border-border hover:bg-muted/30"
                                        }`}
                                >
                                    {isPending && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-primary rounded-b-full shadow-[0_0_10px_rgba(var(--primary),0.8)]" />}

                                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">

                                        {/* Details Section */}
                                        <div className="min-w-0 flex-1 space-y-3">

                                            {/* Status Badge */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center border ${getStatusColor(task.status)}`}>
                                                    {isPending && (
                                                        <span className="relative flex h-2 w-2 mr-1.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                        </span>
                                                    )}
                                                    {getStatusIcon(task.status)} {task.status}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h4 className="font-extrabold text-lg sm:text-xl text-foreground leading-tight">
                                                {task.taskDescription}
                                            </h4>

                                            {/* Location Info */}
                                            <div className="flex items-start sm:items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                                                <span className="font-semibold text-foreground/80">
                                                    {task.school?.schoolName || task.schoolName || "Unknown Location"}
                                                </span>
                                                <span className="hidden sm:block opacity-40 shrink-0">•</span>
                                                <span className="leading-snug opacity-90 truncate">
                                                    {task.school?.address || task.location || "No address provided"}
                                                </span>
                                            </div>

                                            {/* Info Badges */}
                                            <div className="flex flex-wrap gap-2.5 pt-2">
                                                <span className="px-3 py-1 bg-primary/10 rounded-lg border border-primary/10 text-xs font-bold text-primary flex items-center gap-1.5">
                                                    {task.category || "Task"}
                                                </span>
                                                {task.timing && (
                                                    <span className="px-3 py-1 bg-muted rounded-lg border border-border/50 text-xs font-bold text-foreground flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" /> {task.timing}
                                                    </span>
                                                )}
                                                {task.daysAllotted && task.daysAllotted.length > 0 && (
                                                    <span className="px-3 py-1 bg-muted rounded-lg border border-border/50 text-xs font-bold text-foreground flex items-center gap-1.5">
                                                        <CalendarDays className="w-3.5 h-3.5 text-blue-500" /> {task.daysAllotted.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions Section */}
                                        <div className="flex flex-row xl:flex-col items-center xl:items-end justify-start xl:justify-start gap-2.5 shrink-0 pt-4 xl:pt-0 border-t border-border/50 xl:border-transparent mt-2 xl:mt-0">
                                            {task.status.toLowerCase() === "accepted" ? (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Added to Schedule
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Hide the Edit button if the task is Rejected */}
                                                    {!isRejected && (
                                                        <Button
                                                            variant="outline"
                                                            className="h-10 rounded-xl gap-2 font-bold text-muted-foreground hover:text-primary border-border/80 hover:border-primary/30 transition-all flex-1 xl:flex-none"
                                                            onClick={() => setManageModalData({ isOpen: true, task: task })}
                                                        >
                                                            <Pencil className="w-4 h-4" /> Edit
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        className="h-10 rounded-xl gap-2 font-bold text-destructive hover:bg-destructive hover:text-white border-destructive/20 hover:border-destructive transition-all flex-1 xl:flex-none"
                                                        onClick={() => setManageModalData({ isOpen: true, task: task })}
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Delete
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rejection Reason */}
                                    {isRejected && task.rejectReason && (
                                        <div className="mt-4 p-3.5 bg-destructive/5 border border-destructive/10 rounded-xl text-sm text-destructive flex items-start gap-2.5">
                                            <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="block text-xs uppercase tracking-wider opacity-80 mb-0.5">Reason for Rejection</strong>
                                                <span className="font-medium">{task.rejectReason}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modals */}
            <AssignTaskModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                employeeId={employeeId}
                onSuccess={() => {
                    setIsAssignModalOpen(false);
                    if (onSuccess) onSuccess();
                }}
            />

            <ManageTaskModal
                isOpen={manageModalData.isOpen}
                onClose={() => setManageModalData({ isOpen: false, task: null })}
                task={manageModalData.task}
                employeeId={employeeId}
                onSuccess={() => {
                    setManageModalData({ isOpen: false, task: null });
                    if (onSuccess) onSuccess();
                }}
            />
        </div>
    );
};

export default TasksTab;