import React, { useState, useEffect, useRef } from "react";
import { X, ArrowLeft, School, Users, ChevronRight, FileText, CheckCircle2, Clock, AlertCircle, XCircle, Download, Coffee, Star, FolderOpen, CalendarOff, CalendarDays } from "lucide-react";
import * as XLSX from 'xlsx-js-style';
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; 

const AdminAttendanceDetailsModal = ({ isOpen, onClose, monthData, employeeName }) => {
    const { t } = useTranslation(); 
    const [viewLevel, setViewLevel] = useState("schools"); // 'schools' | 'categories' | 'overview' | 'detail'
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setViewLevel("schools");
            setSelectedSchool(null);
            setSelectedCategory(null);
            setSelectedRecord(null);
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    if (!isOpen || !monthData) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => { 
        if (e.target.closest('button')) return;
        dragStartY.current = e.touches[0].clientY; 
        setIsDragging(true); 
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) setDragOffset(delta);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    // Safely handle going back without event bubbling issues
    const handleBack = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (viewLevel === "detail") setViewLevel("overview");
        else if (viewLevel === "overview") setViewLevel("categories");
        else if (viewLevel === "categories") setViewLevel("schools");
        else handleClose();
    };

    // --- EXCEL EXPORT LOGIC ---
    const handleExportExcel = () => {
        try {
            const toastId = toast.loading(t('attendance_modal.excel.generating'));

            const wsData = [];
            const leaveRowIndices = [];
            let stats = { present: 0, late: 0, absent: 0, event: 0, holiday: 0, leaveDays: 0 };

            // 1. Define Headers
            const headers = [
                t('attendance_modal.excel.header_emp_name'), t('attendance_modal.excel.header_month'),
                t('attendance_modal.excel.header_school'), t('attendance_modal.excel.header_category'),
                t('attendance_modal.excel.header_date'), t('attendance_modal.excel.header_status'),
                t('attendance_modal.excel.header_in'), t('attendance_modal.excel.header_out'),
                t('attendance_modal.excel.header_note'), t('attendance_modal.excel.header_report')
            ];
            wsData.push(headers);

            // 2. Loop and construct rows
            monthData.schools.forEach(school => {
                school.categories.forEach(category => {
                    if (category.records && category.records.length > 0) {
                        category.records.forEach(record => {

                            if (record.isLeaveRecord) {
                                stats.leaveDays += (record.leaveDays || 1);

                                wsData.push([
                                    employeeName,
                                    monthData.month,
                                    t('attendance_modal.excel.general_leaves'),
                                    "-",
                                    record.date,
                                    t('attendance_modal.excel.on_leave'),
                                    "-",
                                    "-",
                                    `${t('attendance_modal.reason_provided')}: ${record.reason}`,
                                    `${t('attendance_modal.admin_approval_note')}: ${record.adminRemarks || 'N/A'}`
                                ]);
                                leaveRowIndices.push(wsData.length - 1);
                            } else {
                                if (record.status === 'PRESENT') stats.present++;
                                if (record.status === 'LATE') stats.late++;
                                if (record.status === 'ABSENT') stats.absent++;
                                if (record.status === 'HOLIDAY') stats.holiday++;
                                if (record.status === 'EVENT') stats.event++;

                                const cleanNote = record.note ? record.note.replace(/['"]/g, '') : "-";
                                let reportStr = "-";
                                if (record.dailyReport) {
                                    reportStr = `[${record.dailyReport.category.toUpperCase()}]\nSummary: ${record.dailyReport.summary}`;
                                    if (record.dailyReport.eventName) reportStr += `\nEvent: ${record.dailyReport.eventName}`;
                                }

                                // --- NEW: Add (Task) Tag if record is a task ---
                                const schoolDisplayName = record.isTask ? `${school.name} (Task)` : school.name;

                                wsData.push([
                                    employeeName,
                                    monthData.month,
                                    schoolDisplayName, // <-- Uses the new display name
                                    category.name,
                                    record.rawDate || record.date,
                                    record.status,
                                    record.checkIn || "-",
                                    record.checkOut || "-",
                                    cleanNote,
                                    reportStr
                                ]);
                            }
                        });
                    }
                });
            });

            if (wsData.length === 1) {
                toast.error(t('attendance_modal.excel.no_records'), { id: toastId });
                return;
            }

            wsData.push([]);
            wsData.push([]);

            const summaryStartIdx = wsData.length;
            wsData.push([t('attendance_modal.excel.summary_title'), t('attendance_modal.excel.summary_count')]);
            wsData.push([t('attendance_modal.excel.total_present'), stats.present]);
            wsData.push([t('attendance_modal.excel.total_late'), stats.late]);
            wsData.push([t('attendance_modal.excel.total_absent'), stats.absent]);
            wsData.push([t('attendance_modal.excel.total_event'), stats.event]);
            wsData.push([t('attendance_modal.excel.total_holiday'), stats.holiday]);
            wsData.push([t('attendance_modal.excel.total_approved_leaves'), stats.leaveDays]);

            const worksheet = XLSX.utils.aoa_to_sheet(wsData);

            const headerColors = ["2563EB", "0D9488", "4F46E5", "7C3AED", "DB2777", "D97706", "059669", "DC2626", "475569", "1E293B"];
            const range = XLSX.utils.decode_range(worksheet['!ref']);

            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!worksheet[cellAddress]) continue;

                    worksheet[cellAddress].s = {
                        alignment: { vertical: "top", wrapText: true },
                        border: {
                            top: { style: "thin", color: { auto: 1 } },
                            bottom: { style: "thin", color: { auto: 1 } },
                            left: { style: "thin", color: { auto: 1 } },
                            right: { style: "thin", color: { auto: 1 } }
                        }
                    };

                    if (R === 0) {
                        worksheet[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" } };
                        worksheet[cellAddress].s.fill = { fgColor: { rgb: headerColors[C] || "475569" } };
                        worksheet[cellAddress].s.alignment.horizontal = "center";
                    }

                    if (leaveRowIndices.includes(R)) {
                        worksheet[cellAddress].s.fill = { fgColor: { rgb: "EFF6FF" } };
                    }

                    if (R === summaryStartIdx && C <= 1) {
                        worksheet[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 12 };
                        worksheet[cellAddress].s.fill = { fgColor: { rgb: "1E293B" } };
                    }

                    if (R > summaryStartIdx && R <= summaryStartIdx + 6 && C <= 1) {
                        worksheet[cellAddress].s.font = { bold: C === 0 };
                    }
                }
            }

            worksheet['!cols'] = [
                { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 },
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 45 }
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Record");

            const fileName = `${employeeName.replace(' ', '_')}_Records_${monthData.month.replace(' ', '_')}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast.success(t('attendance_modal.excel.success'), { id: toastId });
        } catch (error) {
            console.error("Excel Export Error:", error);
            toast.error(t('attendance_modal.excel.error'));
        }
    };

    const getStatusStyle = (status) => {
        switch (status?.toUpperCase()) {
            case "PRESENT": return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
            case "LATE": return "text-amber-500 border-amber-500/30 bg-amber-500/10";
            case "ABSENT": return "text-destructive border-destructive/30 bg-destructive/10";
            case "HOLIDAY": return "text-slate-400 border-slate-500/30 bg-slate-500/10";
            case "EVENT": return "text-violet-500 border-violet-500/30 bg-violet-500/10";
            default: return "text-foreground border-border bg-muted";
        }
    };

    const renderSchoolsList = () => (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-end mb-4 border-b border-border/50 pb-4">
                <button onClick={handleExportExcel} className="text-sm font-bold flex items-center justify-center gap-2 border border-primary/20 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground px-4 py-2.5 rounded-xl transition-all shrink-0 shadow-sm w-full sm:w-auto">
                    <Download className="w-4 h-4" /> {t('attendance_modal.export_excel')}
                </button>
            </div>
            <div className="space-y-3">
                {monthData.schools.map(school => (
                    <div key={school.id} onClick={() => { setSelectedSchool(school); setViewLevel("categories"); }}
                        className={`flex items-center justify-between p-4 md:p-5 rounded-2xl border transition-all duration-300 cursor-pointer group ${school.isLeaveNode ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-md' : 'bg-muted/10 border-border hover:bg-muted/30 hover:border-indigo-500/40 hover:shadow-md'}`}>
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-inner ${school.isLeaveNode ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                {school.isLeaveNode ? <FolderOpen className="w-6 h-6" /> : <School className="w-6 h-6" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-extrabold text-base md:text-lg text-foreground truncate">{school.name}</span>
                                <span className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">{t('attendance_modal.tap_to_view')}</span>
                            </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 shrink-0 transition-all duration-300 group-hover:translate-x-1 ${school.isLeaveNode ? 'text-cyan-500/50 group-hover:text-cyan-500' : 'text-muted-foreground/50 group-hover:text-indigo-500'}`} />
                    </div>
                ))}
                {monthData.schools.length === 0 && <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">{t('attendance_modal.no_records_assigned')}</div>}
            </div>
        </div>
    );

    const renderCategoriesList = () => (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSchool.categories.map(cat => (
                    <div key={cat.id} onClick={() => { setSelectedCategory(cat); setViewLevel("overview"); }}
                        className={`flex flex-col items-center justify-center p-8 rounded-2xl border transition-all duration-300 cursor-pointer group text-center shadow-sm hover:-translate-y-1 hover:shadow-md ${cat.isLeaveNode ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40' : 'bg-muted/10 border-border hover:bg-muted/30 hover:border-violet-500/40'}`}>
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-inner ${cat.isLeaveNode ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-violet-500/10 border border-violet-500/20 text-violet-500 group-hover:bg-violet-500 group-hover:text-white'}`}>
                            {cat.isLeaveNode ? <CalendarOff className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                        </div>
                        <span className="font-extrabold text-lg md:text-xl text-foreground mb-2">{cat.name}</span>
                        <span className="text-xs font-bold px-3 py-1 bg-background rounded-full text-muted-foreground border border-border uppercase tracking-wider">{cat.recordCount} {cat.isLeaveNode ? 'Requests' : 'Records'}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCategoryOverview = () => {
        if (selectedCategory.isLeaveNode) {
            return (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                        {selectedCategory.records.map(leave => (
                            <div key={leave.id} className="p-5 border border-cyan-500/20 bg-cyan-500/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-background px-3 py-1.5 rounded-lg border border-border shadow-sm">
                                        <CalendarDays className="w-4 h-4 text-cyan-600" />
                                        {leave.date}
                                    </div>
                                    <span className="px-2.5 py-1 bg-cyan-500 text-white rounded font-bold uppercase text-[10px] tracking-wider shadow-sm">{t('attendance_modal.approved_leave')}</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-cyan-700/70 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><FileText className="w-3.5 h-3.5" /> {t('attendance_modal.reason_provided')}</p>
                                        <p className="text-sm font-medium leading-relaxed text-foreground bg-background p-4 rounded-xl border border-border/50">"{leave.reason}"</p>
                                    </div>
                                    {leave.adminRemarks && (
                                        <div className="border-t border-dashed border-cyan-500/30 pt-3">
                                            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-1.5">{t('attendance_modal.admin_approval_note')}</p>
                                            <p className="text-sm font-medium text-cyan-800 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20">"{leave.adminRemarks}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
        const m = selectedCategory.metrics;
        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t('attendance_modal.summary_metrics')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 md:mb-10">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-emerald-500 leading-none mb-1">{m.present}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80">Present</span>
                    </div>
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-amber-500 leading-none mb-1">{m.late}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Late</span>
                    </div>
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <XCircle className="w-5 h-5 text-destructive mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-destructive leading-none mb-1">{m.absent}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-destructive/80">Absent</span>
                    </div>
                    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <Star className="w-5 h-5 text-violet-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-violet-500 leading-none mb-1">{m.events}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500/80">Events</span>
                    </div>
                    <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-4 flex flex-col items-center justify-center shadow-sm sm:col-span-1 lg:col-span-1 col-span-2">
                        <Coffee className="w-5 h-5 text-slate-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-slate-500 leading-none mb-1">{m.holidays}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500/80">Holidays</span>
                    </div>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t('attendance_modal.daily_breakdown')}</h4>
                <div className="space-y-3">
                    {selectedCategory.records.map(record => (
                        <div key={record.id} onClick={() => { setSelectedRecord(record); setViewLevel("detail"); }} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 rounded-2xl border border-border bg-muted/10 hover:bg-muted/30 cursor-pointer group transition-all duration-300 gap-4 sm:gap-0 hover:border-primary/30">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-6 min-w-0">
                                <span className="font-extrabold text-sm md:text-base text-foreground sm:w-45 truncate">{record.date}</span>
                                <span className="text-xs md:text-sm font-bold text-muted-foreground flex items-center gap-1.5 shrink-0 bg-background px-2 py-1 rounded-md border border-border/50 shadow-sm"><Clock className="w-3.5 h-3.5" /> {record.time}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                <div className="flex items-center gap-3">
                                    {record.hasReport && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 tracking-wider">
                                            <FileText className="w-3 h-3" /> {t('attendance_modal.report_tag')}
                                        </span>
                                    )}
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider border shadow-sm ${getStatusStyle(record.status)}`}>
                                        {record.status}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderRecordDetail = () => (
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center justify-center p-8 md:p-12 bg-muted/10 border border-border rounded-3xl mb-8 relative shadow-sm overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1.5 opacity-50 ${getStatusStyle(selectedRecord.status).replace('text-', 'bg-').split(' ')[0]}`} />
                <span className={`absolute top-4 md:top-6 border px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm ${getStatusStyle(selectedRecord.status)}`}>
                    {selectedRecord.status}
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-foreground mt-8 mb-8 text-center">{selectedRecord.date}</h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-sm w-full sm:w-auto shadow-sm">
                        <Clock className="w-4 h-4" /> In: {selectedRecord.checkIn}
                    </div>
                    <div className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-bold text-sm w-full sm:w-auto shadow-sm">
                        <ArrowLeft className="w-4 h-4 rotate-180" /> Out: {selectedRecord.checkOut}
                    </div>
                </div>
            </div>
            <div className="space-y-3 flex-1">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-2 ml-1">
                    <FileText className="w-4 h-4 text-primary/70" /> {t('attendance_modal.teachers_note', "Log Notes")}
                </h4>
                <div className="p-5 md:p-6 bg-card border border-border/60 shadow-sm rounded-2xl min-h-35 flex items-center justify-center text-center">
                    <p className={`text-sm md:text-base leading-relaxed ${selectedRecord.note ? 'text-foreground font-medium italic' : 'text-muted-foreground'}`}>
                        {selectedRecord.note || t('attendance_modal.no_note_provided', "No notes provided for this shift.")}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleClose}>
            <div className={`bg-card w-full max-w-5xl rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} style={{ transform: `translateY(${dragOffset}px)` }} onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden"><div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div></div>
                    
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            
                            {/* Dynamic Icon / Back Button */}
                            {viewLevel === "schools" ? (
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-inner z-30">
                                    <CalendarDays className="w-6 h-6 text-indigo-500" />
                                </div>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={handleBack} 
                                    onTouchStart={(e) => e.stopPropagation()} 
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-12 h-12 rounded-2xl bg-muted/50 hover:bg-muted flex items-center justify-center shrink-0 border border-border/60 transition-colors group shadow-sm relative z-30"
                                >
                                    <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-1 transition-transform" />
                                </button>
                            )}

                            <div>
                                {/* Dynamic Title */}
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground line-clamp-1 tracking-tight">
                                    {viewLevel === "schools" && t('attendance_modal.records_for', { month: monthData?.month })}
                                    {viewLevel === "categories" && selectedSchool?.name}
                                    {viewLevel === "overview" && selectedCategory?.name}
                                    {viewLevel === "detail" && selectedRecord?.date}
                                </h2>
                                
                                {/* Dynamic Subtitle */}
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium line-clamp-1">
                                    {viewLevel === "schools" && employeeName}
                                    {viewLevel === "categories" && t('attendance_modal.select_option_msg', 'Select a category to view records')}
                                    {viewLevel === "overview" && t('attendance_modal.overview_msg', 'Attendance Summary')}
                                    {viewLevel === "detail" && t('attendance_modal.daily_details_title', 'Shift Summary')}
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            onTouchStart={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors relative z-30"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-card">
                    <div key={viewLevel} className="h-full">
                        {viewLevel === "schools" && renderSchoolsList()}
                        {viewLevel === "categories" && renderCategoriesList()}
                        {viewLevel === "overview" && renderCategoryOverview()}
                        {viewLevel === "detail" && renderRecordDetail()}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminAttendanceDetailsModal;