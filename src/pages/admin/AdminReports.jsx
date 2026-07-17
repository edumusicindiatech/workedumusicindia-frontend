import { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import {
    ChevronRight, ArrowLeft, Search, CalendarDays,
    ClipboardCheck, PartyPopper, School, MapPin,
    Clock, Users, Eye, Download, X, Table
} from "lucide-react";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";

import ExcelJS from "exceljs";
import { downloadExcelBlob } from "../../utils/excelDownloadHelper";

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

    // --- WHATSAPP-LIKE READ/UNREAD TRACKING STATES ---
    const [unreadDaily, setUnreadDaily] = useState(() => JSON.parse(localStorage.getItem('adminUnreadDaily') || '{}'));
    const [employeeActivity, setEmployeeActivity] = useState(() => JSON.parse(localStorage.getItem('adminEmployeeActivity') || '{}'));

    const [unreadEventsMap, setUnreadEventsMap] = useState(() => JSON.parse(localStorage.getItem('adminUnreadEventsMap') || '{}'));
    const [schoolActivity, setSchoolActivity] = useState(() => JSON.parse(localStorage.getItem('adminSchoolActivity') || '{}'));

    useEffect(() => localStorage.setItem('adminUnreadDaily', JSON.stringify(unreadDaily)), [unreadDaily]);
    useEffect(() => localStorage.setItem('adminEmployeeActivity', JSON.stringify(employeeActivity)), [employeeActivity]);
    useEffect(() => localStorage.setItem('adminUnreadEventsMap', JSON.stringify(unreadEventsMap)), [unreadEventsMap]);
    useEffect(() => localStorage.setItem('adminSchoolActivity', JSON.stringify(schoolActivity)), [schoolActivity]);

    // --- DRILL DOWN STATES (School -> Month -> Band -> Date) ---
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const selectedEmployeeRef = useRef(selectedEmployee);

    useEffect(() => {
        selectedEmployeeRef.current = selectedEmployee;
    }, [selectedEmployee]);

    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedBand, setSelectedBand] = useState(null);
    const [expandedDate, setExpandedDate] = useState(null);

    // --- PREVIEW MODAL STATE ---
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);

    const [allEvents, setAllEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [selectedSchoolEvents, setSelectedSchoolEvents] = useState(null);
    const selectedSchoolEventsRef = useRef(selectedSchoolEvents);

    useEffect(() => {
        selectedSchoolEventsRef.current = selectedSchoolEvents;
    }, [selectedSchoolEvents]);

    // --- SOCKET LOGIC ---
    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleNewDailyReport = (newReport) => {
            const currentlyViewingEmp = selectedEmployeeRef.current;

            if (currentlyViewingEmp && newReport.teacher === currentlyViewingEmp.id) {
                setDailyRecords(prev => {
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
            }

            // ALWAYS increment badge, forcing admin to drill down to clear it
            setUnreadDaily(prev => ({ ...prev, [newReport.teacher]: (prev[newReport.teacher] || 0) + 1 }));
            setEmployeeActivity(prev => ({ ...prev, [newReport.teacher]: Date.now() }));
            toast.success(t('admin_reports.toasts.new_report', 'New report received!'));
        };

        const handleNewEvent = (newEvent) => {
            setAllEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));

            setUnreadEventsMap(prev => ({ ...prev, [newEvent.schoolName]: (prev[newEvent.schoolName] || 0) + 1 }));
            if (activeTabRef.current !== 'events') {
                setUnreadEvents(prev => prev + 1);
            }

            setSchoolActivity(prev => ({ ...prev, [newEvent.schoolName]: Date.now() }));
            toast.success(t('admin_reports.toasts.new_event', { school: newEvent.schoolName }));
        };

        socket.on("new_daily_report", handleNewDailyReport);
        socket.on("new_event", handleNewEvent);
        return () => {
            socket.off("new_daily_report", handleNewDailyReport);
            socket.off("new_event", handleNewEvent);
        };
    }, [user, t]);

    // --- INITIAL FETCH ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [rosterRes, eventsRes, unreadRes] = await Promise.all([
                    api.get('/admin/roster'),
                    api.get('/admin/events'),
                    api.get('/admin/reports/unread-summary')
                ]);

                if (rosterRes.data.success) {
                    setEmployees(rosterRes.data.data.filter(emp => emp.systemRole === 'Employee'));
                }
                if (eventsRes.data.success) {
                    setAllEvents(eventsRes.data.data);
                }
                if (unreadRes.data.success) {
                    setUnreadDaily(unreadRes.data.data.dailyUnread);
                    setUnreadEventsMap(unreadRes.data.data.eventsUnread);

                    // Set global events tab badge based on total unread events
                    const totalUnreadEvents = Object.values(unreadRes.data.data.eventsUnread).reduce((a, b) => a + b, 0);
                    setUnreadEvents(totalUnreadEvents);
                }
            } catch (error) {
                toast.error(t('admin_reports.toasts.init_error', 'Failed to load initial data'));
            } finally {
                setIsLoadingEmployees(false);
                setIsLoadingEvents(false);
            }
        };
        fetchInitialData();
    }, [t]);

    // --- CLICK HANDLERS ---
    const handleSelectEmployee = async (employee) => {
        setSelectedEmployee(employee);
        setIsLoadingDaily(true);
        try {
            const res = await api.get(`/admin/daily-reports/${employee.id}`);
            if (res.data.success) setDailyRecords(res.data.data);
        } catch (error) {
            toast.error(t('admin_reports.toasts.fetch_error', 'Failed to load employee data'));
            setSelectedEmployee(null);
        } finally {
            setIsLoadingDaily(false);
        }
    };

    const handleExpandDate = (dateStr) => {
        setExpandedDate(prev => prev === dateStr ? null : dateStr);

        // If opening, clear the badges for these specific reports
        if (expandedDate !== dateStr) {
            const reportsToRead = reportsByDate[dateStr].filter(r => !r.isReadByAdmin);

            if (reportsToRead.length > 0) {
                // 1. Mark in Database
                reportsToRead.forEach(r => {
                    api.put(`/admin/daily-reports/report/${r._id}/mark-read`).catch(() => { });
                });

                // 2. Update Local State
                setDailyRecords(prev => prev.map(r =>
                    reportsToRead.find(tr => tr._id === r._id) ? { ...r, isReadByAdmin: true } : r
                ));

                // 3. Decrement Top Level Badge
                setUnreadDaily(prev => {
                    const next = { ...prev };
                    if (next[selectedEmployee.id]) {
                        next[selectedEmployee.id] -= reportsToRead.length;
                        if (next[selectedEmployee.id] <= 0) delete next[selectedEmployee.id];
                    }
                    return next;
                });
            }
        }
    };

    const handleSelectSchoolEvents = (school) => {
        setSelectedSchoolEvents(school);

        // Events Drill Down: Clear badge when viewing the school's events
        setUnreadEventsMap(prev => {
            const next = { ...prev };
            delete next[school.schoolName];
            return next;
        });

        api.put(`/admin/events/${school.schoolName}/mark-read`).catch(() => { });
    };

    // ==========================================
    // MEMOS & BADGE CALCULATORS
    // ==========================================

    const sortedEmployees = useMemo(() => {
        return [...employees].sort((a, b) => {
            const timeA = employeeActivity[a.id] || 0;
            const timeB = employeeActivity[b.id] || 0;
            if (timeA !== timeB) return timeB - timeA;
            return a.name.localeCompare(b.name);
        });
    }, [employees, employeeActivity]);

    // DRILL DOWN CALCULATORS (WITH SAFE DATE PARSING)
    const unreadBySchool = useMemo(() => {
        const counts = {};
        dailyRecords.forEach(r => {
            if (!r.isReadByAdmin) {
                const id = r.schoolId?._id || r.schoolId || r.schoolName;
                counts[id] = (counts[id] || 0) + 1;
            }
        });
        return counts;
    }, [dailyRecords]);

    const unreadByMonth = useMemo(() => {
        const counts = {};
        dailyRecords.forEach(r => {
            if (!r.isReadByAdmin && r.date) {
                const d = new Date(r.date);
                if (!isNaN(d.getTime())) {
                    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const schoolId = r.schoolId?._id || r.schoolId || r.schoolName;
                    if (selectedSchool && schoolId === selectedSchool.id) {
                        counts[m] = (counts[m] || 0) + 1;
                    }
                }
            }
        });
        return counts;
    }, [dailyRecords, selectedSchool]);

    const unreadByBand = useMemo(() => {
        const counts = {};
        dailyRecords.forEach(r => {
            if (!r.isReadByAdmin && r.band && r.date) {
                const d = new Date(r.date);
                if (!isNaN(d.getTime())) {
                    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (m === selectedMonth) {
                        const schoolId = r.schoolId?._id || r.schoolId || r.schoolName;
                        if (selectedSchool && schoolId === selectedSchool.id) {
                            counts[r.band] = (counts[r.band] || 0) + 1;
                        }
                    }
                }
            }
        });
        return counts;
    }, [dailyRecords, selectedSchool, selectedMonth]);

    const unreadByDate = useMemo(() => {
        const counts = {};
        dailyRecords.forEach(r => {
            if (!r.isReadByAdmin && r.date && r.band === selectedBand) {
                const d = new Date(r.date);
                if (!isNaN(d.getTime())) {
                    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (m === selectedMonth) {
                        const schoolId = r.schoolId?._id || r.schoolId || r.schoolName;
                        if (selectedSchool && schoolId === selectedSchool.id) {
                            counts[r.date] = (counts[r.date] || 0) + 1;
                        }
                    }
                }
            }
        });
        return counts;
    }, [dailyRecords, selectedSchool, selectedMonth, selectedBand]);

    // CONSOLIDATED MEMO FOR LAST 2 MONTHS
    const consolidated2MonthRecords = useMemo(() => {
        if (!dailyRecords.length) return {};

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const targetCurrent = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const prevDate = new Date(currentYear, currentMonth - 1, 1);
        const targetPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        const grouped = {};

        dailyRecords.forEach(r => {
            if (!r.date) return;
            const recordDate = new Date(r.date);
            if (isNaN(recordDate.getTime())) return;

            const recordMonthStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;

            if (recordMonthStr === targetCurrent || recordMonthStr === targetPrev) {
                const schoolName = r.schoolName || 'Unknown School';
                const bandName = r.band || 'Uncategorized';

                if (!grouped[recordMonthStr]) grouped[recordMonthStr] = {};
                if (!grouped[recordMonthStr][schoolName]) grouped[recordMonthStr][schoolName] = {};
                if (!grouped[recordMonthStr][schoolName][bandName]) grouped[recordMonthStr][schoolName][bandName] = [];

                grouped[recordMonthStr][schoolName][bandName].push(r);
            }
        });

        Object.keys(grouped).forEach(m => {
            Object.keys(grouped[m]).forEach(s => {
                Object.keys(grouped[m][s]).forEach(b => {
                    grouped[m][s][b].sort((a, b) => new Date(b.date) - new Date(a.date));
                });
            });
        });

        return grouped;
    }, [dailyRecords]);


    // EXISTING GROUPING MEMOS (WITH SAFE DATE PARSING)
    const availableSchools = useMemo(() => {
        if (!dailyRecords.length) return [];
        const schoolsMap = {};
        dailyRecords.forEach(r => {
            const id = r.schoolId?._id || r.schoolId || r.schoolName;
            if (!schoolsMap[id]) {
                schoolsMap[id] = { id, name: r.schoolName || 'Unknown School' };
            }
        });
        return Object.values(schoolsMap);
    }, [dailyRecords]);

    const recordsForSchool = useMemo(() => {
        if (!selectedSchool) return [];
        return dailyRecords.filter(r => (r.schoolId?._id || r.schoolId || r.schoolName) === selectedSchool.id);
    }, [dailyRecords, selectedSchool]);

    const monthsAvailable = useMemo(() => {
        if (!recordsForSchool.length) return [];
        const months = new Set();
        recordsForSchool.forEach(r => {
            if (!r.date) return;
            const d = new Date(r.date);
            if (!isNaN(d.getTime())) {
                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                months.add(monthStr);
            }
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [recordsForSchool]);

    const recordsForMonth = useMemo(() => {
        if (!selectedMonth) return [];
        return recordsForSchool.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            if (isNaN(d.getTime())) return false;
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return monthStr === selectedMonth;
        });
    }, [recordsForSchool, selectedMonth]);

    const activeBandsInMonth = useMemo(() => {
        const bands = new Set(recordsForMonth.map(r => r.band));
        return Array.from(bands);
    }, [recordsForMonth]);

    const recordsForBand = useMemo(() => {
        if (!selectedBand) return [];
        return recordsForMonth.filter(r => r.band === selectedBand).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [recordsForMonth, selectedBand]);

    const reportsByDate = useMemo(() => {
        if (!recordsForBand.length) return {};
        const grouped = {};
        recordsForBand.forEach(report => {
            if (!grouped[report.date]) grouped[report.date] = [];
            grouped[report.date].push(report);
        });
        return grouped;
    }, [recordsForBand]);

    const sortedDates = useMemo(() => {
        return Object.keys(reportsByDate).sort((a, b) => new Date(b) - new Date(a));
    }, [reportsByDate]);

    // Events Grouping & Sorting
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

        const groupedArray = Object.values(grouped).map(g => ({ ...g, categories: Array.from(g.categories) }));

        return groupedArray.sort((a, b) => {
            const timeA = schoolActivity[a.schoolName] || 0;
            const timeB = schoolActivity[b.schoolName] || 0;
            if (timeA !== timeB) return timeB - timeA;
            return a.schoolName.localeCompare(b.schoolName);
        });
    }, [allEvents, schoolActivity]);

    // EXPORT FUNCTIONS
    const handleExportExcel = async () => {
        if (!recordsForMonth.length) {
            return toast.error("No records found for this month to export.");
        }
        const tid = toast.loading("Preparing beautiful report...");
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Admin Portal';
            const worksheet = workbook.addWorksheet(`Reports - ${selectedMonth}`);
            worksheet.columns = [
                { width: 15 }, { width: 35 }, { width: 20 }, { width: 20 }, { width: 25 },
                { width: 15 }, { width: 20 }, { width: 55 },
            ];

            let categories = [...new Set(recordsForMonth.map(r => r.band || 'Uncategorized'))];
            categories.sort((a, b) => {
                if (a === 'Junior Band') return -1;
                if (b === 'Junior Band') return 1;
                if (a === 'Senior Band') return -1;
                if (b === 'Senior Band') return 1;
                return a.localeCompare(b);
            });

            categories.forEach((categoryName, index) => {
                const categoryRecords = recordsForMonth
                    .filter(r => (r.band || 'Uncategorized') === categoryName)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                if (categoryRecords.length === 0) return;
                if (index > 0) { worksheet.addRow([]); worksheet.addRow([]); }

                const titleRow = worksheet.addRow([`${categoryName.toUpperCase()} REPORTS`]);
                worksheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`); // Merged to H
                const titleCell = titleRow.getCell(1);
                titleCell.font = { size: 14, bold: true, color: { arg: 'FFFFFFFF' } };
                titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: 'FF1F2937' } };
                titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
                titleRow.height = 30;

                const headers = ['Date', 'School Name', 'Category', 'Band Stage', 'Event Name', 'Event Date', 'Students Present', 'Report Description'];
                const headerRow = worksheet.addRow(headers);
                const headerColors = ['FF2563EB', 'FF059669', 'FF7C3AED', 'FF0EA5E9', 'FFF59E0B', 'FFF59E0B', 'FF0891B2', 'FF475569']; // Added color for stage

                headerRow.eachCell((cell, colNumber) => {
                    cell.font = { bold: true, color: { arg: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: headerColors[colNumber - 1] } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { arg: 'FFFFFFFF' } }, left: { style: 'thin', color: { arg: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { arg: 'FFFFFFFF' } }, right: { style: 'thin', color: { arg: 'FFFFFFFF' } } };
                });
                headerRow.height = 25;

                categoryRecords.forEach((r, rowIndex) => {
                    const row = worksheet.addRow([
                        r.date || '-', r.schoolName || selectedSchool.name || '-', r.band || '-', r.bandStage || '-',
                        r.eventName || '-', r.eventDate || '-', r.studentsPresent || 0,
                        (r.summary || r.description || 'No description provided.').replace(/\n/g, '\r\n')
                    ]);
                    row.eachCell((cell, colNumber) => {
                        cell.alignment = { vertical: 'middle', wrapText: true };
                        cell.border = { top: { style: 'thin', color: { arg: 'FFDDDDDD' } }, left: { style: 'thin', color: { arg: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { arg: 'FFDDDDDD' } }, right: { style: 'thin', color: { arg: 'FFDDDDDD' } } };
                        if (rowIndex % 2 !== 0) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: 'FFF8FAFC' } }; }
                        if ([1, 3, 4, 6, 7].includes(colNumber)) { cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; }
                    });
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const cleanEmpName = selectedEmployee.name.replace(/[^a-zA-Z0-9]/g, '_');
            const cleanSchoolName = selectedSchool.name.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${cleanEmpName}_${cleanSchoolName}_${selectedMonth}.xlsx`;

            await downloadExcelBlob(blob, fileName, toast, tid);

        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Failed to generate Excel file.", { id: tid });
        }
    };

    const handleConsolidatedExportExcel = async () => {
        if (Object.keys(consolidated2MonthRecords).length === 0) {
            return toast.error("No records found for the last 2 months.");
        }

        const tid = toast.loading("Preparing 2-Month Consolidated Report...");
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Admin Portal';
            const worksheet = workbook.addWorksheet(`Consolidated 2-Month Report`);

            worksheet.columns = [
                { width: 15 }, { width: 35 }, { width: 20 }, { width: 20 }, { width: 25 },
                { width: 15 }, { width: 20 }, { width: 55 },
            ];

            const headers = ['Date', 'School Name', 'Category', 'Band Stage', 'Event Name', 'Event Date', 'Students Present', 'Report Description'];

            const months = Object.keys(consolidated2MonthRecords).sort((a, b) => b.localeCompare(a));

            months.forEach((month) => {
                const monthName = formatMonthYear(month, 'long');
                const monthRow = worksheet.addRow([`REPORT FOR: ${monthName.toUpperCase()}`]);
                worksheet.mergeCells(`A${monthRow.number}:H${monthRow.number}`); // Merged to H
                const monthCell = monthRow.getCell(1);
                monthCell.font = { size: 16, bold: true, color: { arg: 'FFFFFFFF' } };
                monthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: 'FF0F172A' } };
                monthCell.alignment = { horizontal: 'center', vertical: 'middle' };
                monthRow.height = 35;

                const schools = Object.keys(consolidated2MonthRecords[month]).sort();

                schools.forEach((schoolName) => {
                    const schoolRow = worksheet.addRow([`SCHOOL: ${schoolName.toUpperCase()}`]);
                    worksheet.mergeCells(`A${schoolRow.number}:H${schoolRow.number}`); // Merged to H
                    const schoolCell = schoolRow.getCell(1);
                    schoolCell.font = { size: 13, bold: true, color: { arg: 'FF1E293B' } };
                    schoolCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: 'FFF1F5F9' } };
                    schoolCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                    schoolRow.height = 25;

                    const bands = Object.keys(consolidated2MonthRecords[month][schoolName]).sort();

                    bands.forEach((bandName) => {
                        const headerRow = worksheet.addRow(headers);
                        const headerColors = ['FF2563EB', 'FF059669', 'FF7C3AED', 'FF0EA5E9', 'FFF59E0B', 'FFF59E0B', 'FF0891B2', 'FF475569'];
                        headerRow.eachCell((cell, colNumber) => {
                            cell.font = { bold: true, color: { arg: 'FFFFFFFF' } };
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: headerColors[colNumber - 1] } };
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.border = { top: { style: 'thin', color: { arg: 'FFFFFFFF' } }, left: { style: 'thin', color: { arg: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { arg: 'FFFFFFFF' } }, right: { style: 'thin', color: { arg: 'FFFFFFFF' } } };
                        });
                        headerRow.height = 25;

                        const records = consolidated2MonthRecords[month][schoolName][bandName];
                        records.forEach((r, rowIndex) => {
                            const row = worksheet.addRow([
                                r.date || '-', r.schoolName || schoolName || '-', r.band || bandName || '-', r.bandStage || '-',
                                r.eventName || '-', r.eventDate || '-', r.studentsPresent || 0,
                                (r.summary || r.description || 'No description provided.').replace(/\n/g, '\r\n')
                            ]);
                            row.eachCell((cell, colNumber) => {
                                cell.alignment = { vertical: 'middle', wrapText: true };
                                cell.border = { top: { style: 'thin', color: { arg: 'FFDDDDDD' } }, left: { style: 'thin', color: { arg: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { arg: 'FFDDDDDD' } }, right: { style: 'thin', color: { arg: 'FFDDDDDD' } } };
                                if (rowIndex % 2 !== 0) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: 'FFF8FAFC' } }; }
                                if ([1, 3, 4, 6, 7].includes(colNumber)) { cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; }
                            });
                        });
                        worksheet.addRow([]);
                    });
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const cleanEmpName = selectedEmployee.name.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${cleanEmpName}_2Month_Consolidated_Report.xlsx`;

            await downloadExcelBlob(blob, fileName, toast, tid);

        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Failed to generate Consolidated Excel file.", { id: tid });
        }
    };

    const handleEventsBack = () => setSelectedSchoolEvents(null);

    const handleDailyBreadcrumb = (level) => {
        if (level === 'directory') {
            setSelectedEmployee(null);
            setSelectedSchool(null);
            setSelectedMonth(null);
            setSelectedBand(null);
            setExpandedDate(null);
            setDailyRecords([]);
        } else if (level === 'employee') {
            setSelectedSchool(null);
            setSelectedMonth(null);
            setSelectedBand(null);
            setExpandedDate(null);
        } else if (level === 'school') {
            setSelectedMonth(null);
            setSelectedBand(null);
            setExpandedDate(null);
        } else if (level === 'month') {
            setSelectedBand(null);
            setExpandedDate(null);
        }
    };

    // Safely parse the UI rendering for YYYY-MM explicitly without UTC midnight rollovers
    const formatMonthYear = (yyyyMmStr, format = 'long') => {
        if (!yyyyMmStr) return '';
        const parts = yyyyMmStr.split('-');
        if (parts.length !== 2) return yyyyMmStr;
        // Construct the date using local execution context: Year, Month (0-indexed), Day 1
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        return date.toLocaleString('default', { month: format, year: 'numeric' });
    };

    const formatFullDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`;
    };

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
            {showPreviewModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                                    <Table className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-extrabold text-foreground text-lg">Month Overview</h2>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                        {selectedSchool?.name} • {formatMonthYear(selectedMonth, 'long')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleExportExcel} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm">
                                    <Download className="w-4 h-4" /> Export Excel
                                </button>
                                <button onClick={() => setShowPreviewModal(false)} className="p-2.5 bg-muted hover:bg-muted/80 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6 space-y-8 bg-background">
                            {(() => {
                                let categories = [...new Set(recordsForMonth.map(r => r.band || 'Uncategorized'))];
                                categories.sort((a, b) => {
                                    if (a === 'Junior Band') return -1;
                                    if (b === 'Junior Band') return 1;
                                    if (a === 'Senior Band') return -1;
                                    if (b === 'Senior Band') return 1;
                                    return a.localeCompare(b);
                                });

                                return categories.map((categoryName) => {
                                    const categoryRecords = recordsForMonth
                                        .filter(r => (r.band || 'Uncategorized') === categoryName)
                                        .sort((a, b) => new Date(a.date) - new Date(b.date));

                                    if (categoryRecords.length === 0) return null;

                                    return (
                                        <div key={categoryName} className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                                            <div className="bg-muted/50 px-4 py-3.5 text-center border-b border-border">
                                                <h3 className="text-foreground font-extrabold text-sm tracking-widest uppercase">
                                                    {categoryName} REPORTS
                                                </h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead>
                                                        <tr className="bg-muted/30">
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Date</th>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider border-r border-border">School Name</th>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Category</th>
                                                            {/* --- NEW HEADER --- */}
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Band Stage</th>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider border-r border-border">Event Name</th>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Event Date</th>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Students Present</th>
                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider min-w-[300px]">Report Description</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/40">
                                                        {categoryRecords.map((r, idx) => {
                                                            return (
                                                                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                                    <td className="px-4 py-3.5 font-semibold text-center border-r border-border/40">{r.date || '-'}</td>
                                                                    <td className="px-4 py-3.5 font-medium border-r border-border/40">{r.schoolName || selectedSchool?.name || '-'}</td>
                                                                    <td className="px-4 py-3.5 text-center border-r border-border/40">
                                                                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${r.band === 'Senior Band' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                                            {r.band || '-'}
                                                                        </span>
                                                                    </td>
                                                                    {/* --- NEW ROW DATA --- */}
                                                                    <td className="px-4 py-3.5 text-center font-bold text-muted-foreground border-r border-border/40">{r.bandStage || '-'}</td>

                                                                    <td className="px-4 py-3.5 font-medium text-muted-foreground border-r border-border/40 truncate max-w-[200px]">{r.eventName || '-'}</td>
                                                                    <td className="px-4 py-3.5 font-medium text-center border-r border-border/40 text-muted-foreground">{r.eventDate || '-'}</td>
                                                                    <td className="px-4 py-3.5 font-bold text-center border-r border-border/40 text-foreground">{r.studentsPresent || 0}</td>
                                                                    <td className="px-4 py-3.5 text-muted-foreground whitespace-pre-wrap min-w-[300px]" title={r.summary || r.description}>
                                                                        {r.summary || r.description || 'No description provided.'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* NEW CONSOLIDATED 2-MONTH MODAL */}
            {showConsolidatedModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                                    <Table className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-extrabold text-foreground text-lg">2-Month Consolidated Report</h2>
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                        {selectedEmployee?.name} • All Assigned Schools
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleConsolidatedExportExcel} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm">
                                    <Download className="w-4 h-4" /> Export Excel
                                </button>
                                <button onClick={() => setShowConsolidatedModal(false)} className="p-2.5 bg-muted hover:bg-muted/80 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6 space-y-12 bg-background">
                            {Object.keys(consolidated2MonthRecords).length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    No records found for the last 2 months.
                                </div>
                            ) : (
                                Object.keys(consolidated2MonthRecords)
                                    .sort((a, b) => b.localeCompare(a))
                                    .map(month => (
                                        <div key={month} className="space-y-6">
                                            {/* Month Header */}
                                            <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-md">
                                                <h2 className="font-black text-xl tracking-widest uppercase">
                                                    {formatMonthYear(month, 'long')}
                                                </h2>
                                            </div>

                                            {Object.keys(consolidated2MonthRecords[month]).sort().map(schoolName => (
                                                <div key={schoolName} className="ml-4 sm:ml-8 border-l-2 border-border/60 pl-4 sm:pl-6 space-y-6">
                                                    {/* School Header */}
                                                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                                                        <School className="w-5 h-5 text-blue-500" />
                                                        {schoolName}
                                                    </h3>

                                                    {Object.keys(consolidated2MonthRecords[month][schoolName]).sort().map(bandName => (
                                                        <div key={bandName} className="bg-card border border-border shadow-sm rounded-xl overflow-hidden ml-4 sm:ml-6">
                                                            <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
                                                                <Users className="w-4 h-4 text-emerald-500" />
                                                                <h4 className="text-foreground font-extrabold text-sm tracking-widest uppercase">
                                                                    {bandName}
                                                                </h4>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                                    <thead>
                                                                        <tr className="bg-muted/20">
                                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Date</th>
                                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Band Stage</th>
                                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider border-r border-border">Event Name</th>
                                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider text-center border-r border-border">Students</th>
                                                                            <th className="px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider min-w-[300px]">Description</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border/40">
                                                                        {consolidated2MonthRecords[month][schoolName][bandName].map((r, idx) => (
                                                                            <tr key={r._id || idx} className="hover:bg-muted/20 transition-colors">
                                                                                <td className="px-4 py-3.5 font-semibold text-center border-r border-border/40">{r.date || '-'}</td>
                                                                                <td className="px-4 py-3.5 font-bold text-center text-muted-foreground border-r border-border/40">{r.bandStage || '-'}</td>
                                                                                <td className="px-4 py-3.5 font-medium text-muted-foreground border-r border-border/40 truncate max-w-[200px]">{r.eventName || '-'}</td>
                                                                                <td className="px-4 py-3.5 font-bold text-center border-r border-border/40 text-foreground">{r.studentsPresent || 0}</td>
                                                                                <td className="px-4 py-3.5 text-muted-foreground whitespace-pre-wrap min-w-[300px]">{r.summary || r.description || 'No description provided.'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('admin_reports.title', 'Operation Reports')}</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">{t('admin_reports.subtitle', 'Review daily logs and event schedules.')}</p>
                    </div>
                </div>

                {(!selectedEmployee && !selectedSchoolEvents) && (
                    <div className="flex p-1 bg-muted/50 rounded-xl border border-border w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('daily')}
                            className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'daily' ? 'bg-card text-blue-500 shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('admin_reports.tabs.daily', 'Daily Logs')}
                        </button>
                        <button
                            onClick={() => { setActiveTab('events'); setUnreadEvents(0); }}
                            className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'events' ? 'bg-card text-blue-500 shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('admin_reports.tabs.events', 'Upcoming Events')} {unreadEvents > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadEvents}</span>}
                        </button>
                    </div>
                )}
            </div>

            {/* Breadcrumbs Section + Action Bar */}
            {activeTab === 'daily' && selectedEmployee && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center flex-wrap gap-2 text-sm font-semibold text-muted-foreground">
                        <button onClick={() => handleDailyBreadcrumb('directory')} className={`hover:text-blue-500 transition-colors ${!selectedEmployee ? 'text-blue-500' : ''}`}>
                            {t('admin_reports.breadcrumbs.directory', 'Directory')}
                        </button>
                        {selectedEmployee && (<><ChevronRight className="w-4 h-4 opacity-50" /><button onClick={() => handleDailyBreadcrumb('employee')} className={`hover:text-blue-500 transition-colors ${selectedEmployee && !selectedSchool ? 'text-blue-500' : ''}`}>{selectedEmployee.name}</button></>)}
                        {selectedSchool && (<><ChevronRight className="w-4 h-4 opacity-50" /><button onClick={() => handleDailyBreadcrumb('school')} className={`hover:text-blue-500 transition-colors ${selectedSchool && !selectedMonth ? 'text-blue-500' : ''}`}>{selectedSchool.name}</button></>)}
                        {selectedMonth && (<><ChevronRight className="w-4 h-4 opacity-50" /><button onClick={() => handleDailyBreadcrumb('month')} className={`hover:text-blue-500 transition-colors ${selectedMonth && !selectedBand ? 'text-blue-500' : ''}`}>{formatMonthYear(selectedMonth, 'short')}</button></>)}
                        {selectedBand && (<><ChevronRight className="w-4 h-4 opacity-50" /><span className="text-blue-500">{selectedBand}</span></>)}
                    </div>

                    {selectedMonth && (
                        <div className="flex items-center gap-2 shrink-0 animate-in fade-in duration-300">
                            <button onClick={() => setShowPreviewModal(true)} className="p-2 sm:px-4 sm:py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground flex items-center gap-2 shadow-sm transition-all">
                                <Eye className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Preview</span>
                            </button>
                            <button onClick={handleExportExcel} className="p-2 sm:px-4 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 flex items-center gap-2 shadow-sm transition-all">
                                <Download className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Export Excel</span>
                            </button>
                        </div>
                    )}

                    {/* NEW: CONSOLIDATED 2-MONTH BUTTONS (Level 2) */}
                    {selectedEmployee && !selectedSchool && (
                        <div className="flex items-center gap-2 shrink-0 animate-in fade-in duration-300">
                            <button onClick={() => setShowConsolidatedModal(true)} className="p-2 sm:px-4 sm:py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground flex items-center gap-2 shadow-sm transition-all">
                                <Eye className="w-4 h-4 text-purple-500" />
                                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">2-Month Preview</span>
                            </button>
                            <button onClick={handleConsolidatedExportExcel} className="p-2 sm:px-4 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 flex items-center gap-2 shadow-sm transition-all">
                                <Download className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Consolidated Excel</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Back Button for Events Tab Only */}
            {(activeTab === 'events' && selectedSchoolEvents) && (
                <button onClick={handleEventsBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-blue-500 mb-5 text-sm font-semibold transition-colors group">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    {t('admin_reports.breadcrumbs.back_to_schools', 'Back to Schools')}
                </button>
            )}

            <div className="bg-card rounded-3xl border border-border shadow-lg flex flex-col min-h-[500px] overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30">
                    <h3 className="font-bold text-foreground">
                        {activeTab === 'events'
                            ? (selectedSchoolEvents ? t('admin_reports.headers.school_events', { school: selectedSchoolEvents.schoolName }) : t('admin_reports.headers.upcoming_schools', 'Upcoming School Events'))
                            : (!selectedEmployee ? t('admin_reports.headers.directory', 'Staff Directory')
                                : !selectedSchool ? "Select School Location"
                                    : !selectedMonth ? "Select Month"
                                        : !selectedBand ? "Select Band Category"
                                            : "Daily Reports")
                        }
                    </h3>
                </div>

                <div className="p-4 sm:p-6 flex-1 bg-background/50">
                    {activeTab === 'daily' && (
                        <>
                            {/* LEVEL 1: EMPLOYEE DIRECTORY */}
                            {!selectedEmployee && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="relative mb-6">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('admin_reports.daily.search_placeholder', 'Search employees...')}
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
                                            {sortedEmployees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((e) => (
                                                <div key={e.id} onClick={() => handleSelectEmployee(e)} className="flex items-center justify-between p-4 bg-card border border-border/80 rounded-2xl hover:border-blue-500/40 cursor-pointer transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 shadow-sm ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
                                                            {e.profilePicture && typeof e.profilePicture === 'string' && e.profilePicture.startsWith('http') ? (
                                                                <img src={e.profilePicture} alt={e.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                e.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-foreground group-hover:text-blue-500 transition-colors">{e.name}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">{e.location || 'Unassigned'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {/* --- TOP LEVEL BADGE --- */}
                                                        {unreadDaily[e.id] > 0 && (
                                                            <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm animate-in zoom-in">
                                                                {unreadDaily[e.id]}
                                                            </span>
                                                        )}
                                                        <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-blue-500 transition-all" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LEVEL 2: SCHOOL SELECTION */}
                            {selectedEmployee && !selectedSchool && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    {isLoadingDaily ? (
                                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="bg-card dark:bg-[#0d1117] border border-border/80 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
                                                    <div className="w-14 h-14 rounded-2xl bg-muted/60 dark:bg-slate-800/50 animate-pulse shrink-0"></div>
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-5 bg-muted/80 dark:bg-slate-700/80 animate-pulse rounded w-1/2"></div>
                                                        <div className="h-3 bg-muted/80 dark:bg-slate-700/80 animate-pulse rounded w-1/3"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : availableSchools.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">
                                            {t('admin_reports.daily.no_reports', 'No reports found for this employee.')}
                                        </div>
                                    ) : (
                                        availableSchools.map(school => (
                                            <div key={school.id} onClick={() => setSelectedSchool(school)} className="bg-card dark:bg-[#0d1117] border border-border rounded-3xl p-6 hover:border-blue-500/50 cursor-pointer flex items-center gap-5 group transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors duration-300">
                                                    <School className="w-7 h-7 text-blue-500 group-hover:text-white transition-colors duration-300" />
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-lg text-foreground group-hover:text-blue-500 transition-colors duration-300 flex items-center gap-2">
                                                        {school.name}
                                                        {/* --- SCHOOL LEVEL BADGE --- */}
                                                        {unreadBySchool[school.id] > 0 && (
                                                            <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-in zoom-in">
                                                                {unreadBySchool[school.id]} New
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 opacity-80"><MapPin className="w-3.5 h-3.5" /> Click to view months</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* LEVEL 3: MONTH SELECTION */}
                            {selectedSchool && !selectedMonth && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-8">
                                    {monthsAvailable.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">
                                            No reports found for this school.
                                        </div>
                                    ) : monthsAvailable.map(m => (
                                        <div key={m} onClick={() => setSelectedMonth(m)} className="p-5 border border-border/80 rounded-2xl flex items-center justify-between hover:bg-muted/30 cursor-pointer group bg-card transition-all shadow-sm hover:shadow-md">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                    <CalendarDays className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-lg text-foreground flex items-center gap-2">
                                                        {formatMonthYear(m, 'long')}
                                                        {/* --- MONTH LEVEL BADGE --- */}
                                                        {unreadByMonth[m] > 0 && (
                                                            <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-in zoom-in">
                                                                {unreadByMonth[m]}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mt-0.5">View Category Details</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-blue-500 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* LEVEL 4: BAND SELECTION */}
                            {selectedMonth && !selectedBand && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-8 duration-500 max-w-3xl mx-auto mt-4">
                                    {['Junior Band', 'Senior Band'].map(band => {
                                        const hasHistory = activeBandsInMonth.includes(band);
                                        return (
                                            <button key={band} disabled={!hasHistory} onClick={() => setSelectedBand(band)}
                                                className={`relative p-10 rounded-4xl border-2 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${hasHistory ? 'border-blue-500/20 bg-card hover:border-blue-500 hover:-translate-y-2 hover:shadow-xl' : 'border-border bg-muted/30 opacity-60 cursor-not-allowed grayscale'} overflow-hidden`}
                                            >
                                                <Users className={`w-14 h-14 transition-colors duration-300 ${hasHistory ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                                <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                                                    {band}
                                                    {/* --- BAND LEVEL BADGE --- */}
                                                    {unreadByBand[band] > 0 && (
                                                        <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full animate-in zoom-in shadow-sm">
                                                            {unreadByBand[band]}
                                                        </span>
                                                    )}
                                                </h2>
                                                <span className={`text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-colors duration-300 ${hasHistory ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                                                    {hasHistory ? "View Daily Reports" : "No Reports Found"}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* LEVEL 5: DATE & REPORT ACCORDION */}
                            {selectedBand && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                                    {sortedDates.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">
                                            No reports found for this specific date range.
                                        </div>
                                    ) : (
                                        sortedDates.map(dateStr => (
                                            <div key={dateStr} className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden transition-all mb-4">
                                                <div
                                                    className="p-4 bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => handleExpandDate(dateStr)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                            <CalendarDays className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-bold text-foreground flex items-center gap-2">
                                                            {formatFullDate(dateStr)}
                                                            {/* --- FINAL DATE BADGE --- */}
                                                            {unreadByDate[dateStr] > 0 && (
                                                                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                                                                    New Report
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expandedDate === dateStr ? 'rotate-90' : ''}`} />
                                                </div>

                                                {expandedDate === dateStr && (
                                                    <div className="p-4 sm:p-5 border-t border-border/50 bg-background/50 space-y-4 animate-in fade-in duration-200">
                                                        {reportsByDate[dateStr].map(r => {
                                                            const isEventReport = r.category?.toLowerCase() === 'event report' || r.eventName;
                                                            return (
                                                                <div key={r._id} className="border border-border/80 rounded-xl p-4 sm:p-5 bg-card shadow-sm hover:border-blue-500/30 transition-colors">
                                                                    {isEventReport ? (
                                                                        <div className="space-y-3">
                                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <p className="font-bold text-base text-foreground">
                                                                                        {r.eventName || 'Event Details'}
                                                                                    </p>
                                                                                    <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground bg-background px-2.5 py-1 rounded border border-border/50 w-fit shadow-sm">
                                                                                        <Users className="w-3.5 h-3.5 text-blue-500" />
                                                                                        {r.studentsPresent || 0} Students
                                                                                    </p>
                                                                                </div>
                                                                                <p className="text-[10px] font-bold bg-blue-500/10 text-blue-600 px-2 py-1 rounded uppercase shrink-0">Event Report</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-semibold text-blue-700/80 dark:text-blue-400 mb-1.5 text-[10px] uppercase tracking-wider">Description</p>
                                                                                <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap text-sm">
                                                                                    {r.summary || r.description || 'No description provided.'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div>
                                                                            <div className="flex justify-between items-center mb-2.5">
                                                                                <p className="font-semibold text-blue-700/80 dark:text-blue-400 text-xs uppercase tracking-wider">
                                                                                    Daily Summary
                                                                                </p>
                                                                                <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground bg-background px-2.5 py-1 rounded border border-border/50 w-fit shadow-sm">
                                                                                    <Users className="w-3.5 h-3.5 text-blue-500" />
                                                                                    {r.studentsPresent || 0} Students
                                                                                </p>
                                                                            </div>

                                                                            {/* --- ADDED: Band Stage --- */}
                                                                            {r.bandStage && r.bandStage !== 'N/A' && (
                                                                                <div className="mb-3">
                                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Band Stage</span>
                                                                                    <p className="text-sm font-medium text-foreground/90">{r.bandStage}</p>
                                                                                </div>
                                                                            )}

                                                                            <div>
                                                                                {r.bandStage && r.bandStage !== 'N/A' && (
                                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Description</span>
                                                                                )}
                                                                                <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap text-sm">
                                                                                    {r.summary || r.description || 'No summary provided.'}
                                                                                </p>
                                                                            </div>
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

                    {/* EVENTS TAB */}
                    {activeTab === 'events' && (
                        <>
                            {!selectedSchoolEvents && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                                    {isLoadingEvents ? (
                                        <div className="col-span-full py-10 text-center text-muted-foreground">...</div>
                                    ) : eventsBySchool.length === 0 ? (
                                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed text-sm">{t('admin_reports.events.no_events', 'No events scheduled.')}</div>
                                    ) : eventsBySchool.map((school, idx) => (
                                        <div key={idx} onClick={() => handleSelectSchoolEvents(school)} className="bg-card border border-border/80 rounded-2xl p-5 hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all group flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                                                        <PartyPopper className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{school.schoolName}</h3>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate"><MapPin className="w-3 h-3" /> {school.location}</p>
                                                    </div>
                                                </div>

                                                {/* --- EVENT UNREAD BADGE --- */}
                                                {unreadEventsMap[school.schoolName] > 0 && (
                                                    <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm animate-in zoom-in">
                                                        {unreadEventsMap[school.schoolName]}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-auto flex flex-wrap gap-2">
                                                {school.categories.map(cat => (
                                                    <span key={cat} className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-foreground/70 uppercase">{cat}</span>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs font-bold text-blue-500">
                                                <span>{school.eventsList.length} {school.eventsList.length === 1 ? t('admin_reports.events.event_unit_one', 'Event') : t('admin_reports.events.event_unit_other', 'Events')}</span>
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
                                                    <h4 className="font-extrabold text-lg text-foreground">{ev.eventName || t('admin_reports.events.event_unit_one', 'Event')}</h4>
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