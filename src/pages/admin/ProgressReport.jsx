import { useState, useEffect, useMemo } from "react";
import {
    ChevronRight, ArrowLeft, TrendingUp, Search,
    CheckCircle2, AlertCircle, XCircle, Star, Coffee, Film, CalendarDays,
    Clock, FileText, School, Download, Trophy, Users, FolderOpen, CalendarOff,
    BarChart3, Loader2, Eye, X // <-- Added Eye and X icons
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const ProgressReport = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const [teachers, setTeachers] = useState([]);
    const [records, setRecords] = useState([]);
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Graph States
    const [showGraph, setShowGraph] = useState(false);
    const [graphData, setGraphData] = useState([]);
    const [isLoadingGraph, setIsLoadingGraph] = useState(false);

    // Preview Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const fetchTeachers = async () => {
        try {
            const res = await api.get('/admin/progress/employees');
            if (res.data.success) {
                setTeachers(res.data.data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            toast.error(t('progress_report.toasts.load_error'));
        } finally {
            setIsLoadingTeachers(false);
        }
    };

    useEffect(() => {
        fetchTeachers();

        if (!user) return;
        const currentUserId = user.id || user._id;

        const joinUserRoom = () => {
            socket.emit("join_room", currentUserId);
        };

        if (socket.connected) joinUserRoom();
        socket.on("connect", joinUserRoom);

        const handleRefresh = () => {
            try {
                const audio = new Audio('/sounds/notification-ting.mp3');
                audio.play().catch(() => { });
                fetchTeachers();
            } catch (e) { }

            toast.success("Progress scores updated in real-time!", { icon: '📊' });
            fetchTeachers();
        };

        socket.on('admin_leaderboard_refresh', handleRefresh);

        return () => {
            socket.off("connect", joinUserRoom);
            socket.off('admin_leaderboard_refresh', handleRefresh);
        };
    }, [t, user]);

    const formatUpdateTime = (date) => {
        if (!date) return "";
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

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

    const handleSelectTeacher = async (teacher) => {
        setSelectedTeacher(teacher);
        setIsLoadingRecords(true);
        setShowGraph(false);
        try {
            const res = await api.get(`/admin/progress/${teacher._id}/records`);
            if (res.data.success) {
                setRecords(res.data.data);
            }
        } catch (error) {
            toast.error(t('progress_report.toasts.fetch_records_error'));
            setSelectedTeacher(null);
        } finally {
            setIsLoadingRecords(false);
        }
    };

    const handleToggleGraph = async () => {
        if (showGraph) {
            setShowGraph(false);
            return;
        }

        setShowGraph(true);
        setIsLoadingGraph(true);
        try {
            const res = await api.get(`/admin/progress/${selectedTeacher._id}/graph?month=${selectedMonth}`);
            if (res.data.success) {
                setGraphData(res.data.data);
            }
        } catch (error) {
            toast.error("Failed to load graph data");
            setShowGraph(false);
        } finally {
            setIsLoadingGraph(false);
        }
    };

    const monthsAvailable = useMemo(() => {
        if (!records || records.length === 0) return [];
        const months = new Set();
        records.forEach(r => {
            if (r.date && typeof r.date === 'string') {
                months.add(r.date.substring(0, 7));
            }
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [records]);

    // Data for the Preview Sheet
    const previewRecords = useMemo(() => {
        if (!records || !selectedMonth) return [];
        return records.filter(r => r.date && typeof r.date === 'string' && r.date.startsWith(selectedMonth))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [records, selectedMonth]);

    const schoolsInMonth = useMemo(() => {
        if (!selectedMonth || !records) return { schools: [], hasLeaves: false };
        const monthRecords = records.filter(r => typeof r.date === 'string' && r.date.startsWith(selectedMonth));

        let hasLeaves = false;
        const schoolsMap = new Map();

        monthRecords.forEach(r => {
            if (r.type === 'leave') {
                hasLeaves = true;
            } else if (r.school && r.school._id) {
                schoolsMap.set(r.school._id.toString(), r.school);
            }
        });

        return {
            schools: Array.from(schoolsMap.values()),
            hasLeaves
        };
    }, [records, selectedMonth]);

    const categoriesData = useMemo(() => {
        if (!selectedMonth || !selectedSchool || selectedSchool._id === 'LEAVES_GENERAL') return [];
        const relevantRecords = records.filter(r =>
            r.date.startsWith(selectedMonth) && r.school?._id === selectedSchool._id && r.type !== 'leave'
        );

        const getStats = (band) => {
            const bandRecords = relevantRecords.filter(r => r.band === band);
            const stats = { present: 0, late: 0, absent: 0, events: 0, holidays: 0, mediaSent: 0 };
            bandRecords.forEach(r => {
                if (r.status === 'Present') stats.present++;
                if (r.status === 'Late') stats.late++;
                if (r.status === 'Absent') stats.absent++;
                if (r.status === 'Event') stats.events++;
                if (r.status === 'Holiday') stats.holidays++;
                stats.mediaSent += (r.mediaFilesCount || 0);
            });
            return { name: band, count: bandRecords.length, stats, records: bandRecords };
        };
        return [getStats("Junior Band"), getStats("Senior Band")];
    }, [records, selectedMonth, selectedSchool]);

    const leavesData = useMemo(() => {
        if (!selectedMonth) return [];
        return records.filter(r => r.type === 'leave' && r.date.startsWith(selectedMonth));
    }, [records, selectedMonth]);

    const activeCategoryInfo = useMemo(() => {
        return categoriesData.find(c => c.name === selectedCategory) || null;
    }, [categoriesData, selectedCategory]);

    const handleBackNavigation = () => {
        if (selectedDay) setSelectedDay(null);
        else if (selectedCategory) setSelectedCategory(null);
        else if (selectedSchool) setSelectedSchool(null);
        else if (showGraph) setShowGraph(false);
        else if (selectedMonth) setSelectedMonth(null);
        else if (selectedTeacher) { setSelectedTeacher(null); setRecords([]); }
    };

    const formatMonth = (yyyy_mm) => {
        if (!yyyy_mm) return "";
        const [year, month] = yyyy_mm.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const formatFullDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()} (${date.toLocaleString('default', { weekday: 'short' })})`;
    };

    const formatTime = (timeString) => {
        if (!timeString) return null;
        return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            Late: 'bg-warning/10 text-warning border-warning/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Event: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
            Holiday: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        };
        return `px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.Holiday}`;
    };

    const handleExportExcel = async () => {
        if (!selectedMonth || !selectedTeacher) return;
        const toastId = toast.loading(t('progress_report.toasts.export_preparing'));
        try {
            const response = await api.get(`/admin/progress/${selectedTeacher._id}/export/${selectedMonth}`, {
                responseType: 'blob'
            });
            const fileData = response.data || response;
            if (fileData.type === 'application/json') {
                const text = await fileData.text();
                const json = JSON.parse(text);
                throw new Error(json.message || t('progress_report.toasts.export_gen_error'));
            }
            const blob = new Blob([fileData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            const safeName = selectedTeacher.name.replace(/[^a-z0-9]/gi, '_');
            anchor.setAttribute('download', `${safeName}_${selectedMonth}_Report.xlsx`);
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);
            toast.success(t('progress_report.toasts.export_success'), { id: toastId });
        } catch (err) {
            toast.error(err.message || t('progress_report.toasts.export_fail'), { id: toastId });
        }
    };

    const filteredTeachers = teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20 relative">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{t('progress_report.title')}</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm truncate">{t('progress_report.subtitle')}</p>
                    </div>
                </div>

                {lastUpdated && !selectedTeacher && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-full self-start sm:self-center animate-in fade-in slide-in-from-right-4 duration-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> Updated: {formatUpdateTime(lastUpdated)}
                        </span>
                    </div>
                )}
            </div>

            {(selectedTeacher || selectedMonth) && (
                <button
                    onClick={handleBackNavigation}
                    className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground hover:text-primary mb-5 sm:mb-6 text-xs sm:text-sm font-semibold transition-colors duration-200 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="truncate">
                        {showGraph ? "Back to Month Overview"
                            : selectedDay ? t('progress_report.nav.back_overview')
                                : selectedCategory ? t('progress_report.nav.back_school', { name: selectedSchool.schoolName })
                                    : selectedSchool ? t('progress_report.nav.back_months')
                                        : t('progress_report.nav.back_rankings')}
                    </span>
                </button>
            )}

            <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col min-h-100 transition-all duration-300">
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                        {!selectedTeacher ? t('progress_report.headers.rankings')
                            : !selectedMonth ? t('progress_report.headers.teacher_reports', { name: selectedTeacher.name })
                                : formatMonth(selectedMonth)}
                    </h3>

                    {selectedMonth && !selectedSchool && (
                        <div className="flex flex-wrap gap-2">
                            {/* VIEW PREVIEW BUTTON */}
                            <Button
                                onClick={() => setShowPreviewModal(true)}
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-teal-500/20 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500 hover:text-white h-8 sm:h-9 px-3 shrink-0 transition-colors"
                            >
                                <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preview Sheet</span>
                            </Button>

                            <Button
                                onClick={handleToggleGraph}
                                variant={showGraph ? "default" : "outline"}
                                size="sm"
                                className={`gap-1.5 h-8 sm:h-9 px-3 shrink-0 transition-all ${!showGraph && 'border-violet-500/20 text-violet-500 font-bold hover:bg-violet-500 hover:text-white'}`}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{showGraph ? 'Close Graph' : 'View Graph'}</span>
                            </Button>

                            <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-1.5 border-primary/20 text-primary font-bold hover:bg-primary hover:text-primary-foreground h-8 sm:h-9 px-3 shrink-0">
                                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('progress_report.btn.export')}</span>
                            </Button>
                        </div>
                    )}
                </div>

                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-background/50 relative overflow-hidden">
                    {/* ... (Existing List Content remains exactly the same) ... */}
                    {!selectedTeacher && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative mb-4 sm:mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder={t('progress_report.search_placeholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-11 bg-card border-border/60 focus-visible:ring-primary/30 rounded-xl shadow-sm text-sm" />
                            </div>
                            {isLoadingTeachers ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, idx) => (
                                        <div key={idx} className="h-16 bg-card border border-border/80 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredTeachers.map((teacher, idx) => (
                                        <div key={teacher._id} onClick={() => handleSelectTeacher(teacher)} className="flex items-center justify-between p-3 sm:p-4 bg-card border border-border/80 rounded-xl hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-300 group">

                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
                                                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground w-4 shrink-0">#{idx + 1}</span>
                                                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full gradient-primary flex items-center justify-center text-white font-bold shrink-0 overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                    {teacher.profilePicture && typeof teacher.profilePicture === 'string' && teacher.profilePicture.startsWith('http') ? (
                                                        <img
                                                            src={teacher.profilePicture}
                                                            alt={teacher.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        teacher.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-foreground group-hover:text-primary truncate" title={teacher.name}>{teacher.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold truncate" title={teacher.zone || t('progress_report.unassigned')}>{teacher.zone || t('progress_report.unassigned')}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center shrink-0">
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getZoneStyles(teacher.colorZone)}`}>
                                                    <Trophy className="w-3 h-3 inline mr-1 mb-0.5" />
                                                    {teacher.currentWeeklyScore || 0} PTS
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary ml-2 sm:ml-3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTeacher && !selectedMonth && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            {isLoadingRecords ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                                    <span className="font-semibold">Loading records...</span>
                                </div>
                            ) : monthsAvailable.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {monthsAvailable.map(m => (
                                        <div key={m} onClick={() => setSelectedMonth(m)} className="p-4 sm:p-5 border border-border/80 rounded-xl flex items-center justify-between hover:bg-muted/30 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all group bg-card">
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                                    <CalendarDays className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-sm sm:text-base text-foreground">{formatMonth(m)}</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 py-16 text-center border border-border/80 rounded-2xl flex flex-col items-center bg-card shadow-sm">
                                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-8 h-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-1">No Records Found</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        There are no progress reports available for {selectedTeacher.name} at this time.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedMonth && !selectedSchool && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            {showGraph ? (
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-violet-600 flex items-center gap-2 mb-2">
                                        <BarChart3 className="w-4 h-4" /> Weekly Performance Trend
                                    </h4>

                                    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-sm h-75 min-h-75 w-full min-w-full relative">
                                        {isLoadingGraph ? (
                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground animate-pulse font-medium">Loading chart data...</div>
                                        ) : graphData.length === 0 ? (
                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm font-medium">No weekly data recorded for this month.</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                    <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                                                    <Tooltip
                                                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="score"
                                                        stroke="#6366f1"
                                                        strokeWidth={3}
                                                        dot={(props) => {
                                                            const { cx, cy, value, key } = props;
                                                            return <circle key={key} cx={cx} cy={cy} r={5} fill={getChartColor(value)} stroke="#fff" strokeWidth={2} />;
                                                        }}
                                                        activeDot={{ r: 7, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Excellent (70+)</span>
                                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Average (50-69)</span>
                                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive"></div> Poor (&lt;50)</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {schoolsInMonth.schools.map(s => (
                                        <div key={s._id} onClick={() => setSelectedSchool(s)} className="p-4 border border-border/80 rounded-xl flex items-center justify-between hover:bg-muted/30 hover:border-indigo-500/40 hover:shadow-md cursor-pointer bg-card transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                    <School className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-foreground text-sm sm:text-base">{s.schoolName}</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-indigo-500" />
                                        </div>
                                    ))}
                                    {schoolsInMonth.hasLeaves && (
                                        <div onClick={() => setSelectedSchool({ _id: 'LEAVES_GENERAL', schoolName: t('progress_report.general_leaves') })} className="p-4 border border-cyan-500/30 rounded-xl flex items-center justify-between hover:bg-cyan-500/5 hover:border-cyan-500/60 hover:shadow-md cursor-pointer bg-cyan-500/5 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                                                    <FolderOpen className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-foreground text-sm sm:text-base">{t('progress_report.general_leaves')}</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-cyan-500" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedSchool && !selectedCategory && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            {selectedSchool._id !== 'LEAVES_GENERAL' ? (
                                categoriesData.map(c => (
                                    <div key={c.name} onClick={() => c.count > 0 && setSelectedCategory(c.name)} className={`p-6 md:p-8 border border-border/80 rounded-2xl text-center flex flex-col items-center transition-all bg-card ${c.count > 0 ? 'hover:bg-muted/20 hover:border-violet-500/40 hover:shadow-md hover:-translate-y-1 cursor-pointer group' : 'opacity-50 grayscale cursor-not-allowed'}`}>
                                        <div className={`p-3 rounded-2xl mb-4 transition-colors ${c.count > 0 ? 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Users className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-base text-foreground mb-1">{c.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2.5 py-1 rounded-full">{t('progress_report.records_count', { count: c.count })}</p>
                                    </div>
                                ))
                            ) : (
                                <div onClick={() => setSelectedCategory('LEAVES_DETAIL')} className="p-6 md:p-8 border border-cyan-500/30 rounded-2xl text-center flex flex-col items-center transition-all bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
                                    <div className="p-3 rounded-2xl mb-4 transition-colors bg-cyan-500/20 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white">
                                        <CalendarOff className="w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-base text-foreground mb-1">{t('progress_report.approved_leaves')}</p>
                                    <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest bg-cyan-500/20 px-2.5 py-1 rounded-full">{t('progress_report.request_count', { count: leavesData.length })}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCategory && !selectedDay && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
                            {selectedCategory !== 'LEAVES_DETAIL' ? (
                                <>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">{t('progress_report.metrics.title')}</h4>
                                        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-emerald-500/5 border-emerald-500/30">
                                                <CheckCircle2 className="w-4 h-4 mb-1.5 text-emerald-500" />
                                                <span className="text-2xl font-black mb-1 text-emerald-500">{activeCategoryInfo.stats.present}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 opacity-80">{t('progress_report.metrics.present')}</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-amber-500/5 border-amber-500/30">
                                                <AlertCircle className="w-4 h-4 mb-1.5 text-amber-500" />
                                                <span className="text-2xl font-black mb-1 text-amber-500">{activeCategoryInfo.stats.late}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 opacity-80">{t('progress_report.metrics.late')}</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-destructive/5 border-destructive/30">
                                                <XCircle className="w-4 h-4 mb-1.5 text-destructive" />
                                                <span className="text-2xl font-black mb-1 text-destructive">{activeCategoryInfo.stats.absent}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-destructive opacity-80">{t('progress_report.metrics.absent')}</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-violet-500/5 border-violet-500/30">
                                                <Star className="w-4 h-4 mb-1.5 text-violet-500" />
                                                <span className="text-2xl font-black mb-1 text-violet-500">{activeCategoryInfo.stats.events}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 opacity-80">{t('progress_report.metrics.events')}</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-slate-400/5 border-slate-400/30">
                                                <Coffee className="w-4 h-4 mb-1.5 text-slate-400" />
                                                <span className="text-2xl font-black mb-1 text-slate-400">{activeCategoryInfo.stats.holidays}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 opacity-80">{t('progress_report.metrics.holidays')}</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-blue-500/5 border-blue-500/30">
                                                <Film className="w-4 h-4 mb-1.5 text-blue-500" />
                                                <span className="text-2xl font-black mb-1 text-blue-500">{activeCategoryInfo.stats.mediaSent}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 opacity-80">{t('progress_report.metrics.media')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">{t('progress_report.breakdown.title')}</h4>
                                        <div className="space-y-3">
                                            {activeCategoryInfo.records.map(r => (
                                                <div key={r._id} onClick={() => setSelectedDay(r)} className="p-4 border border-border/80 rounded-2xl flex items-center justify-between hover:bg-muted/30 hover:border-primary/30 hover:shadow-sm cursor-pointer bg-card transition-all group">
                                                    <div className="flex sm:items-center gap-1 sm:gap-4">
                                                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{formatFullDate(r.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0 pl-2">
                                                        {r.mediaFilesCount > 0 && <Film className="w-4 h-4 text-blue-500 opacity-80 group-hover:opacity-100" />}
                                                        <span className={getStatusBadge(r.status)}>{r.status}</span>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-all hidden sm:block" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-cyan-600 mb-4 flex items-center gap-2"><CalendarOff className="w-4 h-4" /> {t('progress_report.breakdown.leaves_title')}</h4>
                                    <div className="space-y-4">
                                        {leavesData.map(leave => (
                                            <div key={leave._id} className="p-5 border border-cyan-500/20 bg-cyan-500/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-background px-3 py-1.5 rounded-lg border border-border">
                                                        <CalendarDays className="w-4 h-4 text-cyan-600" />
                                                        {new Date(leave.fromDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                                        {leave.fromDate !== leave.toDate && (
                                                            <><span className="text-muted-foreground mx-1 text-xs">to</span>{new Date(leave.toDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</>
                                                        )}
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-cyan-500 text-white rounded font-bold uppercase text-[10px] tracking-wider">{t('progress_report.breakdown.approved_tag')}</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {t('progress_report.breakdown.reason_provided')}</p>
                                                        <p className="text-sm italic text-muted-foreground bg-background p-3 rounded-xl border border-border mt-1">"{leave.reason}"</p>
                                                    </div>
                                                    {leave.adminRemarks && (
                                                        <div className="border-t border-dashed border-cyan-500/30 pt-3">
                                                            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-1">{t('progress_report.breakdown.admin_note')}</p>
                                                            <p className="text-xs text-cyan-800 font-medium">"{leave.adminRemarks}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedDay && (
                        <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="bg-card rounded-2xl p-6 sm:p-8 text-center border border-border/80 shadow-sm relative overflow-hidden group">
                                <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                <h2 className="text-xl sm:text-2xl font-bold mt-4 mb-5 text-foreground">{formatFullDate(selectedDay.date)}</h2>
                                <div className="flex justify-center gap-4">
                                    <div className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">{t('progress_report.detail.in')}: {formatTime(selectedDay.checkInTime) || '--:--'}</div>
                                    <div className="text-xs font-bold text-rose-600 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">{t('progress_report.detail.out')}: {formatTime(selectedDay.checkOutTime) || '--:--'}</div>
                                </div>
                            </div>
                            {(selectedDay.teacherNote || selectedDay.lateReason) && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest"><FileText className="w-3.5 h-3.5 inline mr-1" /> {t('progress_report.detail.exception_note')}</p>
                                    <div className="p-4 bg-muted/30 border border-border/80 rounded-2xl text-sm italic text-muted-foreground">"{selectedDay.teacherNote || selectedDay.lateReason}"</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* PREVIEW SHEET MODAL */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-5xl h-[80vh] rounded-4xl flex flex-col shadow-2xl border border-border overflow-hidden transform transition-all">
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <div>
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-teal-500" />
                                    Data Preview
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                                    {selectedTeacher?.name} • {formatMonth(selectedMonth)}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPreviewModal(false)}
                                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-auto p-0 flex-1 custom-scrollbar bg-card">
                            {previewRecords.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground font-medium">
                                    No records available for preview.
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-xs uppercase text-muted-foreground sticky top-0 z-20">
                                        <tr>
                                            <th className="px-6 py-4 font-bold tracking-wider bg-card border-b border-border">Date</th>
                                            <th className="px-6 py-4 font-bold tracking-wider bg-card border-b border-border">Location / School</th>
                                            <th className="px-6 py-4 font-bold tracking-wider bg-card border-b border-border">Category</th>
                                            <th className="px-6 py-4 font-bold tracking-wider bg-card border-b border-border">Status</th>
                                            <th className="px-6 py-4 font-bold tracking-wider bg-card border-b border-border">Check-In</th>
                                            <th className="px-6 py-4 font-bold tracking-wider bg-card border-b border-border">Check-Out</th>
                                            <th className="px-6 py-4 font-bold tracking-wider bg-card border-b border-border">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {previewRecords.map((record, index) => (
                                            <tr key={index} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-6 py-3 font-medium text-foreground">{formatFullDate(record.date)}</td>
                                                <td className="px-6 py-3 font-semibold text-primary">{record.type === 'leave' ? 'LEAVE' : (record.school?.schoolName || "-")}</td>
                                                <td className="px-6 py-3 text-muted-foreground">{record.type === 'leave' ? '-' : (record.band || "-")}</td>
                                                <td className="px-6 py-3">
                                                    <span className={record.type === 'leave' ? getStatusBadge('On Leave') : getStatusBadge(record.status)}>
                                                        {record.type === 'leave' ? 'ON LEAVE' : record.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 font-medium">{formatTime(record.checkInTime) || "-"}</td>
                                                <td className="px-6 py-3 font-medium">{formatTime(record.checkOutTime) || "-"}</td>
                                                <td className="px-6 py-3 text-muted-foreground italic max-w-50 truncate" title={record.teacherNote || record.lateReason || record.eventNote || record.reason || ""}>
                                                    {record.teacherNote || record.lateReason || record.eventNote || record.reason || "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgressReport;