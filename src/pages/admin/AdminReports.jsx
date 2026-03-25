import { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import {
    ChevronRight, ArrowLeft, Search, CalendarDays,
    ClipboardCheck, FileText, PartyPopper, School, MapPin, Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const AdminReports = () => {
    const { user } = useSelector((state) => state.auth);

    // Global State
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'events'

    // --- NEW: Unread Badge State & Ref ---
    const [unreadEvents, setUnreadEvents] = useState(0);
    const activeTabRef = useRef(activeTab);

    // Keep the ref strictly in sync with the state so the socket listener always knows what tab we are on
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    // Daily Reports State
    const [employees, setEmployees] = useState([]);
    const [dailyRecords, setDailyRecords] = useState([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
    const [isLoadingDaily, setIsLoadingDaily] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);

    // Events State
    const [allEvents, setAllEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [selectedSchoolEvents, setSelectedSchoolEvents] = useState(null);

    // --- SOCKET LOGIC ---
    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleNewDailyReport = (newReport) => {
            if (selectedEmployee && newReport.teacher === selectedEmployee.id) {
                setDailyRecords(prev => {
                    const existsIndex = prev.findIndex(r => r.date === newReport.date);
                    if (existsIndex >= 0) {
                        const updated = [...prev];
                        updated[existsIndex] = newReport;
                        return updated;
                    }
                    return [newReport, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
                });
                toast.success(`New report received!`);
            }
        };

        const handleNewEvent = (newEvent) => {
            setAllEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));
            toast.success(`New event scheduled at ${newEvent.schoolName}!`);

            // --- NEW: Only increment the badge if we are NOT currently looking at the events tab ---
            if (activeTabRef.current !== 'events') {
                setUnreadEvents(prev => prev + 1);
            }
        };

        socket.on("new_daily_report", handleNewDailyReport);
        socket.on("new_event", handleNewEvent);
        return () => {
            socket.off("new_daily_report", handleNewDailyReport);
            socket.off("new_event", handleNewEvent);
        };
    }, [user, selectedEmployee]);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [rosterRes, eventsRes] = await Promise.all([
                    api.get('/admin/roster'),
                    api.get('/admin/events')
                ]);

                if (rosterRes.data.success) {
                    setEmployees(rosterRes.data.data.filter(emp => emp.systemRole === 'Employee'));
                }
                if (eventsRes.data.success) {
                    setAllEvents(eventsRes.data.data);
                }
            } catch (error) {
                toast.error("Failed to load initial data.");
            } finally {
                setIsLoadingEmployees(false);
                setIsLoadingEvents(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleSelectEmployee = async (employee) => {
        setSelectedEmployee(employee);
        setIsLoadingDaily(true);
        try {
            const res = await api.get(`/admin/daily-reports/${employee.id}`);
            if (res.data.success) setDailyRecords(res.data.data);
        } catch (error) {
            toast.error("Failed to fetch records.");
            setSelectedEmployee(null);
        } finally {
            setIsLoadingDaily(false);
        }
    };

    // --- DAILY COMPUTATIONS ---
    const monthsAvailable = useMemo(() => {
        if (!dailyRecords.length) return [];
        const months = new Set(dailyRecords.filter(r => r.date).map(r => r.date.substring(0, 7)));
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [dailyRecords]);

    const reportsInMonth = useMemo(() => {
        if (!selectedMonth) return [];
        return dailyRecords.filter(r => r.date?.startsWith(selectedMonth)).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [dailyRecords, selectedMonth]);

    // --- EVENTS COMPUTATIONS ---
    const eventsBySchool = useMemo(() => {
        const grouped = {};
        allEvents.forEach(ev => {
            const name = ev.schoolName || 'Unknown School';
            if (!grouped[name]) {
                grouped[name] = {
                    schoolName: name,
                    location: ev.location || 'Location details inside', // Assuming event has location or defaults
                    categories: new Set(),
                    eventsList: []
                };
            }
            if (ev.categoryName || ev.band) grouped[name].categories.add(ev.categoryName || ev.band);
            grouped[name].eventsList.push(ev);
        });

        // Convert Sets to Arrays
        return Object.values(grouped).map(g => ({
            ...g,
            categories: Array.from(g.categories)
        }));
    }, [allEvents]);

    // --- HELPERS ---
    const handleBack = () => {
        if (activeTab === 'events') {
            setSelectedSchoolEvents(null);
        } else {
            if (selectedMonth) setSelectedMonth(null);
            else { setSelectedEmployee(null); setDailyRecords([]); }
        }
    };

    const formatFullDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`;
    };

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Reports Central</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">Manage end-of-day reports and upcoming events.</p>
                    </div>
                </div>

                {/* --- TABS --- */}
                {(!selectedEmployee && !selectedSchoolEvents) && (
                    <div className="flex p-1 bg-muted/50 rounded-xl border border-border w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('daily')}
                            className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'daily' ? 'bg-card text-blue-500 shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Daily Reports
                        </button>
                        <button
                            // --- NEW: Clear the badge count when clicked ---
                            onClick={() => { setActiveTab('events'); setUnreadEvents(0); }}
                            className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'events' ? 'bg-card text-blue-500 shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {/* --- NEW: Show unreadEvents instead of allEvents.length --- */}
                            Events {unreadEvents > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadEvents}</span>}
                        </button>
                    </div>
                )}
            </div>

            {/* Breadcrumb */}
            {(selectedEmployee || selectedMonth || selectedSchoolEvents) && (
                <button onClick={handleBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-blue-500 mb-5 text-sm font-semibold transition-colors group">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    {selectedSchoolEvents ? "Back to Schools" : selectedMonth ? "Back to Months" : "Back to Directory"}
                </button>
            )}

            {/* MAIN CONTAINER */}
            <div className="bg-card rounded-3xl border border-border shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col min-h-125 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30">
                    <h3 className="font-bold text-foreground">
                        {activeTab === 'events'
                            ? (selectedSchoolEvents ? `Events at ${selectedSchoolEvents.schoolName}` : "Schools with Upcoming Events")
                            : (!selectedEmployee ? "Employee Directory" : !selectedMonth ? `${selectedEmployee.name}'s History` : "Monthly Archive")
                        }
                    </h3>
                </div>

                <div className="p-4 sm:p-6 flex-1 bg-background/50">

                    {/* ========================================== */}
                    {/* TAB 1: DAILY REPORTS FLOW                  */}
                    {/* ========================================== */}
                    {activeTab === 'daily' && (
                        <>
                            {/* LEVEL 1: EMPLOYEES LIST */}
                            {!selectedEmployee && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="relative mb-6">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search employee..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-9 h-11 bg-card rounded-xl shadow-sm text-sm focus-visible:ring-blue-500/30"
                                        />
                                    </div>
                                    {isLoadingEmployees ? (
                                        <div className="space-y-3">
                                            {[...Array(5)].map((_, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-card border border-border/80 rounded-2xl animate-pulse">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-muted shrink-0"></div>
                                                        <div className="space-y-2">
                                                            <div className="h-4 bg-muted rounded w-32"></div>
                                                            <div className="h-3 bg-muted rounded w-20"></div>
                                                        </div>
                                                    </div>
                                                    <div className="w-5 h-5 bg-muted rounded shrink-0"></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((e) => (
                                                <div key={e.id} onClick={() => handleSelectEmployee(e)} className="flex items-center justify-between p-4 bg-card border border-border/80 rounded-2xl hover:border-blue-500/40 cursor-pointer transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold">{e.name[0]}</div>
                                                        <div>
                                                            <p className="font-bold text-sm text-foreground group-hover:text-blue-500 transition-colors">{e.name}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">{e.location || 'Unassigned'}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-blue-500 transition-all" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LEVEL 2: MONTHS */}
                            {selectedEmployee && !selectedMonth && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-8">
                                    {isLoadingDaily ? (
                                        <>
                                            {[...Array(4)].map((_, idx) => (
                                                <div key={idx} className="p-5 border border-border/80 rounded-2xl flex items-center justify-between bg-card animate-pulse">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-muted rounded-xl shrink-0"></div>
                                                        <div className="h-5 bg-muted rounded w-32"></div>
                                                    </div>
                                                    <div className="w-5 h-5 bg-muted rounded shrink-0"></div>
                                                </div>
                                            ))}
                                        </>
                                    ) : monthsAvailable.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">No reports submitted yet.</div>
                                    ) : monthsAvailable.map(m => (
                                        <div key={m} onClick={() => setSelectedMonth(m)} className="p-5 border border-border/80 rounded-2xl flex items-center justify-between hover:bg-muted/30 cursor-pointer group bg-card transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                    <CalendarDays className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-foreground">{new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-blue-500 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* LEVEL 3: REPORTS LIST */}
                            {selectedMonth && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                                    {reportsInMonth.map(r => (
                                        <div key={r._id} className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden hover:border-blue-500/30 transition-colors">
                                            <div className="bg-muted/30 px-5 py-3 border-b border-border/50 flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500" />
                                                    <span className="font-bold text-sm">{formatFullDate(r.date)}</span>
                                                </div>
                                                {/* SCHOOL/LOCATION TAG FOR DAILY REPORTS */}
                                                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/50 truncate max-w-50 sm:max-w-xs">
                                                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                                                    <span className="truncate">{r.schoolName || 'General Location'}</span>
                                                </div>
                                            </div>
                                            <div className="p-5 text-sm space-y-4">
                                                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded uppercase">{r.category || 'Daily Report'}</span>
                                                <div>
                                                    <p className="font-semibold text-blue-700/80 dark:text-blue-400 mb-1 text-xs uppercase">Summary</p>
                                                    <p className="leading-relaxed text-foreground/90">{r.summary}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ========================================== */}
                    {/* TAB 2: EVENTS FLOW                         */}
                    {/* ========================================== */}
                    {activeTab === 'events' && (
                        <>
                            {/* LEVEL 1: SCHOOLS WITH EVENTS */}
                            {!selectedSchoolEvents && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                                    {isLoadingEvents ? (
                                        <>
                                            {[...Array(4)].map((_, idx) => (
                                                <div key={idx} className="bg-card border border-border/80 rounded-2xl p-5 flex flex-col h-45 animate-pulse">
                                                    <div className="flex items-start gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-muted rounded-xl shrink-0"></div>
                                                        <div className="space-y-2 flex-1">
                                                            <div className="h-5 bg-muted rounded w-3/4"></div>
                                                            <div className="h-3 bg-muted rounded w-1/2"></div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-auto flex gap-2">
                                                        <div className="h-4 bg-muted rounded w-12"></div>
                                                        <div className="h-4 bg-muted rounded w-16"></div>
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
                                                        <div className="h-4 bg-muted rounded w-20"></div>
                                                        <div className="w-4 h-4 bg-muted rounded"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : eventsBySchool.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">No upcoming events scheduled.</div>
                                    ) : eventsBySchool.map((school, idx) => (
                                        <div key={idx} onClick={() => setSelectedSchoolEvents(school)} className="bg-card border border-border/80 rounded-2xl p-5 hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all group flex flex-col h-full">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                                                    <PartyPopper className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{school.schoolName}</h3>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate"><MapPin className="w-3 h-3" /> {school.location}</p>
                                                </div>
                                            </div>
                                            <div className="mt-auto flex flex-wrap gap-2">
                                                {school.categories.map(cat => (
                                                    <span key={cat} className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-foreground/70 uppercase">{cat}</span>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs font-bold text-blue-500">
                                                <span>{school.eventsList.length} Event{school.eventsList.length > 1 ? 's' : ''}</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* LEVEL 2: EVENTS LIST */}
                            {selectedSchoolEvents && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                                    {selectedSchoolEvents.eventsList.map((ev, idx) => (
                                        <div key={ev._id || idx} className="bg-card border-l-4 border-l-blue-500 border border-y-border border-r-border rounded-xl p-5 shadow-sm">
                                            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h4 className="font-extrabold text-lg text-foreground">{ev.eventName || 'School Event'}</h4>
                                                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded uppercase mt-1 inline-block">{ev.categoryName || ev.band || 'General'}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5 justify-end"><CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> {formatFullDate(ev.startDate)}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 justify-end"><Clock className="w-3 h-3" /> {ev.timeFrom} - {ev.timeTo}</p>
                                                </div>
                                            </div>
                                            <div className="bg-muted/30 p-4 rounded-lg mt-4 border border-border/50">
                                                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{ev.description}</p>
                                            </div>
                                            {ev.teacher?.name && (
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mt-4 text-right">Logged by: {ev.teacher.name}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminReports;