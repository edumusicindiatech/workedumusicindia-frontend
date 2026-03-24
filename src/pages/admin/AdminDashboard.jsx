import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux"; // <-- 1. ADDED REDUX SELECTOR
import { Users, UserCheck, UserX, Clock, MapPin, School, BookOpen, RefreshCw } from "lucide-react";
import { io } from "socket.io-client";
import api from "../../api/axios";

const AdminDashboard = () => {
    // 2. EXTRACT USER FROM REDUX TO GET THE ID
    const { user } = useSelector((state) => state.auth);

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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

        // 3. TELL SOCKET TO JOIN THIS SPECIFIC ADMIN'S ROOM
        if (user && (user.id || user._id)) {
            socket.emit("join_room", user.id || user._id);
        }

        socket.on('new_notification', (data) => {
            console.log("Live update received via socket!", data);
            fetchDashboardStats(false);
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [fetchDashboardStats, user]);

    // 4. ADDED DEBUGGER LOG FOR RECENT ACTIVITY
    useEffect(() => {
        if (dashboardData) {
            console.log("DASHBOARD DATA FROM BACKEND:", dashboardData);
        }
    }, [dashboardData]);

    const statusBadge = (status) => {
        const styles = {
            present: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            absent: "bg-rose-500/10 text-rose-500 border-rose-500/20",
            warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            event: "bg-violet-500/10 text-violet-500 border-violet-500/20",
            // Added capital letter fallbacks just in case
            Present: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            Late: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        };
        return styles[status] || styles[status?.toLowerCase()] || "bg-muted text-muted-foreground border-border";
    };

    if (loading && !dashboardData) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-pulse">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Aggregating live operations data...</p>
            </div>
        );
    }

    const stats = [
        { label: "Total Employees", value: dashboardData?.stats?.totalEmployees || 0, icon: Users, color: "bg-primary/10 text-primary" },
        { label: "Present Today", value: dashboardData?.stats?.presentToday || 0, icon: UserCheck, color: "bg-emerald-500/10 text-emerald-500" },
        { label: "Absent", value: dashboardData?.stats?.noShow || 0, icon: UserX, color: "bg-rose-500/10 text-rose-500" },
        { label: "Pending", value: dashboardData?.stats?.pending || 0, icon: Clock, color: "bg-amber-500/10 text-amber-500" },
    ];

    return (
        <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground text-sm font-medium">Overview of today's workforce activity.</p>
                </div>
                <button
                    onClick={() => fetchDashboardStats(false)}
                    className="p-2 sm:p-2.5 bg-card border border-border hover:bg-muted rounded-full transition-colors group shadow-sm"
                    title="Refresh Data"
                >
                    <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-foreground">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-border bg-muted/10">
                    <h2 className="text-base sm:text-lg font-bold text-foreground">Recent Activity</h2>
                </div>

                <div className="flex flex-col">
                    {dashboardData?.recentActivity?.length > 0 ? (
                        dashboardData.recentActivity.map((item, i) => (
                            <div
                                key={item.id || i}
                                className="flex flex-col md:flex-row md:items-center justify-between p-5 sm:p-6 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors gap-4 sm:gap-6"
                            >
                                <div className="flex items-center gap-3 sm:gap-4 md:w-64 shrink-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center text-sm sm:text-base font-bold text-primary-foreground shadow-inner">
                                        {/* 5. ADDED SAFETY OPTIONAL CHAINING SO IT DOESN'T CRASH IF NAME IS MISSING */}
                                        {item?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm sm:text-base font-bold text-foreground truncate">{item?.name || 'Unknown User'}</p>
                                        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5 truncate">
                                            <MapPin className="w-3 h-3 shrink-0" /> {item?.zone || 'No Zone'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-muted/40 md:bg-transparent rounded-xl p-3.5 md:p-0 flex-1 border border-border/50 md:border-none">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <School className="w-4 h-4 text-indigo-500 shrink-0" />
                                        <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{item?.school || 'N/A'}</span>
                                    </div>
                                    <div className="hidden sm:block md:hidden lg:block w-px h-6 bg-border"></div>
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
                                        <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{item?.category || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between md:justify-center gap-3 md:gap-2 shrink-0 md:w-48 lg:w-56 mt-1 md:mt-0">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${statusBadge(item?.status)}`}>
                                        {item?.action || item?.status || 'Update'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs font-bold text-foreground">{item?.checkInTime || 'Just now'}</span>
                                        {item?.timeAgo && <span className="text-[10px] text-muted-foreground font-medium">• {item.timeAgo}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-16 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-foreground font-bold text-lg mb-1">No Activity Yet</h3>
                            <p className="text-muted-foreground text-sm font-medium">Workforce check-ins will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;