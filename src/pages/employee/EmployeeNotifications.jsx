import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Bell, CheckCircle2, AlertCircle, Info, Clock, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next"; // <-- Added import

// Setup socket connection
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const EmployeeNotifications = () => {
    const { t } = useTranslation(); // <-- Initialize hook
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
                toast.error(t('employee_notifications.toasts.load_error'));
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
        const toastId = toast.loading(t('employee_notifications.toasts.marking_read'));
        try {
            await api.put('/employee/notifications/mark-read');
            toast.success(t('employee_notifications.toasts.mark_read_success'), { id: toastId });
        } catch (error) {
            console.error("Failed to mark as read:", error);
            toast.error(t('employee_notifications.toasts.mark_read_error'), { id: toastId });
        }
    };

    const clearAll = async () => {
        setNotifications([]);
        const toastId = toast.loading(t('employee_notifications.toasts.clearing'));
        try {
            await api.delete('/employee/notifications/clear');
            toast.success(t('employee_notifications.toasts.clear_success'), { id: toastId });
        } catch (error) {
            console.error("Failed to clear notifications:", error);
            toast.error(t('employee_notifications.toasts.clear_error'), { id: toastId });
        }
    };

    // --- HELPERS ---
    const getTimeAgo = (dateString) => {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.years');
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.months');
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.days');
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.hours');
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " " + t('employee_notifications.time.mins');
        return t('employee_notifications.time.just_now');
    };

    const getIconInfo = (type) => {
        switch (type) {
            case 'Warning':
            case 'Deletion':
                return { icon: <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />, bg: 'bg-destructive/10 text-destructive border-destructive/20' };
            case 'Assignment':
            case 'Updation':
                return { icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />, bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
            case 'System':
            case 'General':
            default:
                return { icon: <Info className="w-4 h-4 sm:w-5 sm:h-5" />, bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
        }
    };

    // ==========================================
    // RENDER: LOADING STATE (SHIMMER)
    // ==========================================
    if (loading) {
        return (
            <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-in fade-in duration-300 pb-24 md:pb-8">
                {/* Header Shimmer */}
                <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-muted animate-pulse shrink-0" />
                            <div className="h-8 sm:h-10 w-48 sm:w-64 bg-muted rounded-lg animate-pulse" />
                        </div>
                        <div className="h-4 sm:h-5 w-64 sm:w-80 bg-muted/60 rounded-md animate-pulse mt-1" />
                    </div>
                    {/* Buttons Shimmer */}
                    <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
                        <div className="h-8 sm:h-9 w-28 sm:w-32 bg-muted rounded-md animate-pulse" />
                        <div className="h-8 sm:h-9 w-24 sm:w-28 bg-muted rounded-md animate-pulse" />
                    </div>
                </div>

                {/* Notifications Card Shimmer */}
                <div className="bg-card rounded-xl sm:rounded-2xl shadow-card border border-border min-h-100 sm:min-h-125 overflow-hidden flex flex-col">
                    <div className="p-3 sm:p-4 md:p-6 flex-1 bg-muted/5 flex flex-col gap-2.5 sm:gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="relative p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-border bg-card/50">
                                <div className="flex gap-3 sm:gap-4 pr-4 sm:pr-6">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted animate-pulse shrink-0" />
                                    <div className="flex flex-col gap-2 w-full mt-1">
                                        <div className="h-5 w-1/3 sm:w-1/4 bg-muted rounded animate-pulse" />
                                        <div className="h-4 w-3/4 sm:w-2/3 bg-muted/60 rounded animate-pulse" />
                                        <div className="h-3 w-16 sm:w-20 bg-muted/40 rounded mt-1 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-in fade-in duration-300 pb-24 md:pb-8">
            <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-destructive border-2 border-card"></span>
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">{t('employee_notifications.title')}</h1>
                    </div>
                    <p className="text-muted-foreground text-xs sm:text-sm">{t('employee_notifications.subtitle')}</p>
                </div>

                {notifications.length > 0 && (
                    <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0} className="gap-1.5 sm:gap-2 flex-1 md:flex-none text-xs sm:text-sm h-8 sm:h-9">
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('employee_notifications.btn_mark_read')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 sm:gap-2 flex-1 md:flex-none text-xs sm:text-sm h-8 sm:h-9">
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('employee_notifications.btn_clear_all')}
                        </Button>
                    </div>
                )}
            </div>

            <div className="bg-card rounded-xl sm:rounded-2xl shadow-card border border-border min-h-100 sm:min-h-125 overflow-hidden flex flex-col">
                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-muted/5 flex flex-col gap-2.5 sm:gap-3">
                    {notifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3 sm:mb-4">
                                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">{t('employee_notifications.empty_title')}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">{t('employee_notifications.empty_desc')}</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const { icon, bg } = getIconInfo(notification.type);
                            return (
                                <div
                                    key={notification._id}
                                    className={`relative p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border transition-all ${notification.isRead
                                        ? 'bg-card border-border hover:bg-muted/30'
                                        : 'bg-primary/5 border-primary/20 shadow-sm'
                                        }`}
                                >
                                    {!notification.isRead && (
                                        <div className="absolute top-3 right-3 sm:top-5 sm:right-5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)] animate-pulse" />
                                    )}
                                    <div className="flex gap-3 sm:gap-4 pr-4 sm:pr-6">
                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border ${bg}`}>
                                            {icon}
                                        </div>
                                        <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 w-full">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-sm sm:text-base font-bold truncate ${notification.isRead ? 'text-foreground/90' : 'text-foreground'}`}>
                                                    {notification.title}
                                                </h4>

                                                {notification.type === 'Warning' && notification.level && (
                                                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                                                        {notification.level}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                {notification.type === 'Warning' && notification.reason
                                                    ? notification.reason
                                                    : notification.message}
                                            </p>

                                            <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium text-muted-foreground/80">
                                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                {getTimeAgo(notification.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeNotifications;