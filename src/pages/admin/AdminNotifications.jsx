import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, AlertCircle, Info, Clock, Check, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "../../api/axios"; // Your axios instance
import { io } from "socket.io-client";

// Setup socket connection (Adjust URL if needed)
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // --- FETCH INITIAL DATA ---
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/admin/notifications');
                if (response.data.success) {
                    setNotifications(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    // --- REAL-TIME SOCKET LOGIC ---
    useEffect(() => {
        // Replace with actual admin user ID from your auth context
        const currentUserId = "REPLACE_WITH_ACTUAL_USER_ID";

        // Join a personal room to receive targeted alerts
        socket.emit("join_room", currentUserId);

        const handleNewNotification = (newNotif) => {
            // Play Ting Sound
            const audio = new Audio('/sounds/notification-ting.mp3');
            audio.play().catch(err => console.log("Audio play blocked by browser policy:", err));

            // Add new notification to the top of the list
            setNotifications(prev => [newNotif, ...prev]);
        };

        socket.on("new_notification", handleNewNotification);

        return () => {
            socket.off("new_notification", handleNewNotification);
        };
    }, []);

    // --- ACTIONS ---
    const markAllAsRead = async () => {
        // Optimistic UI update
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        try {
            await api.put('/admin/notifications/mark-read');
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const clearAll = async () => {
        setNotifications([]);
        try {
            await api.delete('/admin/notifications/clear');
        } catch (error) {
            console.error("Failed to clear notifications:", error);
        }
    };

    // --- HELPERS ---
    const getTimeAgo = (dateString) => {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " yrs ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " mos ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hrs ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return "Just now";
    };

    // Map your DB Enum Types to visual styles
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

    if (loading) {
        return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading notifications...</div>;
    }

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
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-card border border-border min-h-100 sm:min-h-125 overflow-hidden flex flex-col">
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
                                        <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                                            <h4 className={`text-sm sm:text-base font-bold truncate ${notification.isRead ? 'text-foreground/90' : 'text-foreground'}`}>
                                                {notification.title}
                                            </h4>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium text-muted-foreground/80">
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

export default AdminNotifications;