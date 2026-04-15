import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import {
    Users, UserCheck, UserX, Clock, MapPin, School,
    BookOpen, RefreshCw, Activity, CalendarOff, CheckCircle, XCircle
} from "lucide-react";
import { io } from "socket.io-client";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

const AdminDashboard = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // --- NEW: Real-Time Presence State ---
    const [onlineUsers, setOnlineUsers] = useState({});
    const timeoutsRef = useRef({});

    const fetchDashboardStats = useCallback(async (showFullLoader = true) => {
        if (showFullLoader) setLoading(true);
        setIsRefreshing(true);

        try {
            const response = await api.get('/admin/dashboard-stats');
            if (response.data.success) {
                setDashboardData(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            if (showFullLoader) setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardStats(true);
        const interval = setInterval(() => fetchDashboardStats(false), 60000);

        const socket = io(import.meta.env.VITE_BASE_URL || 'http://localhost:5000');

        if (user && (user.id || user._id)) {
            socket.emit("join_room", user.id || user._id);
        }
        
        // --- NEW: Join admin tracking room to receive live pings ---
        socket.emit("join_admin_room");

        socket.on('new_notification', (data) => {
            fetchDashboardStats(false);
        });

        // --- NEW: Real-Time Presence Listener ---
        const handleLocationUpdate = (data) => {
            const empId = data.employeeId;
            if (!empId) return;

            setOnlineUsers((prev) => ({ ...prev, [empId]: true }));

            if (timeoutsRef.current[empId]) {
                clearTimeout(timeoutsRef.current[empId]);
            }

            timeoutsRef.current[empId] = setTimeout(() => {
                setOnlineUsers((prev) => ({ ...prev, [empId]: false }));
            }, 15000);
        };

        socket.on("employee_location_changed", handleLocationUpdate);

        return () => {
            clearInterval(interval);
            socket.off('new_notification');
            socket.off("employee_location_changed", handleLocationUpdate);
            socket.disconnect();
            
            // Cleanup all active timeouts
            Object.values(timeoutsRef.current).forEach(clearTimeout);
        };
    }, [fetchDashboardStats, user]);

    const statusBadgeStyle = (status) => {
        const styles = {
            present: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            absent: "bg-rose-500/10 text-rose-600 border-rose-500/20",
            warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
            event: "bg-violet-500/10 text-violet-600 border-violet-500/20",
            Present: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            Late: "bg-amber-500/10 text-amber-600 border-amber-500/20",
            Approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            Rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20",
            Leave: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
        };
        return styles[status] || styles[status?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    };

    if (loading && !dashboardData) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
                        <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse flex flex-col justify-between p-5">
                            <div className="flex justify-between items-center"><div className="w-20 h-3 bg-muted rounded-full" /><div className="w-8 h-8 rounded-xl bg-muted" /></div>
                            <div className="w-16 h-8 bg-muted rounded-lg" />
                        </div>
                    ))}
                </div>
                <div className="h-96 bg-card border border-border rounded-2xl animate-pulse" />
            </div>
        );
    }

    const stats = [
        { label: t('admin_dashboard.stats.total_staff'), value: dashboardData?.stats?.totalEmployees || 0, icon: Users, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
        { label: t('admin_dashboard.stats.on_site'), value: dashboardData?.stats?.presentToday || 0, icon: UserCheck, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
        { label: t('admin_dashboard.stats.no_show'), value: dashboardData?.stats?.noShow || 0, icon: UserX, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
        { label: t('admin_dashboard.stats.on_leave'), value: dashboardData?.stats?.onLeaveToday || 0, icon: CalendarOff, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
        { label: t('admin_dashboard.stats.pending'), value: dashboardData?.stats?.pending || 0, icon: Clock, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    ];

    return (
        <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">

            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {t('admin_dashboard.title')}
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">{t('admin_dashboard.subtitle')}</p>
                </div>
                <button
                    onClick={() => fetchDashboardStats(false)}
                    className="p-2.5 bg-card border border-border hover:bg-muted rounded-full transition-all group shadow-sm active:scale-95"
                    title={t('admin_dashboard.refresh_data')}
                >
                    <RefreshCw className={`w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-5 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="group bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden relative">
                        <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color} transition-transform group-hover:scale-110`}>
                                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <p className="text-3xl sm:text-4xl font-black text-foreground relative z-10 tracking-tight">{stat.value}</p>
                        <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${stat.color.split(' ')[0]}`} />
                    </div>
                ))}
            </div>

            {/* --- RECENT ACTIVITY --- */}
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col">
                <div className="p-5 sm:p-6 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="text-base sm:text-lg font-bold text-foreground">{t('admin_dashboard.activity_log')}</h2>
                </div>

                <div className="flex flex-col">
                    {dashboardData?.recentActivity?.length > 0 ? (
                        dashboardData.recentActivity.slice(0, 5).map((item, i) => {
                            // Fetch correct ID to check online status safely from the activity object
                            const empId = item.teacherId || item.employeeId || item.teacher?._id || item.id;
                            const isOnline = onlineUsers[empId];

                            return (
                                <div
                                    key={item.id || i}
                                    className="group flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-6 border-b border-border/40 last:border-0 hover:bg-muted/40 transition-all gap-4 sm:gap-6"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 lg:w-72 shrink-0">
                                        {/* 🔥 UPGRADED: Added Online Indicator Wrapper */}
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner transition-all duration-300">
                                                {item?.profilePicture ? (
                                                    <img
                                                        src={item.profilePicture}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-primary text-sm sm:text-base font-bold group-hover:scale-110 transition-transform">
                                                        {item?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <div 
                                                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 sm:border-[2.5px] border-card transition-colors duration-500 ${isOnline ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "bg-slate-400"}`} 
                                                title={isOnline ? "Online" : "Offline"}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">{item?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5 truncate">
                                                <MapPin className="w-3 h-3 shrink-0" /> {item?.zone || t('admin_dashboard.unassigned_zone')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-row items-center gap-2 sm:gap-3 flex-1 min-w-0 bg-muted/30 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border border-border/50 lg:border-none">
                                        <div className="flex items-center gap-2 min-w-0 flex-1 bg-background lg:bg-muted/50 py-1.5 px-3 rounded-lg border border-border/50 lg:border-border">
                                            {item.status === 'Approved' || item.status === 'Rejected' ? (
                                                <CalendarOff className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                            ) : (
                                                <School className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                            )}
                                            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{item?.school || item?.leaveRange || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0 flex-1 bg-background lg:bg-muted/50 py-1.5 px-3 rounded-lg border border-border/50 lg:border-border">
                                            <BookOpen className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{item?.category || t('admin_dashboard.field_operation')}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 shrink-0 lg:w-48 border-t border-border/40 lg:border-none pt-3 lg:pt-0 mt-1 lg:mt-0">
                                        <div className="flex items-center gap-2">
                                            {item.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 hidden lg:block" />}
                                            {item.status === 'Rejected' && <XCircle className="w-3.5 h-3.5 text-rose-500 hidden lg:block" />}
                                            <span className={`px-3 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-widest border ${statusBadgeStyle(item?.status)}`}>
                                                {item?.action ? t(`admin_dashboard.status.${item.action.toLowerCase()}`, item.action)
                                                    : item?.status ? t(`admin_dashboard.status.${item.status.toLowerCase()}`, item.status)
                                                        : t('admin_dashboard.status.update')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold text-foreground">{item?.checkInTime || item?.time || t('admin_dashboard.just_now')}</span>
                                            {item?.timeAgo && <span className="text-[10px] font-medium opacity-70">• {item.timeAgo}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-16 sm:p-24 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50">
                                <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-foreground font-bold text-lg sm:text-xl mb-1">{t('admin_dashboard.empty_title')}</h3>
                            <p className="text-muted-foreground text-sm font-medium">{t('admin_dashboard.empty_subtitle')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;