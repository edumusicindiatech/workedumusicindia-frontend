import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    Trophy, TrendingUp, TrendingDown, Minus, Star,
    Medal, Crown, Target, LineChart as LineChartIcon,
    ChevronDown, CalendarDays, Zap,
    Users
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

    // Personal Graph State
    const [myGraphData, setMyGraphData] = useState([]);
    const [graphPeriod, setGraphPeriod] = useState('weekly');
    const [isGraphLoading, setIsGraphLoading] = useState(false);
    const [isChartExpanded, setIsChartExpanded] = useState(false);

    const refetchTimestamp = useRef(0);

    // Fetch Leaderboard Data
    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/employee/leaderboard');
            if (res.data.success) {
                setLeaderboard(res.data.data);
            }
        } catch (error) {
            toast.error(t('leaderboard.toasts.load_error') || "Failed to load leaderboard");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Personal Graph Data
    const fetchMyGraph = useCallback(async () => {
        setIsGraphLoading(true);
        try {
            const today = new Date();
            const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const currentYear = `${today.getFullYear()}`;
            const dateParam = graphPeriod === 'weekly' ? currentMonth : currentYear;

            const res = await api.get(`/employee/my-graph?period=${graphPeriod}&date=${dateParam}`);
            if (res.data.success) {
                setMyGraphData(res.data.data);
            }
        } catch (error) {
            setMyGraphData([]);
        } finally {
            setIsGraphLoading(false);
        }
    }, [graphPeriod]);

    useEffect(() => {
        fetchLeaderboard();
        fetchMyGraph();

        if (!user) return;

        const currentUserId = user.id || user._id;
        const joinUserRoom = () => socket.emit("join_room", currentUserId);

        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleRealTimeUpdate = () => {
            if (Date.now() - refetchTimestamp.current > 2000) {
                refetchTimestamp.current = Date.now();

                try {
                    const audio = new Audio('/sounds/notification-ting.mp3');
                    audio.play().catch(() => { });
                } catch (e) { }

                toast.success("Leaderboard updated!", { icon: '🏆' });
                fetchLeaderboard();
                fetchMyGraph();
            }
        };

        socket.on('leaderboard_refresh', handleRealTimeUpdate);

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off('leaderboard_refresh', handleRealTimeUpdate);
        };
    }, [user, fetchMyGraph]);

    useEffect(() => {
        fetchMyGraph();
    }, [graphPeriod, fetchMyGraph]);

    // Helpers
    const myStats = useMemo(() => {
        if (!user || leaderboard.length === 0) return null;
        const currentUserId = user.id || user._id;
        return leaderboard.find(emp => emp._id === currentUserId) || null;
    }, [leaderboard, user]);

    const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

    const getZoneStyles = (zone) => {
        switch (zone) {
            case 'green': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'blue': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'red': return 'bg-destructive/10 text-destructive border-destructive/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
            case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
            default: return <Minus className="w-4 h-4 text-muted-foreground/50" />;
        }
    };

    // Render Podium Step
    const PodiumStep = ({ rank, employee }) => {
        if (!employee) return <div className="flex-1" />;

        const isFirst = rank === 1;
        const heightClass = rank === 1 ? 'h-32 sm:h-40' : rank === 2 ? 'h-24 sm:h-32' : 'h-20 sm:h-28';
        const colorClass = rank === 1 ? 'from-amber-400 to-amber-600' : rank === 2 ? 'from-slate-300 to-slate-500' : 'from-orange-700 to-orange-900';
        const bgOpacity = rank === 1 ? 'bg-amber-500/10 border-amber-500/30' : rank === 2 ? 'bg-slate-500/10 border-slate-500/30' : 'bg-orange-700/10 border-orange-700/30';

        return (
            <div className="flex-1 flex flex-col items-center justify-end relative group animate-in slide-in-from-bottom-8 duration-700">
                {isFirst && <Crown className="w-8 h-8 text-amber-500 mb-2 absolute -top-10 animate-bounce" />}

                {/* 🔥 FIX: Combined the duplicate className properties here */}
                <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-3 z-10 flex items-center justify-center text-white font-black text-lg sm:text-2xl shadow-lg bg-linear-to-br ${colorClass}`}
                    style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                >
                    {employee.name[0]}
                </div>

                <div className="text-center mb-2 z-10">
                    <p className="font-bold text-xs sm:text-sm text-foreground truncate w-full px-1">{employee.name.split(' ')[0]}</p>
                    <p className="text-[10px] sm:text-xs font-black text-muted-foreground">{employee.currentWeeklyScore} PTS</p>
                </div>

                <div className={`w-full rounded-t-2xl border-t border-l border-r ${bgOpacity} ${heightClass} flex items-start justify-center pt-4 relative overflow-hidden transition-all duration-300 group-hover:brightness-110`}>
                    <div className={`absolute inset-0 opacity-20 bg-linear-to-b ${colorClass} to-transparent`} />
                    <span className="text-3xl sm:text-5xl font-black opacity-30">{rank}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-24">

            {/* HEADER */}
            <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                        <Medal className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">Top Performers</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">Weekly Team Leaderboard</p>
                    </div>
                </div>
            </div>

            {/* PODIUM SECTION */}
            {isLoading ? (
                <div className="h-64 flex items-end justify-center gap-2 sm:gap-4 mb-10 animate-pulse">
                    <div className="flex-1 h-32 bg-card rounded-t-2xl border border-border" />
                    <div className="flex-1 h-48 bg-card rounded-t-2xl border border-border" />
                    <div className="flex-1 h-24 bg-card rounded-t-2xl border border-border" />
                </div>
            ) : top3.length > 0 && (
                <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-3xl mx-auto mb-8 sm:mb-12 mt-12 px-2">
                    <PodiumStep rank={2} employee={top3[1]} />
                    <PodiumStep rank={1} employee={top3[0]} />
                    <PodiumStep rank={3} employee={top3[2]} />
                </div>
            )}

            {/* MY STATS & GRAPH SECTION */}
            {myStats && (
                <div className="bg-card rounded-3xl border border-border shadow-lg shadow-primary/5 overflow-hidden mb-8 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-blue-500 to-emerald-500" />

                    <div className="p-5 sm:p-8 flex flex-col md:flex-row items-center md:justify-between gap-6">

                        {/* My Quick Stats */}
                        <div className="flex items-center gap-5 w-full md:w-auto">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full gradient-primary flex items-center justify-center text-white font-black text-3xl shadow-md border-4 border-background shrink-0">
                                #{myStats.currentWeeklyRank}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    <Target className="w-4 h-4 text-primary" /> My Ranking
                                </p>
                                <h2 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-3">
                                    {myStats.currentWeeklyScore} <span className="text-base text-muted-foreground font-semibold">/ 100 PTS</span>
                                    {getTrendIcon(myStats.scoreTrend)}
                                </h2>
                                <div className="mt-2 flex gap-2">
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getZoneStyles(myStats.colorZone)}`}>
                                        {myStats.colorZone} Zone
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Graph Toggle Button */}
                        <button
                            onClick={() => setIsChartExpanded(!isChartExpanded)}
                            className="w-full md:w-auto px-6 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border flex items-center justify-center gap-3 transition-colors font-bold text-sm text-foreground group"
                        >
                            <LineChartIcon className="w-5 h-5 text-primary" />
                            {isChartExpanded ? 'Hide My Progress' : 'View My Progress'}
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isChartExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Smooth Accordion Graph */}
                    <div className={`grid transition-all duration-300 ease-in-out bg-background/50 ${isChartExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-border' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="p-4 sm:p-6">
                                <div className="flex justify-end mb-4">
                                    <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                                        <button onClick={() => setGraphPeriod('weekly')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${graphPeriod === 'weekly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                            <CalendarDays className="w-3.5 h-3.5" /> Weekly
                                        </button>
                                        <button onClick={() => setGraphPeriod('monthly')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${graphPeriod === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                            <LineChartIcon className="w-3.5 h-3.5" /> Monthly
                                        </button>
                                    </div>
                                </div>

                                <div className="h-62.5 min-h-62.5 w-full min-w-full relative">
                                    {isGraphLoading ? (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading {graphPeriod} data...</div>
                                    ) : myGraphData.length === 0 ? (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                                            No historical data found for this period.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={myGraphData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
                        </div>
                    </div>
                </div>
            )}

            {/* FULL LEADERBOARD LIST */}
            <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Full Roster
                    </h3>
                </div>

                <div className="p-2 sm:p-4 flex-1 bg-background/50">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, idx) => (
                                <div key={idx} className="h-16 bg-card border border-border/80 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-sm font-medium">No active employees found.</div>
                    ) : (
                        <div className="space-y-2 animate-in fade-in duration-500">
                            {leaderboard.map((emp) => {
                                const isMe = myStats && emp._id === myStats._id;

                                return (
                                    <div key={emp._id} className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all duration-300 ${isMe ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-card border-border/80 hover:border-primary/20'}`}>
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-black text-muted-foreground bg-muted shrink-0">
                                                #{emp.currentWeeklyRank}
                                            </div>
                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${isMe ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-400 dark:bg-slate-600'}`}>
                                                {emp.name[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm truncate flex items-center gap-2 ${isMe ? 'text-primary' : 'text-foreground'}`}>
                                                    {emp.name} {isMe && <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold truncate">{emp.zone || "Unassigned"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0 pl-2">
                                            <span className={`px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider border ${getZoneStyles(emp.colorZone)}`}>
                                                {emp.currentWeeklyScore} <span className="hidden sm:inline">PTS</span>
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

        </div>
    );
};

export default EmployeeLeaderBoard;