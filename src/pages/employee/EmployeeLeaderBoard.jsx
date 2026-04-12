import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    Trophy, TrendingUp, TrendingDown, Minus, Star,
    Medal, Crown, Target, LineChart as LineChartIcon,
    ChevronDown, CalendarDays, Zap,
    Users,
    Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";
import {
    LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useSelector } from "react-redux";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { withCredentials: true });

const EmployeeLeaderBoard = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [leaderboard, setLeaderboard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [myGraphData, setMyGraphData] = useState([]);
    const [graphPeriod, setGraphPeriod] = useState('weekly');
    const [isGraphLoading, setIsGraphLoading] = useState(false);
    const [isChartExpanded, setIsChartExpanded] = useState(false);

    const refetchTimestamp = useRef(0);

    // 1. DEDICATED FETCH: LEADERBOARD
    const fetchLeaderboard = useCallback(async () => {
        try {
            const res = await api.get(`/employee/leaderboard?_t=${Date.now()}`);
            if (res.data.success) {
                setLeaderboard(res.data.data);
            }
        } catch (error) {
            toast.error(t('leaderboard.toasts.load_error', 'Failed to load leaderboard'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // 2. DEDICATED FETCH: GRAPH
    const fetchMyGraph = useCallback(async () => {
        setIsGraphLoading(true);
        try {
            const today = new Date();
            const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const currentYear = `${today.getFullYear()}`;
            const dateParam = graphPeriod === 'weekly' ? currentMonth : currentYear;

            const res = await api.get(`/employee/my-graph?period=${graphPeriod}&date=${dateParam}&_t=${Date.now()}`);
            if (res.data.success) {
                setMyGraphData(res.data.data);
            }
        } catch (error) {
            setMyGraphData([]);
        } finally {
            setIsGraphLoading(false);
        }
    }, [graphPeriod]);

    // 3. DEDICATED EFFECT: INITIAL LOAD & PERIOD CHANGES
    useEffect(() => {
        fetchLeaderboard();
        fetchMyGraph();
    }, [fetchLeaderboard, fetchMyGraph]);

    // 4. DEDICATED EFFECT: SOCKET ROOM JOIN
    useEffect(() => {
        if (user && (user._id || user.id)) {
            const currentUserId = user._id || user.id;
            socket.emit('join_room', currentUserId);
        }
    }, [user]);

    // 5. DEDICATED EFFECT: SOCKET LISTENER
    useEffect(() => {
        const handleRealTimeUpdate = () => {
            if (Date.now() - refetchTimestamp.current > 2000) {
                refetchTimestamp.current = Date.now();

                try {
                    const audio = new Audio('/sounds/notification-ting.mp3');
                    audio.play().catch(() => { });
                } catch (e) { }

                toast.success(t('leaderboard.toasts.updated', 'Leaderboard updated!'), { icon: '🏆' });

                fetchLeaderboard();
                fetchMyGraph();
            }
        };

        socket.on('leaderboard_refresh', handleRealTimeUpdate);

        return () => {
            socket.off('leaderboard_refresh', handleRealTimeUpdate);
        }
    }, [fetchLeaderboard, fetchMyGraph, t]);

    // Helpers
    const myStats = useMemo(() => {
        if (!user || leaderboard.length === 0) return null;
        const currentUserId = user.id || user._id;
        return leaderboard.find(emp => emp._id === currentUserId) || null;
    }, [leaderboard, user]);

    const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

    const getZoneStyles = (zone) => {
        switch (zone) {
            case 'green': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'blue': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'red': return 'bg-destructive/10 text-destructive dark:text-red-400 border-destructive/20';
            default: return 'bg-muted text-muted-foreground border-border/60';
        }
    };

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />;
            case 'down': return <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />;
            default: return <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/50" />;
        }
    };

    // Render Podium Step
    const PodiumStep = ({ rank, employee }) => {
        if (!employee) return <div className="flex-1" />;

        const isFirst = rank === 1;
        const heightClass = rank === 1 ? 'h-32 sm:h-40 md:h-48' : rank === 2 ? 'h-24 sm:h-32 md:h-36' : 'h-20 sm:h-28 md:h-32';
        const colorClass = rank === 1 ? 'from-amber-400 to-amber-600' : rank === 2 ? 'from-slate-300 to-slate-500' : 'from-orange-700 to-orange-900';
        const bgOpacity = rank === 1 ? 'bg-amber-500/10 border-amber-500/30' : rank === 2 ? 'bg-slate-500/10 border-slate-500/30' : 'bg-orange-700/10 border-orange-700/30';

        return (
            <div className="flex-1 flex flex-col items-center justify-end relative group animate-in slide-in-from-bottom-8 duration-700">
                {isFirst && <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 mb-2 sm:mb-3 absolute -top-10 sm:-top-12 animate-bounce drop-shadow-md" />}

                <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full mb-3 sm:mb-4 z-10 flex items-center justify-center text-white font-black text-lg sm:text-2xl md:text-3xl shadow-xl shadow-black/10 bg-linear-to-br ${colorClass} overflow-hidden shrink-0 border-2 sm:border-4 border-background`}
                >
                    {employee.profilePicture && typeof employee.profilePicture === 'string' && employee.profilePicture.startsWith('http') ? (
                        <img
                            src={employee.profilePicture}
                            alt={employee.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        employee.name.charAt(0).toUpperCase()
                    )}
                </div>

                <div className="text-center mb-2 sm:mb-3 z-10 space-y-0.5 sm:space-y-1">
                    <p className="font-extrabold text-[11px] sm:text-sm md:text-base text-foreground truncate w-full px-1 tracking-tight">{employee.name.split(' ')[0]}</p>
                    <p className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-widest text-muted-foreground">{employee.currentWeeklyScore} {t('leaderboard.pts', 'PTS')}</p>
                </div>

                <div className={`w-full rounded-t-3xl sm:rounded-t-4xl border-t-2 border-l border-r ${bgOpacity} ${heightClass} flex items-start justify-center pt-4 sm:pt-5 relative overflow-hidden transition-all duration-500 group-hover:brightness-110 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}>
                    <div className={`absolute inset-0 opacity-20 bg-linear-to-b ${colorClass} to-transparent`} />
                    <span className="text-3xl sm:text-5xl md:text-6xl font-black opacity-40 drop-shadow-sm">{rank}</span>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-24 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 mt-2 md:mt-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-8 border-b border-border/40">
                    <div className="space-y-3 w-full max-w-sm">
                        <div className="h-10 sm:h-12 w-3/4 md:w-72 bg-muted rounded-2xl animate-pulse" />
                        <div className="h-4 sm:h-5 w-full md:w-80 bg-muted/60 rounded-xl animate-pulse" />
                    </div>
                </div>
                <div className="h-56 sm:h-64 flex items-end justify-center gap-2 sm:gap-4 mt-8 sm:mt-12 animate-pulse px-2 sm:px-4">
                    <div className="flex-1 h-24 sm:h-32 bg-card rounded-t-3xl sm:rounded-t-[2.5rem] border border-border/50" />
                    <div className="flex-1 h-40 sm:h-48 bg-card rounded-t-3xl sm:rounded-t-[2.5rem] border border-border/50" />
                    <div className="flex-1 h-20 sm:h-24 bg-card rounded-t-3xl sm:rounded-t-[2.5rem] border border-border/50" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-24 p-4 sm:p-6 lg:p-8 mt-2 md:mt-0">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 pb-6 sm:pb-8 border-b border-border/50 relative z-20">
                <div className="flex items-center gap-4 sm:gap-5">
                    <div className="relative">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase italic">{t('leaderboard.employee_title', 'Leaderboard')}</h1>
                        <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                            <Medal className="w-3.5 h-3.5 text-primary/70" /> {t('leaderboard.employee_subtitle', 'Top Performers')}
                        </p>
                    </div>
                </div>
            </div>

            {/* PODIUM SECTION */}
            {top3.length > 0 && (
                <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-4xl mx-auto mb-8 sm:mb-16 mt-8 sm:mt-12 px-1 sm:px-2">
                    <PodiumStep rank={2} employee={top3[1]} />
                    <PodiumStep rank={1} employee={top3[0]} />
                    <PodiumStep rank={3} employee={top3[2]} />
                </div>
            )}

            {/* MY STATS & GRAPH SECTION */}
            {myStats && (
                <div className="bg-card rounded-4xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 relative overflow-hidden mb-8 sm:mb-10">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-linear-to-r from-primary via-blue-500 to-emerald-500 z-20" />
                    <div className="absolute -top-20 -right-20 sm:-top-24 sm:-right-24 w-48 h-48 sm:w-64 sm:h-64 bg-primary/5 rounded-full blur-2xl sm:blur-3xl pointer-events-none" />

                    <div className="p-5 sm:p-6 md:p-8 flex flex-col md:flex-row items-center md:justify-between gap-6 sm:gap-8 relative z-10">

                        {/* My Quick Stats */}
                        <div className="flex items-center gap-4 sm:gap-5 md:gap-6 w-full md:w-auto">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-white font-black text-2xl sm:text-3xl md:text-4xl shadow-xl shadow-primary/20 border border-primary/20 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                #{myStats.currentWeeklyRank}
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                                <p className="text-[9px] sm:text-[10px] md:text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1 sm:gap-1.5">
                                    <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" /> {t('leaderboard.my_ranking', 'My Ranking')}
                                </p>
                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground flex items-center gap-2 sm:gap-3 tracking-tight">
                                    {myStats.currentWeeklyScore} <span className="text-xs sm:text-sm md:text-base text-muted-foreground font-bold tracking-widest uppercase mt-0.5 sm:mt-1">{t('leaderboard.out_of_100_pts', '/ 100')}</span>
                                </h2>
                                <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
                                    <span className={`px-2 sm:px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shadow-sm ${getZoneStyles(myStats.colorZone)}`}>
                                        {t('leaderboard.zone_label', { zone: myStats.colorZone })}
                                    </span>
                                    <div className="bg-muted border border-border/60 p-1 rounded-md sm:rounded-lg shadow-sm">
                                        {getTrendIcon(myStats.scoreTrend)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Graph Toggle Button */}
                        <button
                            onClick={() => setIsChartExpanded(!isChartExpanded)}
                            className="w-full md:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-muted/30 hover:bg-muted/60 border border-border/60 flex items-center justify-center gap-2 sm:gap-3 transition-all font-black uppercase tracking-widest text-[10px] sm:text-xs text-foreground shadow-sm active:scale-95"
                        >
                            <LineChartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                            {isChartExpanded ? t('leaderboard.hide_progress', 'Hide Graph') : t('leaderboard.view_progress', 'View Graph')}
                            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground transition-transform duration-300 ${isChartExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Smooth Accordion Graph */}
                    <div className={`grid transition-all duration-500 ease-in-out bg-muted/5 ${isChartExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-border/50' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="p-4 sm:p-6 md:p-8">
                                <div className="flex justify-end mb-4 sm:mb-6">
                                    <div className="flex bg-muted/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-border/60 shadow-sm">
                                        <button onClick={() => setGraphPeriod('weekly')} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${graphPeriod === 'weekly' ? 'bg-background shadow-md text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}>
                                            <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t('leaderboard.graph.weekly', 'Weekly')}
                                        </button>
                                        <button onClick={() => setGraphPeriod('monthly')} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${graphPeriod === 'monthly' ? 'bg-background shadow-md text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}>
                                            <LineChartIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t('leaderboard.graph.monthly', 'Monthly')}
                                        </button>
                                    </div>
                                </div>

                                <div className="h-64 sm:h-72 md:h-80 w-full relative">
                                    {isGraphLoading ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-card border border-dashed border-border/60 rounded-3xl sm:rounded-3xl animate-pulse">
                                            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin mb-2 sm:mb-3" />
                                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{t('leaderboard.graph.loading', { period: t(`leaderboard.graph.${graphPeriod}`) })}</span>
                                        </div>
                                    ) : myGraphData.length === 0 ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-card border-2 border-dashed border-border/60 rounded-3xl sm:rounded-3xl">
                                            <LineChartIcon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/40 mb-2 sm:mb-3" />
                                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{t('leaderboard.graph.no_historical_data', 'No Data Available')}</span>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={myGraphData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} domain={[0, 100]} />
                                                <Tooltip
                                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '11px' }}
                                                    itemStyle={{ color: 'var(--foreground)' }}
                                                />
                                                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--card)', stroke: 'var(--primary)' }} activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL LEADERBOARD LIST */}
            <div className="bg-card rounded-4xl sm:rounded-[2.5rem] border border-border/60 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col relative">
                <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 pointer-events-none" />
                
                <div className="p-5 sm:p-6 md:p-8 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                    <h3 className="font-black text-base sm:text-lg md:text-xl text-foreground uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> {t('leaderboard.full_roster', 'Full Roster')}
                    </h3>
                </div>

                <div className="p-3.5 sm:p-4 md:p-6 flex-1 bg-background/30 space-y-2.5 sm:space-y-3">
                    {isLoading ? (
                        <div className="space-y-2.5 sm:space-y-3">
                            {[...Array(5)].map((_, idx) => (
                                <div key={idx} className="h-16 sm:h-20 bg-card border border-border/50 rounded-xl sm:rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 flex flex-col items-center justify-center bg-muted/10 rounded-2xl sm:rounded-3xl border border-dashed border-border/60">
                            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/30 mb-3 sm:mb-4" />
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('leaderboard.no_active_employees', 'No active records')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-500">
                            {leaderboard.map((emp) => {
                                const isMe = myStats && emp._id === myStats._id;

                                return (
                                    <div key={emp._id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 md:p-5 rounded-[1.25rem] sm:rounded-2xl md:rounded-3xl border transition-all duration-300 gap-3 sm:gap-4 md:gap-6 ${isMe ? 'bg-primary/5 border-primary/30 shadow-md scale-[1.01] z-10 relative' : 'bg-card border-border/60 hover:border-primary/20 hover:bg-muted/10 hover:shadow-sm'}`}>
                                        
                                        {/* Rank & Profile */}
                                        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 min-w-0">
                                            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl text-xs sm:text-sm md:text-base font-black shrink-0 ${isMe ? 'bg-primary text-primary-foreground shadow-inner' : 'text-muted-foreground bg-muted border border-border/60'}`}>
                                                #{emp.currentWeeklyRank}
                                            </div>
                                            
                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white font-black text-xs sm:text-sm md:text-lg shrink-0 overflow-hidden border-2 border-background shadow-sm ${isMe ? 'bg-primary' : 'bg-slate-400 dark:bg-slate-600'}`}>
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
                                            
                                            <div className="min-w-0">
                                                <p className={`font-black text-sm sm:text-base md:text-lg truncate flex items-center gap-1.5 sm:gap-2 tracking-tight ${isMe ? 'text-primary' : 'text-foreground'}`}>
                                                    {emp.name} {isMe && <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />}
                                                </p>
                                                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground uppercase font-bold tracking-widest truncate mt-0.5">{emp.zone || t('leaderboard.unassigned')}</p>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0 pl-12 sm:pl-0">
                                            <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] md:text-xs font-black uppercase tracking-widest border shadow-sm flex items-center gap-1 sm:gap-1.5 ${getZoneStyles(emp.colorZone)}`}>
                                                {emp.currentWeeklyScore} <span>{t('leaderboard.pts', 'PTS')}</span>
                                            </span>
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-background border border-border/60 flex justify-center items-center shadow-sm">
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
        </div>
    );
};

export default EmployeeLeaderBoard;