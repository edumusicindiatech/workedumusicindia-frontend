import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
    ChevronRight, ArrowLeft, Search, CalendarDays,
    ClipboardCheck, FileText, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "../../api/axios";
import { io } from "socket.io-client";

// Setup socket connection
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const AdminDailyReport = () => {
    const { user } = useSelector((state) => state.auth);
    
    const [employees, setEmployees] = useState([]);
    const [records, setRecords] = useState([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);

    // --- REAL-TIME SOCKET LOGIC ---
    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleNewReport = (newReport) => {
            if (selectedEmployee && newReport.teacher === selectedEmployee.id) {
                setRecords(prevRecords => {
                    const existsIndex = prevRecords.findIndex(r => r.date === newReport.date);
                    if (existsIndex >= 0) {
                        const updated = [...prevRecords];
                        updated[existsIndex] = newReport;
                        return updated;
                    } else {
                        return [newReport, ...prevRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
                    }
                });
                toast.success(`New report received from ${selectedEmployee.name}!`);
            }
        };

        socket.on("new_daily_report", handleNewReport);
        return () => socket.off("new_daily_report", handleNewReport);
    }, [user, selectedEmployee]);

    // --- FETCH EMPLOYEE ROSTER ---
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await api.get('/admin/roster');
                if (res.data.success) {
                    const onlyEmployees = res.data.data.filter(emp => emp.systemRole === 'Employee');
                    setEmployees(onlyEmployees);
                }
            } catch (error) {
                toast.error("Failed to load employees list.");
            } finally {
                setIsLoadingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    // --- FETCH REPORTS FOR SELECTED EMPLOYEE ---
    const handleSelectEmployee = async (employee) => {
        setSelectedEmployee(employee);
        setIsLoadingRecords(true);
        try {
            const res = await api.get(`/admin/daily-reports/${employee.id}`);
            if (res.data.success) {
                setRecords(res.data.data);
            }
        } catch (error) {
            toast.error("Failed to fetch employee records.");
            setSelectedEmployee(null);
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

    const reportsInMonth = useMemo(() => {
        if (!selectedMonth || !records) return [];
        return records
            .filter(r => typeof r.date === 'string' && r.date.startsWith(selectedMonth))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [records, selectedMonth]);

    const handleBackNavigation = () => {
        if (selectedMonth) setSelectedMonth(null);
        else if (selectedEmployee) { setSelectedEmployee(null); setRecords([]); }
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

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="mb-6 sm:mb-8 flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                    <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Daily Reports Archive</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">Review End-of-Day submissions.</p>
                </div>
            </div>

            {/* Breadcrumb Navigation */}
            {(selectedEmployee || selectedMonth) && (
                <button
                    onClick={handleBackNavigation}
                    className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground hover:text-blue-500 mb-5 sm:mb-6 text-xs sm:text-sm font-semibold transition-colors duration-200 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="truncate">
                        {selectedMonth ? `Back to Months` : "Back to Directory"}
                    </span>
                </button>
            )}

            <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col min-h-100 transition-all duration-300">
                {/* Title Bar */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between gap-3 sm:gap-4">
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                        {!selectedEmployee ? "Employee Directory" : !selectedMonth ? `${selectedEmployee.name}'s History` : formatMonth(selectedMonth)}
                    </h3>
                </div>

                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-background/50 relative overflow-hidden">
                    
                    {/* LEVEL 1: EMPLOYEES LIST */}
                    {!selectedEmployee && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative mb-4 sm:mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search employee..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 h-11 sm:h-12 bg-card border-border/60 focus-visible:ring-blue-500/30 rounded-xl shadow-sm text-sm"
                                />
                            </div>
                            {isLoadingEmployees ? (
                                <div className="py-12 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="space-y-2.5 sm:space-y-3">
                                    {filteredEmployees.map((e) => (
                                        <div
                                            key={e.id}
                                            onClick={() => handleSelectEmployee(e)}
                                            className="flex items-center justify-between p-3 sm:p-4 bg-card border border-border/80 rounded-xl sm:rounded-2xl hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all duration-300 active:scale-[0.99] group"
                                        >
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-linear-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-inner shrink-0 text-sm sm:text-base">
                                                    {e.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-xs sm:text-sm text-foreground group-hover:text-blue-500 transition-colors truncate">{e.name}</p>
                                                    <p className="text-[9px] sm:text-[11px] text-muted-foreground uppercase font-semibold mt-0.5 truncate">{e.location || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/40 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                                        </div>
                                    ))}
                                    {filteredEmployees.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground text-sm font-medium bg-muted/10 rounded-2xl border border-dashed">
                                            No employees found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 2: MONTHS LIST */}
                    {selectedEmployee && !selectedMonth && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            {monthsAvailable.map(m => (
                                <div
                                    key={m}
                                    onClick={() => setSelectedMonth(m)}
                                    className="p-4 sm:p-5 border border-border/80 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-muted/30 hover:border-blue-500/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-300 group bg-card"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className="p-2 sm:p-2.5 bg-blue-500/10 rounded-lg sm:rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 shrink-0">
                                            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <span className="font-bold text-sm sm:text-base text-foreground truncate">{formatMonth(m)}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/40 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                                </div>
                            ))}
                            {monthsAvailable.length === 0 && !isLoadingRecords && (
                                <div className="col-span-1 sm:col-span-2 text-center py-12 text-sm text-muted-foreground font-medium bg-muted/10 rounded-2xl border border-dashed">
                                    No daily reports submitted by this employee yet.
                                </div>
                            )}
                            {isLoadingRecords && (
                                <div className="col-span-1 sm:col-span-2 py-12 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 3: REPORTS LIST */}
                    {selectedMonth && (
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            {reportsInMonth.map(r => (
                                <div key={r._id} className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden hover:border-blue-500/30 transition-colors">
                                    {/* Date Header */}
                                    <div className="bg-muted/30 px-4 sm:px-5 py-3 border-b border-border/50 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                        <span className="font-bold text-foreground text-sm">{formatFullDate(r.date)}</span>
                                    </div>

                                    {/* Report Content */}
                                    <div className="p-4 sm:p-5">
                                        <div className="space-y-4 text-sm text-foreground/90">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded uppercase">
                                                    {r.category || 'Daily Report'}
                                                </span>
                                            </div>

                                            <div>
                                                <p className="font-semibold text-blue-700/80 dark:text-blue-400 mb-1 text-xs uppercase tracking-wider">Summary</p>
                                                <p className="leading-relaxed">{r.summary}</p>
                                            </div>

                                            {r.category === 'Event Report' && r.eventName && (
                                                <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                                                    <p className="font-semibold text-blue-700/80 dark:text-blue-400 text-xs uppercase mb-1">Logged Event</p>
                                                    <p className="font-bold">{r.eventName}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{r.eventDate}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {reportsInMonth.length === 0 && (
                                <div className="text-center py-12 text-sm text-muted-foreground font-medium bg-muted/10 rounded-2xl border border-dashed">
                                    No reports found for this month.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDailyReport;