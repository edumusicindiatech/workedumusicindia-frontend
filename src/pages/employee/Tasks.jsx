import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import {
    MapPin, Calendar, Clock, ClipboardList,
    CheckCircle, XCircle, Info, Loader2, Tags
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "../../api/axios";
import RejectTaskModal from "../../modals/employee/RejectTaskModal";

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    const pendingCount = tasks.filter(task => task.status === "pending").length;

    // --- FETCH TASKS ---
    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/employee/tasks');
            if (res.data.success) {
                setTasks(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // --- HANDLE RESPONSES ---
    const handleResponse = async (taskId, status, reason = null) => {
        setActionLoading(true);
        try {
            await api.put(`/employee/tasks/${taskId}/respond`, {
                status: status, // 'Accepted' or 'Rejected'
                rejectReason: reason
            });

            // Update UI Locally for instant feedback
            setTasks(prevTasks => prevTasks.map(task =>
                task.id === taskId ? { ...task, status: status.toLowerCase(), rejectReason: reason } : task
            ));

            if (status === 'Accepted') {
                setSuccessMessage("Task accepted successfully! It has been added to your schedule.");
                setTimeout(() => setSuccessMessage(""), 4000);
            }

            closeRejectModal();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to respond to task.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAccept = (id) => handleResponse(id, 'Accepted');

    const handleRejectSubmit = (reason) => {
        if (!reason.trim()) return;
        handleResponse(selectedTaskId, 'Rejected', reason.trim());
    };

    const openRejectModal = (id) => {
        setSelectedTaskId(id);
        setIsRejectModalOpen(true);
    };

    const closeRejectModal = () => {
        if (!actionLoading) {
            setIsRejectModalOpen(false);
            setSelectedTaskId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-medium">Checking for new assignments...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-6xl mx-auto pb-20 relative">
            {/* Header Updated to 'Tasks' */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        Tasks
                        {pendingCount > 0 && (
                            <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-bold tracking-wide mt-1">
                                {pendingCount} Pending
                            </span>
                        )}
                    </h1>
                    <p className="text-muted-foreground mt-1">Review and accept or reject assigned tasks.</p>
                </div>
            </div>

            {/* Success Toast */}
            {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold text-sm">{successMessage}</p>
                </div>
            )}

            {/* Task Cards Grid */}
            {tasks.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-sm flex flex-col items-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1">All caught up!</h3>
                    <p className="text-muted-foreground">You have no assigned tasks at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {tasks.map((task) => {
                        const isPending = task.status === "pending";
                        const isAccepted = task.status === "accepted";
                        const isRejected = task.status === "rejected";

                        return (
                            <div key={task.id} className={`bg-card rounded-2xl p-6 transition-all duration-300 flex flex-col ${isPending ? "border-primary/20 border-2 shadow-elevated" : "border border-border opacity-80 grayscale-[0.1] shadow-sm"}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground">{task.schoolName}</h2>
                                        <div className="flex items-center gap-1.5 text-muted-foreground mt-1 text-sm">
                                            <MapPin className="w-4 h-4 shrink-0" />
                                            <span>{task.location}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold bg-primary/10 px-2.5 py-1 rounded text-primary uppercase tracking-wider shrink-0 flex items-center gap-1">
                                        <Tags className="w-3 h-3" /> {task.category}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-5 bg-muted/30 p-4 rounded-xl border border-border/50">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                            <Calendar className="w-3.5 h-3.5" /> Days
                                        </div>
                                        <p className="text-sm font-bold text-foreground">
                                            {task.daysAllotted.join(", ")} <span className="text-muted-foreground font-medium">({task.duration})</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                            <Clock className="w-3.5 h-3.5" /> Timing
                                        </div>
                                        <p className="text-sm font-bold text-foreground">{task.timing}</p>
                                    </div>
                                </div>

                                <div className="mb-6 flex-1">
                                    <div className="flex items-center gap-1.5 text-foreground font-semibold mb-2">
                                        <ClipboardList className="w-4 h-4 text-primary" />
                                        Task Description
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {task.taskDescription}
                                    </p>
                                </div>

                                <div className="pt-5 border-t border-border mt-auto">
                                    {isPending && (
                                        <div className="flex items-center gap-3">
                                            <Button onClick={() => openRejectModal(task.id)} disabled={actionLoading} variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold h-12 rounded-xl">
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                            <Button onClick={() => handleAccept(task.id)} disabled={actionLoading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl shadow-glow">
                                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Accept Task</>}
                                            </Button>
                                        </div>
                                    )}

                                    {isAccepted && (
                                        <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold py-3 rounded-xl">
                                            <CheckCircle className="w-5 h-5" /> Task Accepted & Scheduled
                                        </div>
                                    )}

                                    {isRejected && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive font-bold py-3 rounded-xl">
                                                <XCircle className="w-5 h-5" /> Task Rejected
                                            </div>
                                            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50 flex items-start gap-2">
                                                <Info className="w-4 h-4 shrink-0 mt-0.5 text-destructive/70" />
                                                <span><strong>Reason:</strong> {task.rejectReason}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <RejectTaskModal
                isOpen={isRejectModalOpen}
                onClose={closeRejectModal}
                onSubmit={handleRejectSubmit}
                actionLoading={actionLoading}
            />
        </div>
    );
};

export default Tasks;