import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    CalendarDays, Clock, X, CheckCircle2, AlertCircle,
    XCircle, Coffee, School, ArrowLeft, ChevronRight,
    MessageSquareDashed, FileText, Download, Star,
    LogOut, ClipboardCheck, Users, Film
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const AttendanceDetailsModal = ({ selectedMonth, onClose }) => {
    const { t } = useTranslation();
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (!selectedMonth) {
            setSelectedSchool(null);
            setSelectedCategory(null);
            setSelectedDay(null);
        } else {
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [selectedMonth]);

    if (!selectedMonth) return null;

    // --- ANIMATION HANDLERS ---
    const handleCloseModal = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            setSelectedSchool(null);
            setSelectedCategory(null);
            setSelectedDay(null);
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.overflow-y-auto')) return;
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
        if (dragOffset > 120) handleCloseModal();
        else setDragOffset(0);
    };

    const handleBackNavigation = () => {
        if (selectedDay) {
            setSelectedDay(null);
        } else if (selectedCategory) {
            setSelectedCategory(null);
        } else if (selectedSchool) {
            setSelectedSchool(null);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Present: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            Late: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            Absent: 'bg-destructive/10 text-destructive border-destructive/20',
            Event: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
            Holiday: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        };
        return `px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shadow-sm ${styles[status] || styles.Holiday}`;
    };

    const handleExportExcel = () => {
        if (!selectedMonth || !selectedMonth.schools) return;

        const headers = [
            t('attendance_details.excel_headers.month'), t('attendance_details.excel_headers.school'),
            t('attendance_details.excel_headers.category'), t('attendance_details.excel_headers.address'),
            t('attendance_details.excel_headers.date'), t('attendance_details.excel_headers.in'),
            t('attendance_details.excel_headers.out'), t('attendance_details.excel_headers.status'),
            t('attendance_details.excel_headers.note')
        ];

        let rowsHtml = "";
        const escapeHtml = (text) => text?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || '';

        selectedMonth.schools.forEach(school => {
            const categories = school.categories || [
                { name: t('attendance_details.junior_band'), records: school.records || [] },
                { name: t('attendance_details.senior_band'), records: [] }
            ];

            categories.forEach(category => {
                if (category.records && category.records.length > 0) {
                    category.records.forEach(day => {
                        rowsHtml += `
                            <tr>
                                <td>${escapeHtml(selectedMonth.month)}</td>
                                <td>${escapeHtml(school.name)}</td>
                                <td>${escapeHtml(category.name)}</td>
                                <td>${escapeHtml(school.address)}</td>
                                <td>${escapeHtml(day.date)}</td>
                                <td>${escapeHtml(day.timeIn || "No Time")}</td>
                                <td>${escapeHtml(day.timeOut || "No Time")}</td>
                                <td>${escapeHtml(day.status)}</td>
                                <td>${escapeHtml(day.reason)}</td>
                            </tr>
                        `;
                    });
                }
            });
        });

        if (rowsHtml === "") {
            toast.error(t('attendance_details.export_error'));
            return;
        }

        const tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8" />
                <style>
                    th { font-weight: bold; background-color: #f3f4f6; border: 1px solid #000000; text-align: left; padding: 5px; }
                    td { border: 1px solid #cccccc; padding: 5px; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedMonth.month}_Attendance_Report.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(t('attendance_details.export_success'));
    };

    const displayCategories = selectedSchool?.categories || [
        {
            id: 'cat-1', name: t('attendance_details.junior_band'),
            stats: selectedSchool?.stats || { present: 0, late: 0, absent: 0, events: 0, holidays: 0, mediaSent: 0 },
            records: selectedSchool?.records || []
        },
        {
            id: 'cat-2', name: t('attendance_details.senior_band'),
            stats: { present: 0, late: 0, absent: 0, events: 0, holidays: 0, mediaSent: 0 },
            records: []
        }
    ];

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleCloseModal}>
            <div
                className={`bg-card w-full max-w-xl md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border-t md:border border-border/50 flex flex-col relative max-h-[95vh] md:max-h-[85vh] overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            {(selectedDay || selectedCategory || selectedSchool) ? (
                                <button onClick={handleBackNavigation} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-muted/50 hover:bg-muted flex items-center justify-center shrink-0 border border-border/60 transition-colors group">
                                    <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                            ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                    <CalendarDays className="w-5 h-5 sm:w-6 text-primary" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground truncate tracking-tight">
                                    {selectedDay ? t('attendance_details.daily_record_title')
                                        : selectedCategory ? selectedCategory.name
                                            : selectedSchool ? selectedSchool.name
                                                : selectedMonth.month}
                                </h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 truncate">
                                    {selectedDay ? t('attendance_details.viewing_details', { date: selectedDay.date })
                                        : selectedCategory ? selectedSchool.name
                                            : selectedSchool ? t('attendance_details.select_category_msg')
                                                : t('attendance_details.select_school_msg')}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleCloseModal} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY CONTENT */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar bg-card">

                    {!selectedSchool ? (
                        <div className="space-y-3">
                            {selectedMonth.schools && selectedMonth.schools.length > 0 ? (
                                selectedMonth.schools.map((school) => (
                                    <div
                                        key={school.id}
                                        onClick={() => setSelectedSchool(school)}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10 group-hover:scale-105 transition-transform shadow-sm">
                                                <School className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-extrabold text-base text-foreground truncate group-hover:text-primary transition-colors">{school.name}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-widest truncate">
                                                    {t('attendance_details.tap_category')}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 flex flex-col items-center justify-center bg-muted/10 rounded-4xl border border-dashed border-border/60">
                                    <School className="w-10 h-10 text-muted-foreground/30 mb-3" />
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('attendance_details.no_schools')}</p>
                                </div>
                            )}
                        </div>
                    ) :

                        !selectedCategory ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
                                {displayCategories.map((category) => {
                                    const totalRecords = (category.stats?.present || 0) + (category.stats?.late || 0) + (category.stats?.absent || 0) + (category.stats?.events || 0) + (category.stats?.holidays || 0);

                                    return (
                                        <div
                                            key={category.id || category.name}
                                            onClick={() => setSelectedCategory(category)}
                                            className="bg-muted/20 border border-border/60 rounded-4xl p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center text-center active:scale-[0.98] group"
                                        >
                                            <div className="w-16 h-16 rounded-3xl bg-violet-500/10 flex items-center justify-center text-violet-500 mb-4 group-hover:scale-110 transition-transform border border-violet-500/20 shadow-inner">
                                                <Users className="w-8 h-8" />
                                            </div>
                                            <h4 className="font-black text-lg text-foreground mb-2 tracking-tight group-hover:text-primary transition-colors">{category.name}</h4>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/60 px-3 py-1.5 rounded-xl">
                                                {totalRecords} {t('attendance_details.records_count')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) :

                            !selectedDay ? (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1.5" />
                                            <span className="text-2xl font-black text-emerald-500 leading-none">{selectedCategory.stats?.present || 0}</span>
                                            <span className="text-[9px] font-black text-emerald-600/80 uppercase tracking-[0.2em] mt-2 truncate w-full">{t('attendance_details.statuses.present')}</span>
                                        </div>
                                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <AlertCircle className="w-5 h-5 text-amber-500 mb-1.5" />
                                            <span className="text-2xl font-black text-amber-500 leading-none">{selectedCategory.stats?.late || 0}</span>
                                            <span className="text-[9px] font-black text-amber-600/80 uppercase tracking-[0.2em] mt-2 truncate w-full">{t('attendance_details.statuses.late')}</span>
                                        </div>
                                        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <XCircle className="w-5 h-5 text-destructive mb-1.5" />
                                            <span className="text-2xl font-black text-destructive leading-none">{selectedCategory.stats?.absent || 0}</span>
                                            <span className="text-[9px] font-black text-destructive/80 uppercase tracking-[0.2em] mt-2 truncate w-full">{t('attendance_details.statuses.absent')}</span>
                                        </div>
                                        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <Star className="w-5 h-5 text-violet-500 mb-1.5" />
                                            <span className="text-2xl font-black text-violet-500 leading-none">{selectedCategory.stats?.events || 0}</span>
                                            <span className="text-[9px] font-black text-violet-600/80 uppercase tracking-[0.2em] mt-2 truncate w-full">{t('attendance_details.statuses.event')}</span>
                                        </div>
                                        <div className="bg-slate-500/5 border border-slate-500/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <Coffee className="w-5 h-5 text-slate-500 mb-1.5" />
                                            <span className="text-2xl font-black text-slate-500 leading-none">{selectedCategory.stats?.holidays || 0}</span>
                                            <span className="text-[9px] font-black text-slate-600/80 uppercase tracking-[0.2em] mt-2 truncate w-full">{t('attendance_details.statuses.holiday')}</span>
                                        </div>
                                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                                            <Film className="w-5 h-5 text-blue-500 mb-1.5" />
                                            <span className="text-2xl font-black text-blue-500 leading-none">{selectedCategory.stats?.mediaSent || 0}</span>
                                            <span className="text-[9px] font-black text-blue-600/80 uppercase tracking-[0.2em] mt-2 truncate w-full">{t('attendance_details.statuses.media')}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-primary/70" /> {t('attendance_details.log_history')}
                                        </h3>
                                        <div className="grid gap-3">
                                            {selectedCategory.records && selectedCategory.records.length > 0 ? (
                                                selectedCategory.records.map((day, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setSelectedDay(day)}
                                                        className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer active:scale-[0.98] group"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-extrabold text-base text-foreground truncate">{day.date}</span>
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                                    <Clock className="w-3 h-3" /> {day.timeIn || "--:--"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            {day.dailyReport && (
                                                                <span className="flex items-center gap-1 text-[9px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg font-black border border-blue-500/20 uppercase tracking-widest">
                                                                    <ClipboardCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t('attendance_details.report_tag')}</span>
                                                                </span>
                                                            )}
                                                            <span className={getStatusBadge(day.status)}>
                                                                {day.status}
                                                            </span>
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 flex flex-col items-center justify-center bg-muted/10 rounded-4xl border border-dashed border-border/60">
                                                    <CalendarDays className="w-8 h-8 text-muted-foreground/30 mb-3" />
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('attendance_details.no_records')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (

                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                                    <div className="bg-muted/10 border border-border/60 rounded-4xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                                        <div className="mb-4">
                                            <span className={`${getStatusBadge(selectedDay.status)} px-4 py-1.5 text-xs`}>{selectedDay.status}</span>
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-4 tracking-tight">{selectedDay.date}</h3>

                                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">
                                                <Clock className="w-4 h-4" />
                                                {t('attendance_details.time_in')}: {selectedDay.timeIn || "--:--"}
                                            </div>
                                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/20 uppercase tracking-widest">
                                                <LogOut className="w-4 h-4" />
                                                {t('attendance_details.time_out')}: {selectedDay.timeOut || "--:--"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 flex-1 flex flex-col">
                                        {(selectedDay.reason || !selectedDay.dailyReport) && (
                                            <div className="space-y-3">
                                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-primary/70" /> {t('attendance_details.teachers_note')}
                                                </h3>

                                                <div className="bg-muted/20 border border-border/60 rounded-4xl p-6 shadow-sm flex flex-col justify-center min-h-30">
                                                    {selectedDay.reason ? (
                                                        <p className="text-sm sm:text-base text-foreground/90 italic leading-relaxed text-center font-medium">
                                                            "{selectedDay.reason}"
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                                            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
                                                                <MessageSquareDashed className="w-6 h-6 opacity-50" />
                                                            </div>
                                                            <p className="text-xs font-bold uppercase tracking-widest">{t('attendance_details.no_note_provided')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedDay.dailyReport && (
                                            <div className="space-y-3">
                                                <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                                    <ClipboardCheck className="w-3.5 h-3.5" /> {t('attendance_details.daily_report')}
                                                </h3>

                                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-4xl p-6 shadow-sm flex flex-col">
                                                    <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium whitespace-pre-wrap">
                                                        {selectedDay.dailyReport}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                </div>

                {/* FOOTER ACTION BUTTONS */}
                <div className="bg-muted/10 p-4 sm:p-6 border-t border-border/50 flex flex-col sm:flex-row justify-end gap-3 rounded-b-3xl pb-safe shrink-0">
                    {!selectedSchool && (
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider text-primary border-primary/30 hover:bg-primary/10 transition-all gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {t('attendance_details.export_btn')}
                        </Button>
                    )}
                    <Button
                        onClick={handleCloseModal}
                        className="w-full sm:w-auto h-12 sm:h-14 px-10 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-all shadow-lg active:scale-[0.98]"
                    >
                        {t('attendance_details.close_btn')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetailsModal;