import { useState, useEffect, useMemo } from "react";
import {
    ChevronRight, ArrowLeft, TrendingUp, Search,
    CheckCircle2, AlertCircle, XCircle, Star, Coffee, Film, CalendarDays,
    Clock, FileText, MessageSquareDashed, School, Download, Trophy, LogOut, ClipboardCheck, Users, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "../../api/axios";
import * as XLSX from 'xlsx-js-style';

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

    // --- UPDATED GROUPING LOGIC (DB String Safe) ---
    const monthsAvailable = useMemo(() => {
        if (!records || records.length === 0) return [];
        const months = new Set();
        records.forEach(r => {
            if (r.date && typeof r.date === 'string') {
                months.add(r.date.substring(0, 7)); // Extracts "2026-03"
            }
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [records]);

    const schoolsInMonth = useMemo(() => {
        if (!selectedMonth || !records) return [];
        const monthRecords = records.filter(r =>
            typeof r.date === 'string' && r.date.startsWith(selectedMonth)
        );
        const schoolsMap = new Map();
        monthRecords.forEach(r => {
            if (r.school && r.school._id) schoolsMap.set(r.school._id.toString(), r.school);
        });
        return Array.from(schoolsMap.values());
    }, [records, selectedMonth]);

    const categoriesData = useMemo(() => {
        if (!selectedMonth || !selectedSchool) return [];
        const relevantRecords = records.filter(r =>
            r.date.startsWith(selectedMonth) && r.school?._id === selectedSchool._id
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
                stats.mediaSent += (r.mediaFilesCount || 0); // Use file count
            });
            return { name: band, count: bandRecords.length, stats, records: bandRecords };
        };
        return [getStats("Junior Band"), getStats("Senior Band")];
    }, [records, selectedMonth, selectedSchool]);

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

    // --- STYLED EXPORT LOGIC ---
    const handleExportExcel = async () => {
        if (!selectedMonth || !selectedTeacher) return;
        const toastId = toast.loading("Preparing Excel report...");

        try {
            const response = await api.get(`/admin/progress/${selectedTeacher._id}/export/${selectedMonth}`, {
                responseType: 'blob'
            });

            if (response.data.type === 'application/json') {
                const text = await response.data.text();
                const json = JSON.parse(text);
                throw new Error(json.message || "Failed to generate report.");
            }

            const arrayBuffer = await response.data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const headerColors = [
                "2563EB", "0D9488", "4F46E5", "7C3AED", "DB2777", "D97706", "059669", "DC2626", "475569"
            ];

            if (worksheet['!ref']) {
                const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
                for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                    const headerAddress = XLSX.utils.encode_col(C) + "1";
                    if (!worksheet[headerAddress]) continue;

                    const bgColor = headerColors[C % headerColors.length];

                    worksheet[headerAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: bgColor } },
                        alignment: { horizontal: "center", vertical: "center" },
                        border: {
                            top: { style: "thin", color: { auto: 1 } },
                            bottom: { style: "thin", color: { auto: 1 } },
                            left: { style: "thin", color: { auto: 1 } },
                            right: { style: "thin", color: { auto: 1 } }
                        }
                    };
                }
            }

            const safeName = selectedTeacher.name.replace(/[^a-z0-9]/gi, '_');
            const fileName = `${safeName}_${selectedMonth}_Report.xlsx`;

            XLSX.writeFile(workbook, fileName);
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
            {/* Header */}
            <div className="mb-6 sm:mb-8 flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Progress Reports</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">Monthly workforce activity metrics.</p>
                </div>
            </div>

            {/* Breadcrumb */}
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
                {/* Dynamic Title Bar */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between gap-3 sm:gap-4">
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                        {!selectedTeacher ? "Workforce Rankings" : !selectedMonth ? `${selectedTeacher.name}'s Reports` : formatMonth(selectedMonth)}
                    </h3>
                    {selectedMonth && !selectedSchool && (
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            size="sm"
                            className="gap-1.5 sm:gap-2 border-primary/20 text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300 h-8 sm:h-9 px-2.5 sm:px-4 shrink-0"
                        >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Export Excel</span>
                            <span className="sm:hidden">Export</span>
                        </Button>
                    )}
                </div>

                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-background/50 relative overflow-hidden">
                    {/* LEVEL 1: LIST */}
                    {!selectedTeacher && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative mb-4 sm:mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search teacher..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 h-11 sm:h-12 bg-card border-border/60 focus-visible:ring-primary/30 rounded-xl shadow-sm text-sm"
                                />
                            </div>
                            {isLoadingTeachers ? (
                                <div className="py-12 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-2.5 sm:space-y-3">
                                    {filteredTeachers.map((t, idx) => (
                                        <div
                                            key={t._id}
                                            onClick={() => handleSelectTeacher(t)}
                                            className="flex items-center justify-between p-3 sm:p-4 bg-card border border-border/80 rounded-xl sm:rounded-2xl hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-300 active:scale-[0.99] group"
                                        >
                                            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                                                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground w-4 sm:w-6 shrink-0">#{idx + 1}</span>
                                                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full gradient-primary flex items-center justify-center text-white font-bold shadow-inner shrink-0 text-sm sm:text-base">
                                                    {t.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">{t.name}</p>
                                                    <p className="text-[9px] sm:text-[11px] text-muted-foreground uppercase font-semibold mt-0.5 truncate">{t.zone || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center shrink-0 pl-2">
                                                <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-emerald-500/10 rounded-md">
                                                    <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {t.score}/100
                                                </span>
                                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 ml-1.5 sm:ml-3" />
                                            </div>
                                        </div>
                                    ))}
                                    {filteredTeachers.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground text-sm font-medium bg-muted/10 rounded-2xl border border-dashed">
                                            No teachers found matching your search.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 2: MONTHS */}
                    {selectedTeacher && !selectedMonth && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            {monthsAvailable.map(m => (
                                <div
                                    key={m}
                                    onClick={() => setSelectedMonth(m)}
                                    className="p-4 sm:p-5 border border-border/80 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-muted/30 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-300 group bg-card"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className="p-2 sm:p-2.5 bg-primary/10 rounded-lg sm:rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shrink-0">
                                            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <span className="font-bold text-sm sm:text-base text-foreground truncate">{formatMonth(m)}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                                </div>
                            ))}
                            {monthsAvailable.length === 0 && !isLoadingRecords && (
                                <div className="col-span-1 sm:col-span-2 text-center py-12 text-sm text-muted-foreground font-medium bg-muted/10 rounded-2xl border border-dashed">
                                    No records available for this teacher.
                                </div>
                            )}
                            {isLoadingRecords && (
                                <div className="col-span-1 sm:col-span-2 py-12 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 3: SCHOOLS */}
                    {selectedMonth && !selectedSchool && (
                        <div className="space-y-2.5 sm:space-y-3 animate-in fade-in slide-in-from-right-8 duration-300">
                            {schoolsInMonth.map(s => (
                                <div
                                    key={s._id}
                                    onClick={() => setSelectedSchool(s)}
                                    className="p-3.5 sm:p-4 md:p-5 border border-border/80 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-muted/30 hover:border-indigo-500/40 hover:shadow-md cursor-pointer bg-card transition-all duration-300 group"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className="p-2 sm:p-2.5 bg-indigo-500/10 rounded-lg sm:rounded-xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300 shrink-0">
                                            <School className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <span className="font-bold text-foreground text-sm md:text-base truncate">{s.schoolName}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/40 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LEVEL 4: CATEGORIES */}
                    {selectedSchool && !selectedCategory && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            {categoriesData.map(c => (
                                <div
                                    key={c.name}
                                    onClick={() => c.count > 0 && setSelectedCategory(c.name)}
                                    className={`p-5 sm:p-6 md:p-8 border border-border/80 rounded-xl sm:rounded-2xl text-center flex flex-col items-center transition-all duration-300 bg-card ${c.count > 0
                                        ? 'hover:bg-muted/20 hover:border-violet-500/40 hover:shadow-md hover:-translate-y-1 cursor-pointer group'
                                        : 'opacity-50 grayscale cursor-not-allowed'
                                        }`}
                                >
                                    <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 transition-colors duration-300 ${c.count > 0 ? 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white' : 'bg-muted text-muted-foreground'}`}>
                                        <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <p className="font-bold text-sm md:text-base text-foreground mb-1">{c.name}</p>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2.5 py-1 rounded-full">{c.count} records</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LEVEL 5: OVERVIEW */}
                    {selectedCategory && !selectedDay && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">

                            <div>
                                <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 sm:mb-4">Summary Metrics</h4>
                                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4">
                                    {Object.entries(activeCategoryInfo.stats).map(([key, val]) => {
                                        let icon, colorClass, borderClass, bgClass, label;
                                        switch (key) {
                                            case 'present':
                                                icon = <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 text-emerald-500" />;
                                                colorClass = "text-emerald-500"; borderClass = "border-emerald-500/30 hover:border-emerald-500/60"; bgClass = "bg-emerald-500/5"; label = "Present";
                                                break;
                                            case 'late':
                                                icon = <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 text-amber-500" />;
                                                colorClass = "text-amber-500"; borderClass = "border-amber-500/30 hover:border-amber-500/60"; bgClass = "bg-amber-500/5"; label = "Late";
                                                break;
                                            case 'absent':
                                                icon = <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 text-destructive" />;
                                                colorClass = "text-destructive"; borderClass = "border-destructive/30 hover:border-destructive/60"; bgClass = "bg-destructive/5"; label = "Absent";
                                                break;
                                            case 'events':
                                                icon = <Star className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 text-violet-500" />;
                                                colorClass = "text-violet-500"; borderClass = "border-violet-500/30 hover:border-violet-500/60"; bgClass = "bg-violet-500/5"; label = "Events";
                                                break;
                                            case 'holidays':
                                                icon = <Coffee className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 text-slate-400" />;
                                                colorClass = "text-slate-400"; borderClass = "border-slate-400/30 hover:border-slate-400/60"; bgClass = "bg-slate-400/5"; label = "Holidays";
                                                break;
                                            case 'mediaSent':
                                                icon = <Film className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 text-blue-500" />;
                                                colorClass = "text-blue-500"; borderClass = "border-blue-500/30 hover:border-blue-500/60"; bgClass = "bg-blue-500/5"; label = "Media";
                                                break;
                                            default:
                                                icon = <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 text-muted-foreground" />;
                                                colorClass = "text-foreground"; borderClass = "border-border"; bgClass = "bg-card"; label = key;
                                        }

                                        return (
                                            <div
                                                key={key}
                                                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-default ${bgClass} ${borderClass}`}
                                            >
                                                {icon}
                                                <span className={`text-2xl sm:text-3xl font-black mb-1 sm:mb-1.5 ${colorClass}`}>{val}</span>
                                                <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest ${colorClass} opacity-80`}>{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 sm:mb-4">Daily Breakdown</h4>
                                <div className="space-y-2.5 sm:space-y-3">
                                    {activeCategoryInfo.records.map(r => (
                                        <div
                                            key={r._id}
                                            onClick={() => setSelectedDay(r)}
                                            className="p-3.5 sm:p-4 border border-border/80 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-muted/30 hover:border-primary/30 hover:shadow-sm cursor-pointer bg-card transition-all duration-200 group"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
                                                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{formatFullDate(r.date)}</span>
                                                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1.5 shrink-0"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {r.time}</span>
                                            </div>
                                            <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-2">
                                                {r.mediaFilesCount > 0 && <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />}
                                                <span className={getStatusBadge(r.status)}>{r.status}</span>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 hidden sm:block" />
                                            </div>
                                        </div>
                                    ))}
                                    {activeCategoryInfo.records.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground bg-muted/10 border border-dashed border-border/80 rounded-2xl text-sm font-medium">
                                            No records found for this category.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LEVEL 6: DETAIL (Daily Reports Removed) */}
                    {selectedDay && (
                        <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="bg-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center border border-border/80 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-4 sm:mt-5 mb-5 sm:mb-6 text-foreground tracking-tight px-2">{formatFullDate(selectedDay.date)}</h2>
                                <div className="flex flex-row justify-center gap-3 sm:gap-6">
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-emerald-500/20 w-full sm:w-auto shadow-sm">
                                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> In: {formatTime(selectedDay.checkInTime) || '--:--'}
                                    </div>
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-rose-600 bg-rose-500/10 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-rose-500/20 w-full sm:w-auto shadow-sm">
                                        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Out: {formatTime(selectedDay.checkOutTime) || '--:--'}
                                    </div>
                                </div>
                            </div>

                            {(selectedDay.teacherNote || selectedDay.lateReason) && (
                                <div className="space-y-1.5 sm:space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                    <p className="text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 pl-1"><FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Exception Note</p>
                                    <div className="p-4 sm:p-5 bg-muted/30 border border-border/80 rounded-xl sm:rounded-2xl text-xs sm:text-sm italic text-muted-foreground shadow-sm">"{selectedDay.teacherNote || selectedDay.lateReason}"</div>
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