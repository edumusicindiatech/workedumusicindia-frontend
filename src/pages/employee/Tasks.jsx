import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import {
    MapPin, Calendar, Clock, ClipboardList,
    CheckCircle, XCircle, Info, Loader2, Tags,
    CheckCircle2, Sparkles, CheckSquare, School, Trash2 
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

    const handleDeleteTask = async (taskId) => {
        setActionLoading(true);
        const loadingToast = toast.loading(t('tasks.toasts.deleting', 'Removing task...'));

        try {
            await api.delete(`/employee/tasks/${taskId}`);
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
            <div className="max-w-7xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 mt-2 md:mt-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-8 border-b border-border/40">
                    <div className="space-y-3 w-full max-w-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-muted rounded-2xl animate-pulse" />
                            <div className="h-10 w-48 bg-muted rounded-2xl animate-pulse" />
                        </div>
                        <div className="h-5 w-full md:w-80 bg-muted/60 rounded-xl animate-pulse" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-card rounded-[2.5rem] border border-border/50 p-5 sm:p-8 flex flex-col h-87.5 shadow-sm relative animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24 p-4 sm:p-6 lg:p-8 mt-2 md:mt-0">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-20">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <CheckSquare className="w-7 h-7 text-primary" />
                        </div>
                        {pendingCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
                            </span>
                        )}
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">
                                {t('tasks.title')}
                            </h1>
                            {pendingCount > 0 && (
                                <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">
                                    {pendingCount} {t('tasks.pending_label', 'Pending')}
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            {t('tasks.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            {tasks.length === 0 ? (
                <div className="bg-card border-2 border-dashed border-border/60 rounded-[3rem] p-12 sm:p-20 mt-8 text-center flex flex-col items-center relative overflow-hidden group hover:border-primary/30 hover:bg-muted/10 transition-all duration-500">
                    <div className="relative w-24 h-24 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-muted/50 rounded-full flex items-center justify-center border border-border/50 shadow-inner z-10">
                            <CheckCircle2 className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3 tracking-tight uppercase italic">{t('tasks.empty.title')}</h2>
                    <p className="text-muted-foreground font-medium max-w-md text-sm sm:text-base leading-relaxed mb-6">
                        {t('tasks.empty.desc')}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-xl z-10 border border-primary/20 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t('tasks.empty.badge', 'All caught up')}</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {tasks.map((task) => {
                        const isPending = task.status === "pending";
                        const isAccepted = task.status === "accepted";
                        const isRejected = task.status === "rejected";
                        const isResolved = isAccepted || isRejected;

                        return (
                            <div
                                key={task.id || task._id}
                                className={`group relative rounded-[2.5rem] border p-6 sm:p-8 flex flex-col h-full transition-all duration-300 overflow-hidden 
                                    ${isPending ? "bg-card border-primary/40 shadow-xl shadow-primary/5 lg:hover:-translate-y-1 lg:hover:shadow-2xl lg:hover:shadow-primary/10" :
                                    isAccepted ? "bg-emerald-500/5 border-emerald-500/20 shadow-sm opacity-95" :
                                    "bg-card/40 border-border opacity-80 shadow-none hover:opacity-100"
                                }`}
                            >
                                {/* Accent Lines */}
                                {isPending && <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20" />}
                                {isAccepted && <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-500/40 via-emerald-500 to-emerald-500/40 z-20" />}

                                {/* Card Header */}
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-5 mb-6">
                                    <div className="flex-1 min-w-0 flex items-start gap-4 sm:gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-transform group-hover:scale-105 ${isPending ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border/50 text-muted-foreground'}`}>
                                            <School className="w-6 h-6" />
                                        </div>

                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <h2 className={`text-xl sm:text-2xl font-black leading-tight truncate tracking-tight ${isResolved ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary transition-colors'}`}>
                                                {task.schoolName}
                                            </h2>
                                            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mt-1.5 truncate">
                                                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                                                <span className="truncate">{task.location}</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <span className={`self-start sm:self-auto text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest shrink-0 flex items-center gap-1.5 border shadow-sm ${isPending ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-muted text-muted-foreground border-border/60'}`}>
                                        <Tags className="w-3 h-3" /> {task.category}
                                    </span>
                                </div>

                                {/* Scheduling Info */}
                                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-5 rounded-3xl border ${isResolved ? 'bg-muted/10 border-border/30' : 'bg-muted/20 border-border/50'}`}>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                            <Calendar className="w-4 h-4 text-primary/70" /> {t('tasks.card.days')}
                                        </div>
                                        <div className={`flex items-center flex-wrap gap-2 ${isResolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            <span className="font-extrabold text-sm sm:text-base">{task.daysAllotted.join(", ")}</span>
                                            <span className="text-xs font-bold bg-background border border-border/60 px-2.5 py-0.5 rounded-lg shadow-sm">
                                                {task.duration}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2.5 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border/50 sm:pl-5">
                                        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                            <Clock className="w-4 h-4 text-amber-500" /> {t('tasks.card.timing')}
                                        </div>
                                        <p className={`font-extrabold text-sm sm:text-base ${isResolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            {convertTo12HourFormat(task.timing)}
                                        </p>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="mb-8 flex-1">
                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${isResolved ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        <ClipboardList className={`w-3.5 h-3.5 ${isResolved ? 'text-muted-foreground' : 'text-primary'}`} />
                                        {t('tasks.card.instructions')}
                                    </div>
                                    <p className={`text-sm sm:text-base font-medium leading-relaxed rounded-3xl p-5 shadow-inner ${isResolved ? 'text-muted-foreground/80 bg-transparent p-0 shadow-none' : 'text-muted-foreground bg-muted/20 border border-border/60'}`}>
                                        {task.taskDescription}
                                    </p>
                                </div>

                                {/* Action Buttons & Status */}
                                <div className="pt-6 border-t border-border/50 mt-auto shrink-0">
                                    {isPending && (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            <Button
                                                onClick={() => openRejectModal(task.id || task._id)}
                                                disabled={actionLoading}
                                                variant="outline"
                                                className="w-full sm:w-auto sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-wider text-destructive border-border/60 hover:bg-destructive hover:text-white hover:border-destructive transition-all shadow-sm active:scale-[0.98]"
                                            >
                                                <XCircle className="w-5 h-5 mr-2" /> {t('tasks.card.btn_reject', 'Reject')}
                                            </Button>
                                            <Button
                                                onClick={() => handleAccept(task.id || task._id)}
                                                disabled={actionLoading}
                                                className="w-full sm:w-auto sm:flex-2 h-14 rounded-2xl font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                                            >
                                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5 mr-2" /> {t('tasks.card.btn_accept', 'Accept Task')}</>}
                                            </Button>
                                        </div>
                                    )}

                                    {/* --- RESOLVED STATES (Accepted/Rejected) + DELETE BUTTON --- */}
                                    {isResolved && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10 p-2 sm:p-3 rounded-3xl border border-border/40">
                                            {isAccepted ? (
                                                <div className="flex flex-col w-full sm:w-auto flex-1">
                                                    <div className="flex items-center justify-center sm:justify-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-[10px] sm:text-xs py-3 px-5 rounded-2xl shadow-sm">
                                                        <CheckCircle2 className="w-4 h-4" /> {t('tasks.card.status_accepted', 'Task Accepted')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col w-full sm:w-auto space-y-3 flex-1">
                                                    <div className="flex items-center justify-center sm:justify-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive font-black uppercase tracking-widest text-[10px] sm:text-xs py-3 px-5 rounded-2xl">
                                                        <XCircle className="w-4 h-4" /> {t('tasks.card.status_rejected', 'Task Rejected')}
                                                    </div>
                                                    {task.rejectReason && (
                                                        <div className="text-xs text-destructive/80 bg-destructive/5 p-4 rounded-2xl border border-destructive/10 flex items-start gap-2.5 font-medium">
                                                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                            <span className="leading-relaxed font-bold italic">"{task.rejectReason}"</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleDeleteTask(task.id || task._id)}
                                                disabled={actionLoading}
                                                className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all shrink-0 border-border/60"
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