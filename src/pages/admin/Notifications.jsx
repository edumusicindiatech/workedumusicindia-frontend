import { useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Info, Clock, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- MOCK NOTIFICATIONS DATA ---
const initialNotifications = [
    {
        id: 1,
        type: "alert",
        title: "Late Attendance Alert",
        message: "Sarah Johnson checked in late at Washington Elementary.",
        time: "10 mins ago",
        read: false,
    },
    {
        id: 2,
        type: "success",
        title: "Task Completed",
        message: "Michael Chen completed the Emergency Equipment Audit.",
        time: "1 hour ago",
        read: false,
    },
    {
        id: 3,
        type: "info",
        title: "New Media Uploaded",
        message: "Emma Davis uploaded 3 new videos from the Science Fair.",
        time: "3 hours ago",
        read: true,
    },
    {
        id: 4,
        type: "alert",
        title: "Teacher Absent",
        message: "David Miller has marked himself absent for today.",
        time: "5 hours ago",
        read: true,
    }
];

const Notifications = () => {
    const [notifications, setNotifications] = useState(initialNotifications);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const getIconInfo = (type) => {
        switch (type) {
            case 'alert':
                return { icon: <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />, bg: 'bg-warning/10 text-warning border-warning/20' };
            case 'success':
                return { icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />, bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
            case 'info':
            default:
                return { icon: <Info className="w-4 h-4 sm:w-5 sm:h-5" />, bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
        }
    };

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-in fade-in duration-300 pb-24 md:pb-8">

            {/* --- HEADER --- */}
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
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">Notifications</h1>
                    </div>
                    <p className="text-muted-foreground text-xs sm:text-sm">Stay updated on alerts, messages, and workforce activity.</p>
                </div>

                {notifications.length > 0 && (
                    <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0} className="gap-1.5 sm:gap-2 flex-1 md:flex-none text-xs sm:text-sm h-8 sm:h-9">
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Mark all read
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 sm:gap-2 flex-1 md:flex-none text-xs sm:text-sm h-8 sm:h-9">
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Clear All
                        </Button>
                    </div>
                )}
            </div>

            {/* --- NOTIFICATIONS LIST --- */}
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-card border border-border min-h-[400px] sm:min-h-[500px] overflow-hidden flex flex-col">
                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-muted/5 flex flex-col gap-2.5 sm:gap-3">

                    {notifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3 sm:mb-4">
                                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">All caught up!</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">You don't have any new notifications at the moment.</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const { icon, bg } = getIconInfo(notification.type);

                            return (
                                <div
                                    key={notification.id}
                                    className={`relative p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border transition-all ${notification.read
                                        ? 'bg-card border-border hover:bg-muted/30'
                                        : 'bg-primary/5 border-primary/20 shadow-sm'
                                        }`}
                                >
                                    {!notification.read && (
                                        <div className="absolute top-3 right-3 sm:top-5 sm:right-5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                    )}

                                    <div className="flex gap-3 sm:gap-4 pr-4 sm:pr-6">
                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border ${bg}`}>
                                            {icon}
                                        </div>
                                        <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                                            <h4 className={`text-sm sm:text-base font-bold truncate ${notification.read ? 'text-foreground/90' : 'text-foreground'}`}>
                                                {notification.title}
                                            </h4>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium text-muted-foreground/80">
                                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                {notification.time}
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

export default Notifications;