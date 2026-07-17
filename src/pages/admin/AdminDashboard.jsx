import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import {
    Users, UserCheck, UserX, Clock, MapPin, School,
    BookOpen, RefreshCw, Activity, CalendarOff, CheckCircle, XCircle, Coffee
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

    // --- NEW: Modal State for Interactive Stat Cards ---
    const [modalData, setModalData] = useState({ isOpen: false, title: '', list: [], color: '', icon: null });

    const [onlineUsers, setOnlineUsers] = useState({});
    const timeoutsRef = useRef({});

    const fetchDashboardStats = useCallback(async (showFullLoader = true) => {
        if (showFullLoader) setLoading(true);
        setIsRefreshing(true);

        try {
            const response = await api.get('/admin/dashboard-stats');
            if (response.data.success) {
                setDashboardData(response.data.data);
                // Update open modal data automatically on refresh
                setModalData(prev => prev.isOpen ? { ...prev, list: response.data.data.lists[prev.listKey] } : prev);
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
        socket.emit("join_admin_room");
        socket.on('new_notification', () => fetchDashboardStats(false));

        const handleLocationUpdate = (data) => {
            const empId = data.employeeId;
            if (!empId) return;
            setOnlineUsers((prev) => ({ ...prev, [empId]: true }));
            if (timeoutsRef.current[empId]) clearTimeout(timeoutsRef.current[empId]);
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
            Object.values(timeoutsRef.current).forEach(clearTimeout);
        };
    }, [fetchDashboardStats, user]);

    const statusBadgeStyle = (status) => {
        const styles = {
            present: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            absent: "bg-rose-500/10 text-rose-600 border-rose-500/20",
            event: "bg-violet-500/10 text-violet-600 border-violet-500/20",
            late: "bg-amber-500/10 text-amber-600 border-amber-500/20",
            approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20",
            leave: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
            pending: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300",
            holiday: "bg-orange-500/10 text-orange-600 border-orange-500/20"
        };
        return styles[status?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    };

    const stats = [
        { label: t('admin_dashboard.stats.total_staff', 'Total Staff'), value: dashboardData?.stats?.totalEmployees || 0, icon: Users, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
        { listKey: 'completed', label: t('admin_dashboard.stats.completed', 'Completed'), value: dashboardData?.stats?.completedToday || 0, list: dashboardData?.lists?.completed, icon: CheckCircle, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", rawColor: "text-indigo-600" },
        { listKey: 'present', label: t('admin_dashboard.stats.on_site', 'On-Site'), value: dashboardData?.stats?.presentToday || 0, list: dashboardData?.lists?.present, icon: UserCheck, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", rawColor: "text-emerald-600" },
        { listKey: 'noShow', label: t('admin_dashboard.stats.no_show', 'No Show'), value: dashboardData?.stats?.noShow || 0, list: dashboardData?.lists?.noShow, icon: UserX, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400", rawColor: "text-rose-600" },
        { listKey: 'leave', label: t('admin_dashboard.stats.on_leave', 'On Leave'), value: dashboardData?.stats?.onLeaveToday || 0, list: dashboardData?.lists?.leave, icon: CalendarOff, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", rawColor: "text-cyan-600" },
        { listKey: 'holiday', label: t('admin_dashboard.stats.on_holiday', 'On Holiday'), value: dashboardData?.stats?.onHolidayToday || 0, list: dashboardData?.lists?.holiday, icon: Coffee, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", rawColor: "text-orange-600" },
        { listKey: 'pending', label: t('admin_dashboard.stats.pending', 'Pending'), value: dashboardData?.stats?.pending || 0, list: dashboardData?.lists?.pending, icon: Clock, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", rawColor: "text-amber-600" },
    ];

    const handleStatClick = (stat) => {
        if (stat.list) {
            setModalData({
                isOpen: true,
                title: stat.label,
                listKey: stat.listKey,
                list: stat.list,
                icon: stat.icon,
                color: stat.rawColor
            });
        }
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

    return (
        <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8 relative">

            {/* --- NEW MODAL FOR DETAILS --- */}
            {modalData.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setModalData({ ...modalData, isOpen: false })}>
                    <div className="bg-card w-full max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-5 sm:p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl bg-background border border-border shadow-sm ${modalData.color}`}>
                                    {modalData.icon && <modalData.icon className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{modalData.title} Details</h2>
                                    <p className="text-sm font-semibold text-muted-foreground mt-0.5">{modalData.list.length} Employees in this status</p>
                                </div>
                            </div>
                            <button onClick={() => setModalData({ ...modalData, isOpen: false })} className="p-2 bg-background rounded-full hover:bg-muted transition-colors border border-transparent hover:border-border">
                                <XCircle className="w-6 h-6 text-muted-foreground hover:text-foreground" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar bg-background/50">
                            {modalData.list.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
                                    <h3 className="text-xl font-bold text-foreground">No Records Found</h3>
                                    <p className="text-muted-foreground">There are no employees currently marked as {modalData.title}.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {modalData.list.map((item, idx) => (
                                        <div key={idx} className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:shadow-md transition-shadow">

                                            {/* Profile Section */}
                                            <div className="flex items-center gap-4 shrink-0 sm:w-1/3">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center">
                                                    {item.profilePicture ? (
                                                        <img src={item.profilePicture} alt={item.employeeName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-primary font-black text-lg">{item.employeeName.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-extrabold text-foreground truncate">{item.employeeName}</h4>
                                                    <span className={`inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${statusBadgeStyle(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details Section */}
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-4">
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><School className="w-3.5 h-3.5" /> Location</p>
                                                    <p className="text-sm font-semibold text-foreground truncate" title={item.schoolName}>{item.schoolName}</p>
                                                    <p className="text-xs text-primary font-bold">{item.category}</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timing</p>
                                                    <p className="text-xs font-medium text-foreground"><span className="text-muted-foreground">Sched:</span> {item.scheduledStart} - {item.scheduledEnd}</p>
                                                    <p className="text-xs font-medium text-foreground"><span className="text-muted-foreground">Actual:</span> {item.actualStart} - {item.actualEnd}</p>
                                                </div>
                                            </div>

                                            {/* Reason Section (If any) */}
                                            {item.reason && item.reason !== '-' && (
                                                <div className="w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border/50 sm:pl-4 shrink-0 max-w-[200px] flex flex-col">
                                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 shrink-0">Notice</p>
                                                    {/* Added max-h-24 and overflow-y-auto, removed line-clamp-2 */}
                                                    <div className="bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 max-h-24 overflow-y-auto custom-scrollbar">
                                                        <p className="text-xs font-medium text-muted-foreground italic">
                                                            "{item.reason}"
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-5 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        onClick={() => handleStatClick(stat)}
                        className={`group bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between overflow-hidden relative transition-all duration-200 ${stat.list ? 'cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-primary/40' : ''}`}
                    >
                        <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color} transition-transform group-hover:scale-110`}>
                                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <p className="text-3xl sm:text-4xl font-black text-foreground relative z-10 tracking-tight">{stat.value}</p>

                        {stat.list && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-background border border-border text-[8px] px-1.5 py-0.5 rounded text-muted-foreground font-bold uppercase tracking-wider">Click to view</span>
                            </div>
                        )}
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