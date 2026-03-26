import { useState, useEffect, useMemo } from "react";
import {
    ChevronRight, ArrowLeft, TrendingUp, Search,
    CheckCircle2, AlertCircle, XCircle, Star, Coffee, Film, CalendarDays,
    Clock, FileText, School, Download, Trophy, LogOut, Users, FolderOpen, CalendarOff
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios";

const ProgressReport = () => {
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

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const res = await api.get('/admin/progress/employees');
                if (res.data.success) setTeachers(res.data.data);
            } catch (error) {
                toast.error("Failed to load progress rankings.");
            } finally {
                setIsLoadingTeachers(false);
            }
        };
        fetchTeachers();
    }, []);

    const handleSelectTeacher = async (teacher) => {
        setSelectedTeacher(teacher);
        setIsLoadingRecords(true);
        try {
            const res = await api.get(`/admin/progress/${teacher._id}/records`);
            if (res.data.success) {
                setRecords(res.data.data);
            }
        } catch (error) {
            toast.error("Failed to fetch teacher records.");
            setSelectedTeacher(null);
        } finally {
            setIsLoadingRecords(false);
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
        const toastId = toast.loading("Preparing Excel report...");

        try {
            const response = await api.get(`/admin/progress/${selectedTeacher._id}/export/${selectedMonth}`, {
                responseType: 'blob'
            });

            // Handle custom Axios setups where response.data might be extracted automatically
            const fileData = response.data || response;

            // Check if the backend sent a JSON error message instead of a file
            if (fileData.type === 'application/json') {
                const text = await fileData.text();
                const json = JSON.parse(text);
                throw new Error(json.message || "Failed to generate report.");
            }

            // Create the Blob
            const blob = new Blob([fileData], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Create a temporary URL
            const url = window.URL.createObjectURL(blob);

            // THE FIX: Create an ANCHOR tag ('a'), not a 'link' tag
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.style.display = 'none';

            const safeName = selectedTeacher.name.replace(/[^a-z0-9]/gi, '_');
            anchor.setAttribute('download', `${safeName}_${selectedMonth}_Report.xlsx`);

            // Append, Click, and Cleanup
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);

            toast.success("Excel report downloaded!", { id: toastId });
        } catch (err) {
            console.error("Export error:", err);

            if (err.response && err.response.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    toast.error(json.message || "Could not export file.", { id: toastId });
                } catch {
                    toast.error("Could not export file.", { id: toastId });
                }
            } else {
                toast.error(err.message || "Could not export file.", { id: toastId });
            }
        }
    };

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            <div className="mb-6 sm:mb-8 flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Progress Reports</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">Monthly WorkEduMusic activity metrics.</p>
                </div>
            </div>

            {(selectedTeacher || selectedMonth) && (
                <button
                    onClick={handleBackNavigation}
                    className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground hover:text-primary mb-5 sm:mb-6 text-xs sm:text-sm font-semibold transition-colors duration-200 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="truncate">
                        {selectedDay ? "Back to Overview" : selectedCategory ? `Back to ${selectedSchool.schoolName}` : selectedSchool ? `Back to Months` : "Back to Rankings"}
                    </span>
                </button>
            )}

            <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col min-h-100 transition-all duration-300">
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between gap-3 sm:gap-4">
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                        {!selectedTeacher ? "WorkEduMusic Rankings" : !selectedMonth ? `${selectedTeacher.name}'s Reports` : formatMonth(selectedMonth)}
                    </h3>
                    {selectedMonth && !selectedSchool && (
                        <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-1.5 border-primary/20 text-primary font-bold hover:bg-primary hover:text-primary-foreground h-8 sm:h-9 px-3 shrink-0">
                            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export Excel</span>
                        </Button>
                    )}
                </div>

                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-background/50 relative overflow-hidden">
                    {/* LEVEL 1: LIST */}
                    {!selectedTeacher && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative mb-4 sm:mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Search teacher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-11 bg-card border-border/60 focus-visible:ring-primary/30 rounded-xl shadow-sm text-sm" />
                            </div>
                            {isLoadingTeachers ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, idx) => (
                                        <div key={idx} className="h-16 bg-card border border-border/80 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredTeachers.map((t, idx) => (
                                        <div key={t._id} onClick={() => handleSelectTeacher(t)} className="flex items-center justify-between p-3 sm:p-4 bg-card border border-border/80 rounded-xl hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-300 group">
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground w-4">#{idx + 1}</span>
                                                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full gradient-primary flex items-center justify-center text-white font-bold">{t.name[0]}</div>
                                                <div>
                                                    <p className="font-bold text-sm text-foreground group-hover:text-primary">{t.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t.zone || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 rounded-md">
                                                    <Trophy className="w-3 h-3" /> {t.score}/100
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary ml-3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 2: MONTHS */}
                    {selectedTeacher && !selectedMonth && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
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
                    )}

                    {/* LEVEL 3: SCHOOLS & GENERAL LEAVES */}
                    {selectedMonth && !selectedSchool && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-8 duration-300">
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
                                <div onClick={() => setSelectedSchool({ _id: 'LEAVES_GENERAL', schoolName: 'General Leaves' })} className="p-4 border border-cyan-500/30 rounded-xl flex items-center justify-between hover:bg-cyan-500/5 hover:border-cyan-500/60 hover:shadow-md cursor-pointer bg-cyan-500/5 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                                            <FolderOpen className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-foreground text-sm sm:text-base">General Leaves</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-cyan-500" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 4: CATEGORIES OR "LEAVES FOLDER" */}
                    {selectedSchool && !selectedCategory && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            {selectedSchool._id !== 'LEAVES_GENERAL' ? (
                                categoriesData.map(c => (
                                    <div key={c.name} onClick={() => c.count > 0 && setSelectedCategory(c.name)} className={`p-6 md:p-8 border border-border/80 rounded-2xl text-center flex flex-col items-center transition-all bg-card ${c.count > 0 ? 'hover:bg-muted/20 hover:border-violet-500/40 hover:shadow-md hover:-translate-y-1 cursor-pointer group' : 'opacity-50 grayscale cursor-not-allowed'}`}>
                                        <div className={`p-3 rounded-2xl mb-4 transition-colors ${c.count > 0 ? 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Users className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-base text-foreground mb-1">{c.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2.5 py-1 rounded-full">{c.count} records</p>
                                    </div>
                                ))
                            ) : (
                                <div onClick={() => setSelectedCategory('LEAVES_DETAIL')} className="p-6 md:p-8 border border-cyan-500/30 rounded-2xl text-center flex flex-col items-center transition-all bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
                                    <div className="p-3 rounded-2xl mb-4 transition-colors bg-cyan-500/20 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white">
                                        <CalendarOff className="w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-base text-foreground mb-1">Approved Leaves</p>
                                    <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest bg-cyan-500/20 px-2.5 py-1 rounded-full">
                                        {leavesData.length} {leavesData.length === 1 ? 'Request' : 'Requests'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 5: OVERVIEW / DAILY / LEAVE RECORDS */}
                    {selectedCategory && !selectedDay && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
                            {selectedCategory !== 'LEAVES_DETAIL' ? (
                                <>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Summary Metrics</h4>
                                        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-emerald-500/5 border-emerald-500/30">
                                                <CheckCircle2 className="w-4 h-4 mb-1.5 text-emerald-500" />
                                                <span className="text-2xl font-black mb-1 text-emerald-500">{activeCategoryInfo.stats.present}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 opacity-80">Present</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-amber-500/5 border-amber-500/30">
                                                <AlertCircle className="w-4 h-4 mb-1.5 text-amber-500" />
                                                <span className="text-2xl font-black mb-1 text-amber-500">{activeCategoryInfo.stats.late}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 opacity-80">Late</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-destructive/5 border-destructive/30">
                                                <XCircle className="w-4 h-4 mb-1.5 text-destructive" />
                                                <span className="text-2xl font-black mb-1 text-destructive">{activeCategoryInfo.stats.absent}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-destructive opacity-80">Absent</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-violet-500/5 border-violet-500/30">
                                                <Star className="w-4 h-4 mb-1.5 text-violet-500" />
                                                <span className="text-2xl font-black mb-1 text-violet-500">{activeCategoryInfo.stats.events}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 opacity-80">Events</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-slate-400/5 border-slate-400/30">
                                                <Coffee className="w-4 h-4 mb-1.5 text-slate-400" />
                                                <span className="text-2xl font-black mb-1 text-slate-400">{activeCategoryInfo.stats.holidays}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 opacity-80">Holidays</span>
                                            </div>
                                            <div className="p-3 rounded-xl border flex flex-col items-center justify-center shadow-sm bg-blue-500/5 border-blue-500/30">
                                                <Film className="w-4 h-4 mb-1.5 text-blue-500" />
                                                <span className="text-2xl font-black mb-1 text-blue-500">{activeCategoryInfo.stats.mediaSent}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 opacity-80">Media</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Daily Breakdown</h4>
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
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-cyan-600 mb-4 flex items-center gap-2">
                                        <CalendarOff className="w-4 h-4" /> Official Leave Records
                                    </h4>
                                    <div className="space-y-4">
                                        {leavesData.map(leave => (
                                            <div key={leave._id} className="p-5 border border-cyan-500/20 bg-cyan-500/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-background px-3 py-1.5 rounded-lg border border-border">
                                                        <CalendarDays className="w-4 h-4 text-cyan-600" />
                                                        {new Date(leave.fromDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                                        {leave.fromDate !== leave.toDate && (
                                                            <>
                                                                <span className="text-muted-foreground mx-1 text-xs">to</span>
                                                                {new Date(leave.toDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-cyan-500 text-white rounded font-bold uppercase text-[10px] tracking-wider">Approved Leave</span>
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Reason Provided</p>
                                                        <p className="text-sm italic text-muted-foreground bg-background p-3 rounded-xl border border-border mt-1">"{leave.reason}"</p>
                                                    </div>

                                                    {leave.adminRemarks && (
                                                        <div className="border-t border-dashed border-cyan-500/30 pt-3">
                                                            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-1">Admin Approval Note</p>
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

                    {/* LEVEL 6: DETAIL (Daily Reports) */}
                    {selectedDay && (
                        <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="bg-card rounded-2xl p-6 sm:p-8 text-center border border-border/80 shadow-sm relative overflow-hidden group">
                                <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                <h2 className="text-xl sm:text-2xl font-bold mt-4 mb-5 text-foreground">{formatFullDate(selectedDay.date)}</h2>
                                <div className="flex justify-center gap-4">
                                    <div className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                                        In: {formatTime(selectedDay.checkInTime) || '--:--'}
                                    </div>
                                    <div className="text-xs font-bold text-rose-600 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">
                                        Out: {formatTime(selectedDay.checkOutTime) || '--:--'}
                                    </div>
                                </div>
                            </div>
                            {(selectedDay.teacherNote || selectedDay.lateReason) && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest"><FileText className="w-3.5 h-3.5 inline mr-1" /> Exception Note</p>
                                    <div className="p-4 bg-muted/30 border border-border/80 rounded-2xl text-sm italic text-muted-foreground">"{selectedDay.teacherNote || selectedDay.lateReason}"</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgressReport;