import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Bell, CheckCircle2, AlertCircle, Info, Clock, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";

// Setup socket connection
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const EmployeeNotifications = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // --- FETCH INITIAL DATA ---
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/employee/notifications');
                if (response.data.success) {
                    setNotifications(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
                toast.error(t('employee_notifications.toasts.load_error', 'Failed to load notifications'));
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [t]);

    // --- AUTO-MARK AS READ ON LOAD ---
    useEffect(() => {
        if (notifications.length > 0 && unreadCount > 0) {
            const autoMarkAsRead = async () => {
                try {
                    await api.put('/employee/notifications/mark-read');
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                } catch (error) {
                    console.error("Failed to auto-mark as read:", error);
                }
            };

            autoMarkAsRead();
        }
    }, [notifications.length, unreadCount]);

    // --- REAL-TIME SOCKET LOGIC ---
    useEffect(() => {
        if (!user) return;

        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleNewNotification = (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
        };

        socket.on("new_notification", handleNewNotification);

        return () => {
            socket.off("new_notification", handleNewNotification);
        };
    }, [user]);

    // --- ACTIONS ---
    const markAllAsRead = async () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        const toastId = toast.loading(t('employee_notifications.toasts.marking_read', 'Marking as read...'));
        try {
            await api.put('/employee/notifications/mark-read');
            toast.success(t('employee_notifications.toasts.mark_read_success', 'All marked as read'), { id: toastId });
        } catch (error) {
            console.error("Failed to mark as read:", error);
            toast.error(t('employee_notifications.toasts.mark_read_error', 'Failed to mark as read'), { id: toastId });
        }
    };

    const clearAll = async () => {
        setNotifications([]);
        const toastId = toast.loading(t('employee_notifications.toasts.clearing', 'Clearing notifications...'));
        try {
            await api.delete('/employee/notifications/clear');
            toast.success(t('employee_notifications.toasts.clear_success', 'Notifications cleared'), { id: toastId });
        } catch (error) {
            console.error("Failed to clear notifications:", error);
            toast.error(t('employee_notifications.toasts.clear_error', 'Failed to clear notifications'), { id: toastId });
        }
    };

    // --- HELPERS ---
    const getTimeAgo = (dateString) => {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.years', 'yrs ago');
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.months', 'mos ago');
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.days', 'days ago');
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.hours', 'hrs ago');
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.mins', 'mins ago');
        return t('employee_notifications.time.just_now', 'Just now');
    };

    const getIconInfo = (type) => {
        switch (type) {
            case 'Warning':
            case 'Deletion':
                return { icon: <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />, bg: 'bg-destructive/10 text-destructive border-destructive/20' };
            case 'Assignment':
            case 'Updation':
                return { icon: <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />, bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
            case 'System':
            case 'General':
            default:
                return { icon: <Info className="w-5 h-5 sm:w-6 sm:h-6" />, bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
        }
    };

    // ==========================================
    // RENDER: LOADING STATE (SHIMMER)
    // ==========================================
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 md:space-y-8 mt-2 md:mt-4 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded-2xl" />
                <div className="bg-card rounded-[2.5rem] border border-border/50 h-125 w-full" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24 p-4 sm:p-6 lg:p-8 mt-2 md:mt-0">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-20">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <Bell className="w-7 h-7 text-primary" />
                        </div>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-destructive border-2 border-background"></span>
                            </span>
                        )}
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">{t('employee_notifications.title', 'Notifications')}</h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            {t('employee_notifications.subtitle', 'Your recent alerts')}
                        </p>
                    </div>
                </div>

                {notifications.length > 0 && (
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={markAllAsRead} 
                            disabled={unreadCount === 0} 
                            className="h-11 px-5 rounded-xl font-bold gap-2 text-xs uppercase tracking-widest border-border/80 hover:bg-muted"
                        >
                            <Check className="w-4 h-4" /> <span className="hidden sm:inline">{t('employee_notifications.btn_mark_read', 'Mark Read')}</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={clearAll} 
                            className="h-11 px-5 rounded-xl font-bold gap-2 text-xs uppercase tracking-widest border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">{t('employee_notifications.btn_clear_all', 'Clear All')}</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Content Card */}
            <div className="bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20" />
                
                <div className="p-4 sm:p-6 md:p-8 flex-1 bg-muted/10 flex flex-col gap-4">
                    {notifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
                            <Bell className="w-16 h-16 mb-4 text-muted-foreground" />
                            <h3 className="text-xl font-black uppercase tracking-widest text-foreground mb-1">{t('employee_notifications.empty_title', 'All Caught Up')}</h3>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{t('employee_notifications.empty_desc', 'You have no new notifications')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notification) => {
                                const { icon, bg } = getIconInfo(notification.type);
                                return (
                                    <div
                                        key={notification._id}
                                        className={`relative p-5 sm:p-6 rounded-3xl border transition-all duration-300 group overflow-hidden ${notification.isRead
                                            ? 'bg-card border-border/60 hover:border-primary/30 hover:bg-muted/30 shadow-sm'
                                            : 'bg-primary/5 border-primary/30 shadow-md scale-[1.01]'
                                            }`}
                                    >
                                        {!notification.isRead && (
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                                        )}

                                        <div className="flex gap-4 sm:gap-5 pr-2">
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border ${bg} shadow-inner`}>
                                                {icon}
                                            </div>
                                            
                                            <div className="flex flex-col gap-1.5 min-w-0 w-full">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h4 className={`text-base sm:text-lg font-black truncate ${notification.isRead ? 'text-foreground/90' : 'text-foreground'}`}>
                                                        {notification.title}
                                                    </h4>

                                                    {notification.type === 'Warning' && notification.level && (
                                                        <span className="px-2.5 py-1 text-[10px] uppercase font-black tracking-widest rounded-lg bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                                                            {notification.level}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm font-medium text-muted-foreground leading-relaxed pt-1">
                                                    {notification.type === 'Warning' && notification.reason
                                                        ? `"${notification.reason}"`
                                                        : notification.message}
                                                </p>

                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-80">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {getTimeAgo(notification.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default EmployeeNotifications;