import { useState } from "react";
import {
    Bell, Megaphone, School, ClipboardList,
    AlertTriangle, CheckCircle2, Trash2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

const EmployeeNotifications = () => {
    // Mock Data: Real-time notifications from Admin
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            type: "broadcast", // broadcast | assignment | warning
            title: "Admin Announcement: System Maintenance",
            message: "The application will undergo scheduled maintenance tonight at 11:00 PM. Please ensure all your daily reports are submitted before then.",
            timestamp: "10 mins ago",
            isUnread: true,
        },
        {
            id: 2,
            type: "assignment",
            title: "New School Assigned",
            message: "You have been assigned a new routine visit to 'Lincoln High School' starting tomorrow.",
            timestamp: "2 hours ago",
            isUnread: true,
        },
        {
            id: 3,
            type: "warning",
            title: "Missed Check-Out",
            message: "You forgot to check out of 'Washington Middle School' yesterday. Please update your timesheet manually.",
            timestamp: "1 day ago",
            isUnread: false,
        },
        {
            id: 4,
            type: "assignment",
            title: "New Task Available",
            message: "A new optional task for 'Science Lab Inventory' has been posted. Review it in the Tasks section.",
            timestamp: "2 days ago",
            isUnread: false,
        }
    ]);

    const unreadCount = notifications.filter(n => n.isUnread).length;

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const getIconForType = (type) => {
        switch (type) {
            case "broadcast":
                return <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-500 shrink-0"><Megaphone className="w-5 h-5" /></div>;
            case "assignment":
                return <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500 shrink-0"><School className="w-5 h-5" /></div>;
            case "warning":
                return <div className="p-2.5 rounded-full bg-destructive/10 text-destructive shrink-0"><AlertTriangle className="w-5 h-5" /></div>;
            default:
                return <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0"><Bell className="w-5 h-5" /></div>;
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-4xl mx-auto pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="bg-destructive/10 text-destructive text-sm px-3 py-1 rounded-full font-bold tracking-wide mt-1">
                                {unreadCount} Unread
                            </span>
                        )}
                    </h1>
                    <p className="text-muted-foreground mt-1">Stay updated with administrative broadcasts and alerts.</p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead} className="h-10 rounded-xl gap-2 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Mark all read
                        </Button>
                    )}
                    {notifications.length > 0 && (
                        <Button variant="ghost" onClick={clearAll} className="h-10 rounded-xl gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" /> Clear All
                        </Button>
                    )}
                </div>
            </div>

            {/* Notification Feed */}
            {notifications.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-5">
                        <Bell className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No notifications yet</h3>
                    <p className="text-muted-foreground max-w-sm">When the admin assigns you a school, posts a task, or makes an announcement, it will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`group relative flex gap-4 p-5 rounded-2xl border transition-all duration-300 ${notification.isUnread
                                ? "bg-card border-primary/20 shadow-sm"
                                : "bg-muted/10 border-transparent hover:bg-muted/30"
                                }`}
                        >
                            {/* Unread Indicator Dot */}
                            {notification.isUnread && (
                                <div className="absolute top-6 right-6 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                            )}

                            {/* Icon */}
                            {getIconForType(notification.type)}

                            {/* Content */}
                            <div className="flex-1 pr-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                    <h3 className={`font-bold text-base ${notification.isUnread ? 'text-foreground' : 'text-foreground/80'}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5" /> {notification.timestamp}
                                    </span>
                                </div>
                                <p className={`text-sm leading-relaxed ${notification.isUnread ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                                    {notification.message}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeeNotifications;