import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, MapPin, Plus, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

// Import Modals (Adjust paths as needed)
import AssignTaskModal from "../../../modals/admin/AssignTaskModal";
import ManageTaskModal from "../../../modals/admin/ManageTaskModal";

const TasksTab = ({ tasks }) => {
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
                        key={task.id}
                        onClick={() => setManageModalData({ isOpen: true, task: task })}
                        className="flex flex-col sm:flex-row sm:items-start justify-between p-4 sm:p-6 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group gap-4"
                    >
                        <div className="min-w-0 flex-1 space-y-2.5">
                            {/* Task Title */}
                            <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">
                                {task.title}
                            </h4>

                            {/* Responsive School & Location Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-sm text-muted-foreground">
                                <div className="flex items-start sm:items-center gap-1.5 shrink-0">
                                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                                    <span className="font-medium text-foreground/80 leading-snug">{task.schoolName}</span>
                                </div>
                                <span className="hidden sm:block opacity-40 shrink-0">•</span>
                                <div className="pl-5 sm:pl-0 leading-snug opacity-90 truncate">
                                    {task.location}
                                </div>
                            </div>

                            {/* Mobile Badge (Renders underneath text on small screens) */}
                            <div className="pt-2 sm:hidden">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit flex items-center border ${getStatusColor(task.status)}`}>
                                    {getStatusIcon(task.status)} {task.status}
                                </span>
                            </div>
                        </div>

                        {/* Desktop Badge (Renders on the right on larger screens) */}
                        <div className="hidden sm:flex shrink-0 pt-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit flex items-center border ${getStatusColor(task.status)}`}>
                                {getStatusIcon(task.status)} {task.status}
                            </span>
                        </div>
                    </div>
                ))}

                {tasks.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        No tasks assigned to this employee yet.
                    </div>
                )}
            </div>

            {/* Modals rendered here */}
            <AssignTaskModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
            />

            <ManageTaskModal
                isOpen={manageModalData.isOpen}
                onClose={() => setManageModalData({ isOpen: false, task: null })}
                task={manageModalData.task}
            />
        </div>
    );
};

export default TasksTab;