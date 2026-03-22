import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, MapPin, Plus, CheckCircle2, AlertCircle, XCircle, CalendarDays, Clock, Pencil, Trash2 } from "lucide-react";

import AssignTaskModal from "../../../modals/admin/AssignTaskModal";
import ManageTaskModal from "../../../modals/admin/ManageTaskModal";

const TasksTab = ({ tasks, employeeId, onSuccess }) => {
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [manageModalData, setManageModalData] = useState({ isOpen: false, task: null });

    const getStatusIcon = (status) => {
        if (status === "Accepted") return <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />;
        if (status === "Rejected") return <XCircle className="w-3.5 h-3.5 mr-1.5" />;
        return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />;
    };

    const getStatusColor = (status) => {
        if (status === "Accepted") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        if (status === "Rejected") return "bg-destructive/10 text-destructive border-destructive/20";
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    };

    return (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-muted/10">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary shrink-0" /> Assigned Tasks
                </h3>
                <Button size="sm" className="gap-2 shadow-glow rounded-lg" onClick={() => setIsAssignModalOpen(true)}>
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Assign Task</span>
                    <span className="sm:hidden">Assign</span>
                </Button>
            </div>

            {/* Task List */}
            <div className="p-0">
                {tasks.map((task) => (
                    <div
                        key={task._id}
                        className="flex flex-col p-4 sm:p-6 border-b border-border last:border-0 hover:bg-muted/10 transition-colors gap-4"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                            {/* Details Section */}
                            <div className="min-w-0 flex-1 space-y-2.5">
                                {/* Task Objective / Description as Title */}
                                <h4 className="font-bold text-lg text-foreground leading-tight">
                                    {task.taskDescription}
                                </h4>

                                {/* School & Location Info */}
                                <div className="flex items-start sm:items-center gap-1.5 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                                    <span className="font-medium text-foreground/80 leading-snug">
                                        {task.school?.schoolName || "Unknown School"}
                                    </span>
                                    <span className="hidden sm:block opacity-40 shrink-0">•</span>
                                    <span className="leading-snug opacity-90 truncate">
                                        {task.school?.address || "No address provided"}
                                    </span>
                                </div>

                                {/* Information Badges - NOW MATCHES ASSIGNMENTS TAB */}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {/* Category Badge (Primary Colored) */}
                                    <span className="px-2.5 py-1 bg-primary/10 rounded-md border border-primary/20 text-xs font-bold text-primary flex items-center gap-1.5">
                                        {task.category || "Task"}
                                    </span>

                                    {/* Timing Badge */}
                                    {task.timing && (
                                        <span className="px-2.5 py-1 bg-muted rounded-md border border-border/50 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> {task.timing}
                                        </span>
                                    )}

                                    {/* Days Badge */}
                                    {task.daysAllotted && task.daysAllotted.length > 0 && (
                                        <span className="px-2.5 py-1 bg-muted rounded-md border border-border/50 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                            <CalendarDays className="w-3.5 h-3.5" /> {task.daysAllotted.join(', ')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions & Status Section */}
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 sm:border-transparent mt-2 sm:mt-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit flex items-center border ${getStatusColor(task.status)}`}>
                                    {getStatusIcon(task.status)} {task.status}
                                </span>

                                <div className="flex items-center gap-2">
                                    {task.status === "Accepted" ? (
                                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Managed in Assignments</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-2 text-muted-foreground hover:text-primary transition-colors"
                                                onClick={() => setManageModalData({ isOpen: true, task: task })}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline text-xs">Edit</span>
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                                                onClick={() => setManageModalData({ isOpen: true, task: task })}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Rejection Reason */}
                        {task.status === 'Rejected' && task.rejectReason && (
                            <div className="mt-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-destructive">
                                <strong>Reason for Rejection:</strong> {task.rejectReason}
                            </div>
                        )}
                    </div>
                ))}

                {(!tasks || tasks.length === 0) && (
                    <div className="p-8 text-center text-muted-foreground">
                        No tasks assigned to this employee yet.
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