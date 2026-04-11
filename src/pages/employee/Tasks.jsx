import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import {
    MapPin, Calendar, Clock, ClipboardList,
    CheckCircle, XCircle, Info, Loader2, Tags,
    CheckCircle2, Sparkles, CheckSquare, School, Trash2 // Added Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import RejectTaskModal from "../../modals/employee/RejectTaskModal";
import { useTranslation } from "react-i18next";

import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// Helper function to convert 24h format to 12h format
const convertTo12HourFormat = (timeStr) => {
    if (!timeStr) return '';
    const times = timeStr.split('-').map(t => t.trim());
    return times.map(t => {
        const [hourStr, minuteStr] = t.split(':');
        if (!hourStr || !minuteStr) return t;
        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;
        return `${hour}:${minuteStr} ${ampm}`;
    }).join(' - ');
};

const Tasks = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    const pendingCount = tasks.filter(task => task.status === "pending").length;

    const fetchTasks = useCallback(async () => {
        try {
            const res = await api.get('/employee/tasks');
            if (res.data.success) {
                setTasks(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            toast.error(t('tasks.toasts.load_error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;

        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = () => {
            fetchTasks();
        };

        socket.on("new_notification", handleRealTimeUpdate);

        return () => {
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [fetchTasks, user]);

    const handleResponse = async (taskId, status, reason = null) => {
        setActionLoading(true);
        const loadingToast = toast.loading(status === 'Accepted' ? t('tasks.toasts.accepting') : t('tasks.toasts.rejecting'));

        try {
            await api.put(`/employee/tasks/${taskId}/respond`, {
                status: status,
                rejectReason: reason
            });

            setTasks(prevTasks => prevTasks.map(task =>
                task.id === taskId ? { ...task, status: status.toLowerCase(), rejectReason: reason } : task
            ));

            if (status === 'Accepted') {
                toast.success(t('tasks.toasts.accept_success'), { id: loadingToast });
            } else {
                toast.success(t('tasks.toasts.reject_success'), { id: loadingToast });
            }

            closeRejectModal();
        } catch (error) {
            toast.error(error.response?.data?.message || t('tasks.toasts.respond_error'), { id: loadingToast });
        } finally {
            setActionLoading(false);
        }
    };

    // --- NEW: Handle deleting a resolved task ---
    const handleDeleteTask = async (taskId) => {
        setActionLoading(true);
        const loadingToast = toast.loading(t('tasks.toasts.deleting', 'Removing task...'));

        try {
            await api.delete(`/employee/tasks/${taskId}`);

            // Remove from local state
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId && task._id !== taskId));

            toast.success(t('tasks.toasts.delete_success', 'Task removed'), { id: loadingToast });
        } catch (error) {
            toast.error(error.response?.data?.message || t('tasks.toasts.delete_error', 'Failed to remove task'), { id: loadingToast });
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
            <div className="max-w-7xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-border/40">
                    <div className="space-y-3 w-full max-w-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
                            <div className="h-6 w-24 bg-muted/60 rounded-full animate-pulse" />
                        </div>
                        <div className="h-5 w-full md:w-80 bg-muted/60 rounded-md animate-pulse" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-card rounded-3xl border border-border/60 p-5 sm:p-7 flex flex-col h-75 overflow-hidden shadow-sm relative animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b border-border/40">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                            {t('tasks.title')}
                        </h1>
                        {pendingCount > 0 && (
                            <span className="flex items-center justify-center bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm px-3.5 py-1.5 rounded-full font-bold tracking-wide uppercase shadow-sm">
                                <span className="relative flex h-2 w-2 mr-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                {pendingCount} {t('tasks.pending_label')}
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70" />
                        {t('tasks.subtitle')}
                    </p>
                </div>
            </div>

            {/* Content Section */}
            {tasks.length === 0 ? (
                <div className="bg-card border border-border rounded-4xl p-8 sm:p-12 lg:p-16 mt-8 shadow-sm text-center flex flex-col items-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-muted dark:bg-muted/30 rounded-full flex items-center justify-center border-4 border-white dark:border-card shadow-sm z-10 transition-transform group-hover:scale-105">
                            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-3 tracking-tight">{t('tasks.empty.title')}</h2>
                    <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base lg:text-lg leading-relaxed px-4">
                        {t('tasks.empty.desc')}
                    </p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary bg-primary/10 px-5 py-2.5 rounded-full z-10 border border-primary/20 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>{t('tasks.empty.badge')}</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-8">
                    {tasks.map((task) => {
                        const isPending = task.status === "pending";
                        const isAccepted = task.status === "accepted";
                        const isRejected = task.status === "rejected";
                        const isResolved = isAccepted || isRejected;

                        return (
                            <div
                                key={task.id || task._id}
                                className={`group relative rounded-3xl border p-5 sm:p-6 lg:p-8 flex flex-col h-full transition-all duration-300 overflow-hidden ${isPending ? "bg-card border-primary/30 shadow-lg hover:shadow-xl hover:border-primary/60 lg:hover:-translate-y-1" :
                                        isAccepted ? "bg-emerald-500/5 border-emerald-500/20 shadow-sm opacity-90" :
                                            "bg-card/40 border-border opacity-80 shadow-none hover:opacity-100"
                                    }`}
                            >
                                {isPending && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 sm:w-40 h-1.5 bg-primary rounded-b-full shadow-[0_0_15px_rgba(var(--primary),0.8)]" />}
                                {isAccepted && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 sm:w-40 h-1 bg-emerald-500 rounded-b-full" />}

                                {/* Card Header */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex-1 min-w-0 flex items-start gap-4">
                                        <div className={`p-3 sm:p-4 rounded-2xl shrink-0 mt-0.5 ${isPending ? 'bg-primary/10 dark:bg-primary/20' : 'bg-muted'}`}>
                                            <School className={`w-6 h-6 sm:w-7 sm:h-7 ${isPending ? 'text-primary' : 'text-muted-foreground'}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h2 className={`text-xl sm:text-2xl font-bold leading-tight pb-1 wrap-break-word ${isResolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                {task.schoolName}
                                            </h2>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <p className="flex items-center gap-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed truncate">
                                                    <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                                                    <span className="truncate">{task.location}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`self-start sm:self-auto text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1.5 border shadow-sm ${isPending ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                        <Tags className="w-3 h-3" /> {task.category}
                                    </span>
                                </div>

                                {/* Scheduling Info */}
                                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 sm:p-5 rounded-2xl border ${isResolved ? 'bg-muted/10 border-border/30' : 'bg-muted/40 dark:bg-muted/20 border-border/50'}`}>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                            <Calendar className="w-4 h-4 text-primary/70" /> {t('tasks.card.days')}
                                        </div>
                                        <p className={`text-sm sm:text-base font-bold flex items-center flex-wrap gap-2 ${isResolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            <span>{task.daysAllotted.join(", ")}</span>
                                            <span className="text-muted-foreground font-medium text-xs bg-background border border-border/50 px-2.5 py-0.5 rounded-full shadow-sm">
                                                {task.duration}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border/60 sm:pl-4">
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                            <Clock className="w-4 h-4 text-amber-500" /> {t('tasks.card.timing')}
                                        </div>
                                        <p className={`text-sm sm:text-base font-bold ${isResolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            {convertTo12HourFormat(task.timing)}
                                        </p>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="mb-6 flex-1">
                                    <div className={`flex items-center gap-2 font-bold mb-2.5 ${isResolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        <ClipboardList className={`w-4 h-4 ${isResolved ? 'text-muted-foreground' : 'text-primary'}`} />
                                        {t('tasks.card.instructions')}
                                    </div>
                                    <p className={`text-sm sm:text-base leading-relaxed rounded-xl p-4 sm:p-5 ${isResolved ? 'text-muted-foreground/80 bg-transparent p-0' : 'text-muted-foreground bg-card border border-border/50'}`}>
                                        {task.taskDescription}
                                    </p>
                                </div>

                                {/* Action Buttons & Status */}
                                <div className="pt-5 border-t border-border/60 mt-auto">
                                    {isPending && (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            <Button
                                                onClick={() => openRejectModal(task.id || task._id)}
                                                disabled={actionLoading}
                                                variant="outline"
                                                className="w-full sm:w-auto sm:flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive hover:text-destructive font-bold h-12 sm:h-14 rounded-xl transition-all"
                                            >
                                                <XCircle className="w-5 h-5 mr-2" /> {t('tasks.card.btn_reject')}
                                            </Button>
                                            <Button
                                                onClick={() => handleAccept(task.id || task._id)}
                                                disabled={actionLoading}
                                                className="w-full sm:w-auto sm:flex-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 sm:h-14 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                                            >
                                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5 mr-2" /> {t('tasks.card.btn_accept')}</>}
                                            </Button>
                                        </div>
                                    )}

                                    {/* --- RESOLVED STATES (Accepted/Rejected) + DELETE BUTTON --- */}
                                    {isResolved && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                            {isAccepted ? (
                                                <div className="flex flex-col w-full sm:w-auto">
                                                    <div className="flex items-center justify-center sm:justify-start gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold py-2 sm:py-3 px-4 rounded-xl shadow-sm transition-all hover:bg-emerald-500/15">
                                                        <CheckCircle2 className="w-5 h-5" /> {t('tasks.card.status_accepted', 'Task Accepted')}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2 text-center sm:text-left flex items-center justify-center sm:justify-start gap-1">
                                                        <Info className="w-3.5 h-3.5" /> {t('tasks.card.info_allocated', 'This school has been added to your Active Assignments.')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col w-full sm:w-auto space-y-3">
                                                    <div className="flex items-center justify-center sm:justify-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive font-bold py-2 sm:py-3 px-4 rounded-xl transition-all hover:bg-destructive/15">
                                                        <XCircle className="w-5 h-5" /> {t('tasks.card.status_rejected')}
                                                    </div>
                                                    {task.rejectReason && (
                                                        <div className="text-xs sm:text-sm text-destructive/80 bg-destructive/5 dark:bg-destructive/10 p-3 rounded-xl border border-destructive/10 flex items-start gap-2">
                                                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                            <span className="leading-relaxed"><strong>{t('tasks.card.reason_label')}</strong> {task.rejectReason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleDeleteTask(task.id || task._id)}
                                                disabled={actionLoading}
                                                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all shrink-0 mt-2 sm:mt-0"
                                                title={t('tasks.card.btn_delete', 'Remove from feed')}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
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