import React, { useState, useEffect } from "react";
import { X, ArrowLeft, School, Users, ChevronRight, FileText, CheckCircle2, Clock, AlertCircle, XCircle, Download, Coffee, Star, FolderOpen, CalendarOff, CalendarDays } from "lucide-react";
import * as XLSX from 'xlsx-js-style';
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // <-- Added import

const AdminAttendanceDetailsModal = ({ isOpen, onClose, monthData, employeeName }) => {
    const { t } = useTranslation(); // <-- Initialize t
    const [viewLevel, setViewLevel] = useState("schools"); // 'schools' | 'categories' | 'overview' | 'detail'
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setViewLevel("schools");
            setSelectedSchool(null);
            setSelectedCategory(null);
            setSelectedRecord(null);
        }
    }, [isOpen, monthData]);

    if (!isOpen || !monthData) return null;

    const handleBack = () => {
        if (viewLevel === "detail") setViewLevel("overview");
        else if (viewLevel === "overview") setViewLevel("categories");
        else if (viewLevel === "categories") setViewLevel("schools");
        else onClose();
    };

    // --- ADVANCED EXCEL EXPORT LOGIC ---
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

                                wsData.push([
                                    employeeName,
                                    monthData.month,
                                    school.name,
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
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('attendance_modal.records_for', { month: monthData.month })}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t('attendance_modal.select_school_msg')}</p>
                </div>
                <button onClick={handleExportExcel} className="text-sm font-bold flex items-center justify-center gap-2 border border-primary/20 text-primary bg-primary/5 hover:bg-primary hover:text-white px-4 py-2 rounded-xl transition-all shrink-0 shadow-sm">
                    <Download className="w-4 h-4" /> {t('attendance_modal.export_excel')}
                </button>
            </div>
            <div className="space-y-3">
                {monthData.schools.map(school => (
                    <div key={school.id} onClick={() => { setSelectedSchool(school); setViewLevel("categories"); }}
                        className={`flex items-center justify-between p-4 md:p-5 rounded-xl border border-border bg-card cursor-pointer group transition-all duration-300 ${school.isLeaveNode ? 'hover:bg-cyan-500/5 hover:border-cyan-500/40 hover:shadow-md' : 'hover:bg-muted/30 hover:border-indigo-500/40 hover:shadow-md'}`}>
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${school.isLeaveNode ? 'bg-cyan-500/10 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                {school.isLeaveNode ? <FolderOpen className="w-5 h-5" /> : <School className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-base md:text-lg text-foreground truncate">{school.name}</span>
                                <span className="text-xs font-medium text-muted-foreground mt-0.5">{t('attendance_modal.tap_to_view')}</span>
                            </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 shrink-0 transition-all duration-300 group-hover:translate-x-1 ${school.isLeaveNode ? 'text-muted-foreground/40 group-hover:text-cyan-500' : 'text-muted-foreground/40 group-hover:text-indigo-500'}`} />
                    </div>
                ))}
                {monthData.schools.length === 0 && <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">{t('attendance_modal.no_records_assigned')}</div>}
            </div>
        </div>
    );

    const renderCategoriesList = () => (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
            <div className="mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('attendance_modal.options_title', { name: selectedSchool.name })}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('attendance_modal.select_option_msg')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSchool.categories.map(cat => (
                    <div key={cat.id} onClick={() => { setSelectedCategory(cat); setViewLevel("overview"); }}
                        className={`flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-card cursor-pointer group transition-all text-center shadow-sm hover:-translate-y-1 hover:shadow-md ${cat.isLeaveNode ? 'hover:bg-cyan-500/5 hover:border-cyan-500/40' : 'hover:bg-muted/20 hover:border-violet-500/40'}`}>
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${cat.isLeaveNode ? 'bg-cyan-500/20 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white'}`}>
                            {cat.isLeaveNode ? <CalendarOff className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                        </div>
                        <span className="font-bold text-lg md:text-xl text-foreground mb-2">{cat.name}</span>
                        <span className="text-xs font-semibold px-3 py-1 bg-muted rounded-full text-muted-foreground border border-border">{cat.recordCount} {cat.isLeaveNode ? 'Requests' : 'Records'}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCategoryOverview = () => {
        if (selectedCategory.isLeaveNode) {
            return (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                    <div className="mb-6 md:mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                            <CalendarOff className="w-6 h-6 text-cyan-600" /> {t('attendance_modal.leave_records_title')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">{t('attendance_modal.leave_records_msg', { month: monthData.month })}</p>
                    </div>

                    <div className="space-y-4">
                        {selectedCategory.records.map(leave => (
                            <div key={leave.id} className="p-5 border border-cyan-500/20 bg-cyan-500/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-background px-3 py-1.5 rounded-lg border border-border">
                                        <CalendarDays className="w-4 h-4 text-cyan-600" />
                                        {leave.date}
                                    </div>
                                    <span className="px-2.5 py-1 bg-cyan-500 text-white rounded font-bold uppercase text-[10px] tracking-wider">{t('attendance_modal.approved_leave')}</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {t('attendance_modal.reason_provided')}</p>
                                        <p className="text-sm italic text-muted-foreground bg-background p-3 rounded-xl border border-border mt-1">"{leave.reason}"</p>
                                    </div>
                                    {leave.adminRemarks && (
                                        <div className="border-t border-dashed border-cyan-500/30 pt-3">
                                            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-1">{t('attendance_modal.admin_approval_note')}</p>
                                            <p className="text-xs text-cyan-800 font-medium">"{leave.adminRemarks}"</p>
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
                <div className="mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('attendance_modal.overview_title', { name: selectedCategory.name })}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t('attendance_modal.overview_msg')}</p>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">{t('attendance_modal.summary_metrics')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 md:mb-10">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-emerald-500 leading-none mb-1">{m.present}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80">Present</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-amber-500 leading-none mb-1">{m.late}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Late</span>
                    </div>
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <XCircle className="w-5 h-5 text-destructive mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-destructive leading-none mb-1">{m.absent}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-destructive/80">Absent</span>
                    </div>
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <Star className="w-5 h-5 text-violet-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-violet-500 leading-none mb-1">{m.events}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500/80">Events</span>
                    </div>
                    <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-4 flex flex-col items-center justify-center shadow-sm sm:col-span-1 lg:col-span-1 col-span-2">
                        <Coffee className="w-5 h-5 text-slate-400 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-slate-400 leading-none mb-1">{m.holidays}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80">Holidays</span>
                    </div>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">{t('attendance_modal.daily_breakdown')}</h4>
                <div className="space-y-3">
                    {selectedCategory.records.map(record => (
                        <div key={record.id} onClick={() => { setSelectedRecord(record); setViewLevel("detail"); }} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer group transition-colors gap-4 sm:gap-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-6 min-w-0">
                                <span className="font-bold text-sm md:text-base text-foreground sm:w-45 truncate">{record.date}</span>
                                <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 shrink-0"><Clock className="w-3.5 h-3.5" /> {record.time}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                <div className="flex items-center gap-3">
                                    {record.hasReport && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 tracking-wider">
                                            <FileText className="w-3 h-3" /> {t('attendance_modal.report_tag')}
                                        </span>
                                    )}
                                    <span className={`px-2.5 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider border ${getStatusStyle(record.status)}`}>
                                        {record.status}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                            </div>
                        </div>
                    ))}
                    {selectedCategory.records.length === 0 && <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">{t('attendance_modal.no_records_found')}</div>}
                </div>
            </div>
        );
    };

    const renderRecordDetail = () => (
        <div className="flex flex-col h-full max-w-2xl mx-auto w-full animate-in slide-in-from-right-4 duration-300">
            <div className="mb-6 md:mb-8 pb-4 md:pb-6 border-b border-border">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('attendance_modal.daily_details_title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('attendance_modal.viewing_details_for', { date: selectedRecord.date })}</p>
            </div>

            <div className="flex flex-col items-center justify-center p-8 md:p-12 bg-card border border-border rounded-2xl mb-8 relative shadow-sm">
                <span className={`absolute top-4 md:top-6 border px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(selectedRecord.status)}`}>
                    {selectedRecord.status}
                </span>

                <h3 className="text-2xl md:text-4xl font-black text-foreground mt-8 mb-8 text-center">{selectedRecord.date}</h3>

                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold text-sm w-full sm:w-auto">
                        <Clock className="w-4 h-4" /> In: {selectedRecord.checkIn}
                    </div>
                    <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-sm w-full sm:w-auto">
                        <ArrowLeft className="w-4 h-4 rotate-180" /> Out: {selectedRecord.checkOut}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" /> {t('attendance_modal.teachers_note')}
                </h4>
                <div className="p-5 md:p-6 bg-muted/20 border border-border rounded-xl min-h-25 flex items-center justify-center text-center">
                    <p className={`text-sm md:text-base ${selectedRecord.note ? 'text-foreground font-medium italic' : 'text-muted-foreground'}`}>
                        {selectedRecord.note || t('attendance_modal.no_note_provided')}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-background w-full max-w-5xl rounded-2xl shadow-2xl border border-border flex flex-col h-[95vh] md:h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
                    <button onClick={handleBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {viewLevel === "schools" && t('attendance_modal.back_to', { name: employeeName })}
                        {viewLevel === "categories" && t('attendance_modal.back_to_month_schools', { month: monthData.month })}
                        {viewLevel === "overview" && t('attendance_modal.back_to_overview', { name: selectedSchool?.name })}
                        {viewLevel === "detail" && t('attendance_modal.back_to_overview', { name: selectedCategory?.name })}
                    </button>

                    <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-background">
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