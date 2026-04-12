import { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import {
    ChevronRight, ArrowLeft, Search, CalendarDays,
    ClipboardCheck, FileText, PartyPopper, School, MapPin, Clock, Users
} from "lucide-react";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const AdminReports = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [activeTab, setActiveTab] = useState('daily');
    const [unreadEvents, setUnreadEvents] = useState(0);
    const activeTabRef = useRef(activeTab);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const [employees, setEmployees] = useState([]);
    const [dailyRecords, setDailyRecords] = useState([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
    const [isLoadingDaily, setIsLoadingDaily] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);

    // New states for the accordion behavior
    const [expandedDate, setExpandedDate] = useState(null);
    const [expandedReportId, setExpandedReportId] = useState(null);

    const [allEvents, setAllEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [selectedSchoolEvents, setSelectedSchoolEvents] = useState(null);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleNewDailyReport = (newReport) => {
            if (selectedEmployee && newReport.teacher === selectedEmployee.id) {
                setDailyRecords(prev => {
                    // UPDATED: Now checks Date AND School AND Band
                    const existsIndex = prev.findIndex(r =>
                        r.date === newReport.date &&
                        r.schoolName === newReport.schoolName &&
                        r.band === newReport.band
                    );

                    if (existsIndex >= 0) {
                        const updated = [...prev];
                        updated[existsIndex] = newReport;
                        return updated;
                    }
                    return [newReport, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
                });
                toast.success(t('admin_reports.toasts.new_report'));
            }
        };

        const handleNewEvent = (newEvent) => {
            setAllEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));
            toast.success(t('admin_reports.toasts.new_event', { school: newEvent.schoolName }));
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
    }, [user, selectedEmployee, t]);

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
                toast.error(t('admin_reports.toasts.init_error'));
            } finally {
                setIsLoadingEmployees(false);
                setIsLoadingEvents(false);
            }
        };
        fetchInitialData();
    }, [t]);

    const handleSelectEmployee = async (employee) => {
        setSelectedEmployee(employee);
        setIsLoadingDaily(true);
        try {
            const res = await api.get(`/admin/daily-reports/${employee.id}`);
            if (res.data.success) setDailyRecords(res.data.data);
        } catch (error) {
            toast.error(t('admin_reports.toasts.fetch_error'));
            setSelectedEmployee(null);
        } finally {
            setIsLoadingDaily(false);
        }
    };

    const monthsAvailable = useMemo(() => {
        if (!dailyRecords.length) return [];
        const months = new Set(dailyRecords.filter(r => r.date).map(r => r.date.substring(0, 7)));
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [dailyRecords]);

    const reportsInMonth = useMemo(() => {
        if (!selectedMonth) return [];
        return dailyRecords.filter(r => r.date?.startsWith(selectedMonth)).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [dailyRecords, selectedMonth]);

    // Grouping reports by date
    const reportsByDate = useMemo(() => {
        if (!reportsInMonth.length) return {};
        const grouped = {};
        reportsInMonth.forEach(report => {
            if (!grouped[report.date]) grouped[report.date] = [];
            grouped[report.date].push(report);
        });
        return grouped;
    }, [reportsInMonth]);

    // Sorting grouped dates in descending order
    const sortedDates = useMemo(() => {
        return Object.keys(reportsByDate).sort((a, b) => new Date(b) - new Date(a));
    }, [reportsByDate]);

    const eventsBySchool = useMemo(() => {
        const grouped = {};
        allEvents.forEach(ev => {
            const name = ev.schoolName || 'Unknown School';
            if (!grouped[name]) {
                grouped[name] = { schoolName: name, location: ev.location || '...', categories: new Set(), eventsList: [] };
            }
            if (ev.categoryName || ev.band) grouped[name].categories.add(ev.categoryName || ev.band);
            grouped[name].eventsList.push(ev);
        });
        return Object.values(grouped).map(g => ({ ...g, categories: Array.from(g.categories) }));
    }, [allEvents]);

    const handleBack = () => {
        if (activeTab === 'events') setSelectedSchoolEvents(null);
        else {
            if (selectedMonth) {
                setSelectedMonth(null);
                setExpandedDate(null);
                setExpandedReportId(null);
            }
            else {
                setSelectedEmployee(null);
                setDailyRecords([]);
            }
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
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('admin_reports.title')}</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">{t('admin_reports.subtitle')}</p>
                    </div>
                </div>

                {(!selectedEmployee && !selectedSchoolEvents) && (
                    <div className="flex p-1 bg-muted/50 rounded-xl border border-border w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('daily')}
                            className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'daily' ? 'bg-card text-blue-500 shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('admin_reports.tabs.daily')}
                        </button>
                        <button
                            onClick={() => { setActiveTab('events'); setUnreadEvents(0); }}
                            className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'events' ? 'bg-card text-blue-500 shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('admin_reports.tabs.events')} {unreadEvents > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadEvents}</span>}
                        </button>
                    </div>
                )}
            </div>

            {/* Breadcrumb */}
            {(selectedEmployee || selectedMonth || selectedSchoolEvents) && (
                <button onClick={handleBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-blue-500 mb-5 text-sm font-semibold transition-colors group">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    {selectedSchoolEvents ? t('admin_reports.breadcrumbs.back_to_schools') : selectedMonth ? t('admin_reports.breadcrumbs.back_to_months') : t('admin_reports.breadcrumbs.back_to_directory')}
                </button>
            )}

            <div className="bg-card rounded-3xl border border-border shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col min-h-125 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30">
                    <h3 className="font-bold text-foreground">
                        {activeTab === 'events'
                            ? (selectedSchoolEvents ? t('admin_reports.headers.school_events', { school: selectedSchoolEvents.schoolName }) : t('admin_reports.headers.upcoming_schools'))
                            : (!selectedEmployee ? t('admin_reports.headers.directory') : !selectedMonth ? t('admin_reports.headers.history', { name: selectedEmployee.name }) : t('admin_reports.headers.archive'))
                        }
                    </h3>
                </div>

                <div className="p-4 sm:p-6 flex-1 bg-background/50">
                    {activeTab === 'daily' && (
                        <>
                            {!selectedEmployee && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="relative mb-6">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('admin_reports.daily.search_placeholder')}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-9 h-11 bg-card rounded-xl shadow-sm text-sm focus-visible:ring-blue-500/30"
                                        />
                                    </div>
                                    {isLoadingEmployees ? (
                                        <div className="space-y-3">
                                            {[...Array(5)].map((_, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-card border border-border/80 rounded-2xl animate-pulse h-20" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((e) => (
                                                <div key={e.id} onClick={() => handleSelectEmployee(e)} className="flex items-center justify-between p-4 bg-card border border-border/80 rounded-2xl hover:border-blue-500/40 cursor-pointer transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 shadow-sm ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
                                                            {e.profilePicture && typeof e.profilePicture === 'string' && e.profilePicture.startsWith('http') ? (
                                                                <img
                                                                    src={e.profilePicture}
                                                                    alt={e.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                e.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
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

                            {selectedEmployee && !selectedMonth && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-8">
                                    {isLoadingDaily ? (
                                        <div className="col-span-full py-10 text-center text-muted-foreground">{t('admin_reports.daily.checking_status')}</div>
                                    ) : monthsAvailable.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">
                                            {t('admin_reports.daily.no_reports') || "No reports found for this employee."}
                                        </div>
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

                            {selectedMonth && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                                    {sortedDates.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">
                                            {/* Fallback text so it never renders empty */}
                                            {t('admin_reports.daily.no_reports') || "No reports found for this month."}
                                        </div>
                                    ) : (
                                        sortedDates.map(dateStr => (
                                            <div key={dateStr} className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden transition-all mb-4">

                                                {/* Date Accordion Header */}
                                                <div
                                                    className="p-4 bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => {
                                                        setExpandedDate(prev => prev === dateStr ? null : dateStr);
                                                        setExpandedReportId(null);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                            <CalendarDays className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-bold text-foreground">{formatFullDate(dateStr)}</span>
                                                        <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border/50 shadow-sm">
                                                            {reportsByDate[dateStr].length}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expandedDate === dateStr ? 'rotate-90' : ''}`} />
                                                </div>

                                                {/* Date Accordion Body */}
                                                {expandedDate === dateStr && (
                                                    <div className="p-4 border-t border-border/50 bg-background/50 space-y-3 animate-in fade-in duration-200">
                                                        {reportsByDate[dateStr].map(r => {
                                                            // Check if this specific report is an event
                                                            const isEventReport = r.category?.toLowerCase() === 'event' ||
                                                                r.type?.toLowerCase() === 'event' ||
                                                                r.reportType?.toLowerCase() === 'event' ||
                                                                r.eventName;

                                                            return (
                                                                <div key={r._id} className="border border-border/80 rounded-xl overflow-hidden shadow-sm hover:border-blue-500/30 transition-colors bg-card">
                                                                    {/* Report Card Header */}
                                                                    <div
                                                                        className="p-3 sm:p-4 cursor-pointer flex items-center justify-between transition-colors hover:bg-muted/20"
                                                                        onClick={() => setExpandedReportId(prev => prev === r._id ? null : r._id)}
                                                                    >
                                                                        <div className="flex items-center gap-3 overflow-hidden pr-2">
                                                                            <div className="w-8 h-8 rounded-lg bg-blue-500/5 flex items-center justify-center shrink-0 border border-blue-500/10">
                                                                                <School className="w-4 h-4 text-blue-500" />
                                                                            </div>
                                                                            {/* School Name */}
                                                                            <span className="font-bold text-sm text-foreground truncate max-w-37.5 sm:max-w-62.5">
                                                                                {r.schoolName || r.school?.name || r.school || t('admin_reports.daily.general_location') || "Unknown Location"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                                                            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 px-2 py-1 rounded uppercase shrink-0">
                                                                                {r.category || r.reportType || r.type || 'Report'} {r.band ? `• ${r.band}` : ''}
                                                                            </span>
                                                                            <ChevronRight className={`w-4 h-4 text-muted-foreground/50 transition-transform ${expandedReportId === r._id ? 'rotate-90 text-blue-500' : ''}`} />
                                                                        </div>
                                                                    </div>

                                                                    {/* Expanded Report Content */}
                                                                    {expandedReportId === r._id && (
                                                                        <div className="p-4 sm:p-5 border-t border-border/50 bg-muted/10 text-sm animate-in slide-in-from-top-2 duration-200">
                                                                            {isEventReport ? (
                                                                                /* EVENT REPORT UI */
                                                                                <div className="space-y-3">
                                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <p className="font-bold text-base text-foreground">
                                                                                                {r.eventName || 'Event Details'}
                                                                                            </p>
                                                                                            {/* --- STUDENTS PRESENT BADGE FOR EVENTS --- */}
                                                                                            <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground bg-background px-2.5 py-1 rounded border border-border/50 w-fit shadow-sm">
                                                                                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                                                                                {r.studentsPresent || 0} Students
                                                                                            </p>
                                                                                        </div>
                                                                                        <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground bg-background px-2.5 py-1 rounded border border-border/50 w-fit shadow-sm">
                                                                                            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                                                                                            {r.eventDate ? formatFullDate(r.eventDate) : formatFullDate(r.date)}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="font-semibold text-blue-700/80 dark:text-blue-400 mb-1.5 text-[10px] uppercase tracking-wider">
                                                                                            Description
                                                                                        </p>
                                                                                        <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                                                                            {r.description || r.summary || 'No description provided.'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                /* REGULAR REPORT UI */
                                                                                <div>
                                                                                    <div className="flex justify-between items-center mb-2.5">
                                                                                        <p className="font-semibold text-blue-700/80 dark:text-blue-400 text-xs uppercase tracking-wider">
                                                                                            {t('admin_reports.daily.summary_label') || 'Daily Summary'}
                                                                                        </p>
                                                                                        {/* --- STUDENTS PRESENT BADGE FOR REGULAR REPORTS --- */}
                                                                                        <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground bg-background px-2.5 py-1 rounded border border-border/50 w-fit shadow-sm">
                                                                                            <Users className="w-3.5 h-3.5 text-blue-500" />
                                                                                            {r.studentsPresent || 0} Students
                                                                                        </p>
                                                                                    </div>
                                                                                    <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                                                                        {r.summary || r.description || 'No summary provided.'}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'events' && (
                        <>
                            {!selectedSchoolEvents && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                                    {isLoadingEvents ? (
                                        <div className="col-span-full py-10 text-center text-muted-foreground">...</div>
                                    ) : eventsBySchool.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">{t('admin_reports.events.no_events')}</div>
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
                                                <span>{school.eventsList.length} {school.eventsList.length === 1 ? t('admin_reports.events.event_unit_one') : t('admin_reports.events.event_unit_other')}</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedSchoolEvents && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                                    {selectedSchoolEvents.eventsList.map((ev, idx) => (
                                        <div key={ev._id || idx} className="bg-card border-l-4 border-l-blue-500 border border-y-border border-r-border rounded-xl p-5 shadow-sm">
                                            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h4 className="font-extrabold text-lg text-foreground">{ev.eventName || t('admin_reports.events.event_unit_one')}</h4>
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
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mt-4 text-right">{t('admin_reports.events.logged_by', { name: ev.teacher.name })}</p>
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