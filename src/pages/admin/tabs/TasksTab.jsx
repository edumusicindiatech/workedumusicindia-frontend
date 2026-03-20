import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, School, Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import AssignTaskModal from "../../../modals/admin/AssignTaskModal";

const TasksTab = ({ tasks }) => {
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    return (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary" /> Task Requests
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 hidden md:block">Review the status of optional assignments sent to this employee.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsTaskModalOpen(true)}>
                    <Plus className="w-4 h-4" /> Send Request
                </Button>
            </div>
            <div className="p-0">
                {tasks.map((task) => (
                    <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border last:border-0 hover:bg-muted/30 gap-4">
                        <div>
                            <p className="font-semibold text-foreground text-base">{task.title}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <School className="w-3.5 h-3.5" /> {task.school}
                            </p>
                            {task.status === 'Rejected' && task.reason && (
                                <p className="text-sm text-destructive mt-2 bg-destructive/10 p-2 rounded-md border border-destructive/20 inline-block">
                                    <span className="font-medium">Reason:</span> {task.reason}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {task.status === 'Accepted' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {task.status === 'Rejected' && <XCircle className="w-4 h-4 text-destructive" />}
                            {task.status === 'Pending' && <Clock className="w-4 h-4 text-slate-500" />}
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${task.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : task.status === 'Rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                                {task.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <AssignTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
        </div>
    );
};

export default TasksTab;