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
import * as XLSX from 'xlsx-js-style'; // <-- Added styling library import

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
            // 1. Fetch file from backend
            const response = await api.get(`/admin/progress/${selectedTeacher._id}/export/${selectedMonth}`, {
                responseType: 'blob'
            });

            if (response.data.type === 'application/json') {
                const text = await response.data.text();
                const json = JSON.parse(text);
                throw new Error(json.message || "Failed to generate report.");
            }

            // 2. Read the Blob as an ArrayBuffer and parse it into an XLSX workbook
            const arrayBuffer = await response.data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // 3. Define vibrant headers
            const headerColors = [
                "2563EB", // Blue
                "0D9488", // Teal
                "4F46E5", // Indigo
                "7C3AED", // Purple
                "DB2777", // Pink
                "D97706", // Orange
                "059669", // Green
                "DC2626", // Red
                "475569"  // Slate
            ];

            // 4. Apply styles specifically to Row 1 (Headers)
            if (worksheet['!ref']) {
                const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
                for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                    const headerAddress = XLSX.utils.encode_col(C) + "1";
                    if (!worksheet[headerAddress]) continue;

                    // Use modulo to cycle colors if there are more columns than colors
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

            // 5. Generate and download styled file
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
        <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Progress Reports</h1>
                    <p className="text-muted-foreground text-sm">Monthly workforce activity metrics.</p>
                </div>
            </div>

            {/* Breadcrumb */}
            {(selectedTeacher || selectedMonth) && (
                <button onClick={handleBackNavigation} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    {selectedDay ? "Back to Overview" : selectedCategory ? `Back to ${selectedSchool.schoolName}` : selectedSchool ? `Back to Months` : "Back to Rankings"}
                </button>
            )}

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-100">
                {/* Dynamic Title Bar */}
                <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between gap-4">
                    <h3 className="font-bold truncate">
                        {!selectedTeacher ? "Workforce Rankings" : !selectedMonth ? `${selectedTeacher.name}'s Reports` : formatMonth(selectedMonth)}
                    </h3>
                    {selectedMonth && !selectedSchool && (
                        <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-2 border-primary/20 text-primary font-bold">
                            <Download className="w-4 h-4" /> Export Excel
                        </Button>
                    )}
                </div>

                <div className="p-4 md:p-6 flex-1 bg-background/50">
                    {/* LEVEL 1: LIST */}
                    {!selectedTeacher && (
                        <div className="space-y-4">
                            <Input
                                placeholder="Search teacher..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="mb-4 h-11"
                            />
                            {isLoadingTeachers ? <Loader2 className="w-8 h-8 animate-spin mx-auto mt-10" /> :
                                filteredTeachers.map((t, idx) => (
                                    <div key={t._id} onClick={() => handleSelectTeacher(t)} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-muted/50 cursor-pointer transition-all active:scale-[0.99]">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">{t.name[0]}</div>
                                            <div>
                                                <p className="font-bold text-sm">{t.name}</p>
                                                <p className="text-[11px] text-muted-foreground uppercase font-bold">{t.zone || 'Unassigned'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><Trophy className="w-3 h-3" /> {t.score}/100</span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 inline ml-2" />
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {/* LEVEL 2: MONTHS */}
                    {selectedTeacher && !selectedMonth && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {monthsAvailable.map(m => (
                                <div key={m} onClick={() => setSelectedMonth(m)} className="p-5 border border-border rounded-xl flex items-center justify-between hover:bg-muted/30 cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <CalendarDays className="w-5 h-5 text-primary" />
                                        <span className="font-bold">{formatMonth(m)}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LEVEL 3: SCHOOLS */}
                    {selectedMonth && !selectedSchool && (
                        <div className="space-y-3">
                            {schoolsInMonth.map(s => (
                                <div key={s._id} onClick={() => setSelectedSchool(s)} className="p-4 border border-border rounded-xl flex items-center justify-between hover:border-primary/40 cursor-pointer bg-card">
                                    <div className="flex items-center gap-4">
                                        <School className="w-5 h-5 text-indigo-500" />
                                        <span className="font-bold">{s.schoolName}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LEVEL 4: CATEGORIES */}
                    {selectedSchool && !selectedCategory && (
                        <div className="grid grid-cols-2 gap-4">
                            {categoriesData.map(c => (
                                <div key={c.name} onClick={() => c.count > 0 && setSelectedCategory(c.name)} className={`p-6 border rounded-2xl text-center flex flex-col items-center ${c.count > 0 ? 'hover:bg-muted/30 cursor-pointer' : 'opacity-40 grayscale cursor-not-allowed'}`}>
                                    <Users className="w-8 h-8 text-violet-500 mb-3" />
                                    <p className="font-bold text-sm">{c.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground">{c.count} records</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LEVEL 5: OVERVIEW */}
                    {selectedCategory && !selectedDay && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {Object.entries(activeCategoryInfo.stats).map(([key, val]) => (
                                    <div key={key} className="p-3 border border-border rounded-xl bg-card text-center">
                                        <p className="text-xl font-black text-foreground">{val}</p>
                                        <p className="text-[8px] font-black uppercase text-muted-foreground">{key}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {activeCategoryInfo.records.map(r => (
                                    <div key={r._id} onClick={() => setSelectedDay(r)} className="p-3 border border-border/50 rounded-xl flex items-center justify-between hover:bg-muted/20 cursor-pointer">
                                        <span className="text-xs font-bold">{formatFullDate(r.date)}</span>
                                        <div className="flex items-center gap-3">
                                            {r.mediaFilesCount > 0 && <Film className="w-3.5 h-3.5 text-blue-500" />}
                                            <span className={getStatusBadge(r.status)}>{r.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LEVEL 6: DETAIL */}
                    {selectedDay && (
                        <div className="space-y-6">
                            <div className="bg-muted/20 rounded-2xl p-6 text-center border border-border">
                                <span className={getStatusBadge(selectedDay.status)}>{selectedDay.status}</span>
                                <h2 className="text-2xl font-bold mt-3">{formatFullDate(selectedDay.date)}</h2>
                                <div className="flex justify-center gap-4 mt-4">
                                    <div className="text-xs font-bold text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/20">In: {formatTime(selectedDay.checkInTime) || '--:--'}</div>
                                    <div className="text-xs font-bold text-rose-500 bg-rose-500/5 px-3 py-1.5 rounded-full border border-rose-500/20">Out: {formatTime(selectedDay.checkOutTime) || '--:--'}</div>
                                </div>
                            </div>
                            {selectedDay.dailyReport && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Daily Report</p>
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-sm leading-relaxed">{selectedDay.dailyReport}</div>
                                </div>
                            )}
                            {(selectedDay.teacherNote || selectedDay.lateReason) && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2"><FileText className="w-4 h-4" /> Teacher Note</p>
                                    <div className="p-4 bg-muted/20 border border-border rounded-xl text-sm italic">"{selectedDay.teacherNote || selectedDay.lateReason}"</div>
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