import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    Trophy, Search, TrendingUp, TrendingDown, Minus, Star,
    ArrowLeft, BarChart3, CalendarDays, LineChart as LineChartIcon,
    ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useSelector } from "react-redux";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
    withCredentials: true
});

const AdminLeaderboard = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [isChartExpanded, setIsChartExpanded] = useState(false);

    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeGraphData, setEmployeeGraphData] = useState([]);
    const [graphPeriod, setGraphPeriod] = useState('weekly');
    const [isGraphLoading, setIsGraphLoading] = useState(false);

    // --- NEW: Real-Time Presence State ---
    const [onlineUsers, setOnlineUsers] = useState({});
    const timeoutsRef = useRef({});

    // 1. DEDICATED FETCH (Leaderboard)
    const fetchLeaderboard = useCallback(async () => {
        try {
            const res = await api.get(`/employee/leaderboard?_t=${Date.now()}`);
            if (res.data.success) {
                setEmployees(res.data.data);
            }
        } catch (error) {
            toast.error(t('leaderboard.toasts.load_error'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // 2. DEDICATED INITIAL LOAD
    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // 3. DEDICATED SOCKET ROOM JOIN
    useEffect(() => {
        if (user && (user._id || user.id)) {
            const adminId = user._id || user.id;
            socket.emit('join_room', adminId);
        }

        // Join admin tracking room for live pings
        socket.emit("join_admin_room");
    }, [user]);

    // 4. DEDICATED SOCKET LISTENER
    useEffect(() => {
        const handleRealTimeUpdate = () => {
            try {
                const notificationSound = new Audio('/sounds/notification-ting.mp3');
                notificationSound.currentTime = 0;
                notificationSound.play().catch(e => console.warn("Audio blocked", e));
            } catch (e) { console.error("Sound error", e); }

            toast.success(t('leaderboard.toasts.updated'), {
                icon: '🏆',
                duration: 4000
            });

            fetchLeaderboard();
        };

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

        socket.on('admin_leaderboard_refresh', handleRealTimeUpdate);
        socket.on("employee_location_changed", handleLocationUpdate);

        return () => {
            socket.off('admin_leaderboard_refresh', handleRealTimeUpdate);
            socket.off("employee_location_changed", handleLocationUpdate);

            // Cleanup all active timeouts when leaving the page
            Object.values(timeoutsRef.current).forEach(clearTimeout);
        };
    }, [fetchLeaderboard, t]);

    // Fetch Individual Employee Graph Data
    useEffect(() => {
        if (!selectedEmployee) return;

        const fetchGraph = async () => {
            setIsGraphLoading(true);
            try {
                const today = new Date();
                const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                const currentYear = `${today.getFullYear()}`;

                const dateParam = graphPeriod === 'weekly' ? currentMonth : currentYear;

                const res = await api.get(`/admin/progress/${selectedEmployee._id}/graph?period=${graphPeriod}&date=${dateParam}&_t=${Date.now()}`);
                if (res.data.success) {
                    setEmployeeGraphData(res.data.data);
                }
            } catch (error) {
                toast.error(t('leaderboard.toasts.graph_error'));
                setEmployeeGraphData([]);
            } finally {
                setIsGraphLoading(false);
            }
        };

        fetchGraph();
    }, [selectedEmployee, graphPeriod, t]);

    // Helpers
    const getZoneStyles = (zone) => {
        switch (zone) {
            case 'green': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'blue': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'red': return 'bg-destructive/10 text-destructive border-destructive/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    const getChartColor = (score) => {
        if (score >= 70) return '#10b981';
        if (score >= 50) return '#3b82f6';
        return '#ef4444';
    };

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
            case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
            default: return <Minus className="w-4 h-4 text-muted-foreground/50" />;
        }
    };

    const getRankStyle = (rank) => {
        if (rank === 1) return "text-amber-500 bg-amber-500/10";
        if (rank === 2) return "text-slate-500 bg-slate-500/10";
        if (rank === 3) return "text-orange-700 bg-orange-700/10";
        return "text-muted-foreground bg-transparent";
    };

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [employees, searchTerm]);

    const top5GlobalData = useMemo(() => {
        return employees.slice(0, 5).map(emp => ({
            name: emp.name.split(' ')[0],
            score: emp.currentWeeklyScore || 0,
            zone: emp.colorZone
        }));
    }, [employees]);

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            {/* Header Section */}
            <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                            {selectedEmployee ? selectedEmployee.name : t('leaderboard.title')}
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm truncate">
                            {selectedEmployee ? t('leaderboard.detail_history') : t('leaderboard.subtitle')}
                        </p>
                    </div>
                </div>

                {selectedEmployee && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmployee(null)}
                        className="gap-1.5 border-border text-muted-foreground hover:text-primary transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{t('leaderboard.back_to_list')}</span>
                    </Button>
                )}
            </div>

            {/* DYNAMIC TOP SECTION */}
            <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col mb-6 sm:mb-8 transition-all duration-300">
                {!selectedEmployee ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div
                            className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => setIsChartExpanded(!isChartExpanded)}
                        >
                            <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary" /> {t('leaderboard.top_5_title')}
                            </h3>
                            <div className="p-1 rounded-full bg-background border border-border shadow-sm">
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isChartExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        <div className={`grid transition-all duration-300 ease-in-out ${isChartExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
                                    <div className="h-50 sm:h-62.5 min-h-50 min-w-full w-full relative">
                                        {isLoading ? (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">{t('leaderboard.chart_loading')}</div>
                                        ) : top5GlobalData.length === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t('leaderboard.no_data')}</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={top5GlobalData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} interval={0} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                                                    <Tooltip
                                                        cursor={{ fill: '#f1f5f9' }}
                                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                    />
                                                    <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                                        {top5GlobalData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getChartColor(entry.score)} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                {/* --- UPGRADED HEADER PROFILE PIC WITH ONLINE INDICATOR --- */}
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-sm overflow-hidden">
                                        {selectedEmployee.profilePicture && typeof selectedEmployee.profilePicture === 'string' && selectedEmployee.profilePicture.startsWith('http') ? (
                                            <img
                                                src={selectedEmployee.profilePicture}
                                                alt={selectedEmployee.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            selectedEmployee.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div
                                        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] border-card transition-colors duration-500 ${onlineUsers[selectedEmployee._id || selectedEmployee.id] ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "bg-slate-400"}`}
                                        title={onlineUsers[selectedEmployee._id || selectedEmployee.id] ? "Online" : "Offline"}
                                    />
                                </div>
                                <div>
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border mb-1 inline-block ${getZoneStyles(selectedEmployee.colorZone)}`}>
                                        {t('leaderboard.current_rank', { rank: selectedEmployee.currentWeeklyRank })}
                                    </span>
                                    <h3 className="font-bold text-foreground leading-none flex items-center gap-2">
                                        {t('leaderboard.score_label', { score: selectedEmployee.currentWeeklyScore })}
                                        {getTrendIcon(selectedEmployee.scoreTrend)}
                                    </h3>
                                </div>
                            </div>

                            <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                                <button
                                    onClick={() => setGraphPeriod('weekly')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${graphPeriod === 'weekly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <CalendarDays className="w-3.5 h-3.5" /> {t('leaderboard.graph.weekly')}
                                </button>
                                <button
                                    onClick={() => setGraphPeriod('monthly')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${graphPeriod === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <LineChartIcon className="w-3.5 h-3.5" /> {t('leaderboard.graph.monthly')}
                                </button>
                            </div>
                        </div>

                        <div className="h-62.5 min-h-62.5 w-full min-w-full relative">
                            {isGraphLoading ? (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">{t('leaderboard.graph.loading', { period: graphPeriod })}</div>
                            ) : employeeGraphData.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                                    {t('leaderboard.graph.no_historical_data')}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={employeeGraphData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                        />
                                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#3b82f6' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* LIST SECTION */}
            {!selectedEmployee && (
                <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col min-h-100 transition-all duration-300">
                    <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between gap-3 sm:gap-4">
                        <h3 className="font-bold text-sm sm:text-base text-foreground truncate flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" /> {t('leaderboard.standings_title')}
                        </h3>
                    </div>

                    <div className="p-3 sm:p-4 md:p-6 flex-1 bg-background/50 relative overflow-hidden space-y-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t('leaderboard.search_placeholder')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 h-11 bg-card border-border/60 focus-visible:ring-primary/30 rounded-xl shadow-sm text-sm"
                            />
                        </div>

                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(8)].map((_, idx) => (
                                    <div key={idx} className="h-16 bg-card border border-border/80 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm font-medium">{t('leaderboard.no_employees')}</div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {filteredEmployees.map((emp) => {
                                    // Fetch online status safely
                                    const isOnline = onlineUsers[emp._id || emp.id];

                                    return (
                                        <div
                                            key={emp._id}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className="flex items-center justify-between p-3 sm:p-4 bg-card border border-border/80 rounded-xl hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div className={`w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-lg text-xs sm:text-sm font-black shrink-0 ${getRankStyle(emp.currentWeeklyRank)}`}>
                                                    #{emp.currentWeeklyRank}
                                                </div>

                                                {/* --- UPGRADED LIST PROFILE PIC WITH ONLINE INDICATOR --- */}
                                                <div className="relative shrink-0">
                                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                        {emp.profilePicture && typeof emp.profilePicture === 'string' && emp.profilePicture.startsWith('http') ? (
                                                            <img
                                                                src={emp.profilePicture}
                                                                alt={emp.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            emp.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-card group-hover:border-primary/10 transition-colors duration-500 ${isOnline ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "bg-slate-400"}`}
                                                        title={isOnline ? "Online" : "Offline"}
                                                    />
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">{emp.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold truncate">{emp.zone || t('leaderboard.unassigned')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
                                                <span className={`px-2 sm:px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-black uppercase tracking-wider border ${getZoneStyles(emp.colorZone)}`}>
                                                    {emp.currentWeeklyScore} <span className="hidden sm:inline">/ 100</span><span className="inline sm:hidden">{t('leaderboard.pts')}</span>
                                                </span>
                                                <div className="w-6 flex justify-center">
                                                    {getTrendIcon(emp.scoreTrend)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLeaderboard;