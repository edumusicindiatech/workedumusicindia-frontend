import React, { useState, useEffect } from "react";
import { X, ArrowLeft, School, Users, ChevronRight, FileText, CheckCircle2, Clock, PlaySquare, AlertCircle, XCircle, Download, Coffee, Star } from "lucide-react";
import * as XLSX from 'xlsx'; // Import SheetJS xlsx library
import toast from "react-hot-toast";

const AdminAttendanceDetailsModal = ({ isOpen, onClose, monthData, employeeName }) => {
    // State machine for drill-down navigation
    const [viewLevel, setViewLevel] = useState("schools"); // 'schools' | 'categories' | 'overview' | 'detail'
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Reset when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setViewLevel("schools");
            setSelectedSchool(null);
            setSelectedCategory(null);
            setSelectedRecord(null);
        }
    }, [isOpen, monthData]);

    if (!isOpen || !monthData) return null;

    // --- NAVIGATION HANDLERS ---
    const handleBack = () => {
        if (viewLevel === "detail") setViewLevel("overview");
        else if (viewLevel === "overview") setViewLevel("categories");
        else if (viewLevel === "categories") setViewLevel("schools");
        else onClose(); // Close modal if at root
    };

    // --- EXPORT TO EXCEL LOGIC ---
    const handleExportExcel = () => {
        try {
            const toastId = toast.loading("Generating Excel file...");
            const rowData = [];

            // 1. Loop through all data to flatten it for the spreadsheet
            monthData.schools.forEach(school => {
                school.categories.forEach(category => {
                    if (category.records && category.records.length > 0) {
                        category.records.forEach(record => {
                            // Clean up quotes from notes if they exist
                            const cleanNote = record.note ? record.note.replace(/['"]/g, '') : "N/A";

                            rowData.push({
                                "Employee Name": employeeName,
                                "Month": monthData.month,
                                "School Name": school.name,
                                "Category": category.name,
                                "Date": record.date,
                                "Status": record.status,
                                "Check In Time": record.checkIn || "-",
                                "Check Out Time": record.checkOut || "-",
                                "Event / Reason Note": cleanNote
                            });
                        });
                    }
                });
            });

            // If no records exist across all schools
            if (rowData.length === 0) {
                toast.error("No attendance records found for this month.", { id: toastId });
                return;
            }

            // 2. Create Worksheet
            const worksheet = XLSX.utils.json_to_sheet(rowData);

            // 3. Apply Bold Headlines and styling
            // Define header range (e.g., A1:I1)
            const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
            for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                const headerAddress = XLSX.utils.encode_col(C) + "1";
                if (!worksheet[headerAddress]) continue;
                worksheet[headerAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } }, // Bold, white text
                    fill: { fgColor: { rgb: "4F46E5" } }, // Indigo background for header
                    alignment: { horizontal: "center" }
                };
            }

            // 4. Adjust Column Widths (for better readability)
            const colWidths = [
                { wch: 20 }, // Employee Name
                { wch: 15 }, // Month
                { wch: 25 }, // School Name
                { wch: 20 }, // Category
                { wch: 25 }, // Date
                { wch: 12 }, // Status
                { wch: 15 }, // Check In Time
                { wch: 15 }, // Check Out Time
                { wch: 40 }  // Event / Reason Note (wider)
            ];
            worksheet['!cols'] = colWidths;

            // 5. Create Workbook and add the worksheet
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");

            // 6. Set bold headlines for the sheet (meta property)
            worksheet['!rowHeaderBold'] = true;

            // 7. Generate Excel file and trigger download
            const fileName = `${employeeName.replace(' ', '_')}_Attendance_${monthData.month.replace(' ', '_')}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast.success("Excel file generated successfully!", { id: toastId });
        } catch (error) {
            console.error("Excel Export Error:", error);
            toast.error("Failed to generate Excel file.");
        }
    };

    // --- UI HELPERS ---
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

    // --- RENDER BLOCKS ---
    const renderSchoolsList = () => (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">Schools Visited in {monthData.month}</h2>
                    <p className="text-sm text-muted-foreground mt-1">Select a school to view its categories.</p>
                </div>
                {/* HEADLINE: 'Export Excel' is here. The click triggers the flatten function */}
                <button onClick={handleExportExcel} className="text-sm font-semibold flex items-center justify-center gap-2 border border-border bg-card px-4 py-2 rounded-xl hover:bg-muted transition-colors shrink-0">
                    <Download className="w-4 h-4" /> Export Excel
                </button>
            </div>
            <div className="space-y-3">
                {monthData.schools.map(school => (
                    <div key={school.id} onClick={() => { setSelectedSchool(school); setViewLevel("categories"); }} className="flex items-center justify-between p-4 md:p-5 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer group transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                <School className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-base md:text-lg text-foreground truncate">{school.name}</span>
                                <span className="text-xs font-medium text-muted-foreground mt-0.5">Tap to select a category</span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground shrink-0 transition-colors" />
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCategoriesList = () => (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
            <div className="mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">{selectedSchool.name} Categories</h2>
                <p className="text-sm text-muted-foreground mt-1">Select a band to view detailed statistics.</p>
            </div>
            {/* MOBILE UI: single column grid for categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSchool.categories.map(cat => (
                    <div key={cat.id} onClick={() => { setSelectedCategory(cat); setViewLevel("overview"); }} className="flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer group transition-colors text-center shadow-sm hover:shadow-md">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Users className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <span className="font-bold text-lg md:text-xl text-foreground mb-2">{cat.name}</span>
                        <span className="text-xs font-semibold px-3 py-1 bg-muted rounded-full text-muted-foreground border border-border">{cat.recordCount} Records</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCategoryOverview = () => {
        const m = selectedCategory.metrics;
        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                <div className="mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">{selectedCategory.name} Overview</h2>
                    <p className="text-sm text-muted-foreground mt-1">A comprehensive breakdown of attendance activity.</p>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3 headline-bold">Summary Metrics</h4>
                {/* Responsive Grid: 1 col mobile, 3 cols tablet, 5 cols desktop. Vertical stack on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 md:mb-10">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-emerald-500 leading-none mb-1">{m.present}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 headline-bold Present">Present</span>
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
                    <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-4 flex flex-col items-center justify-center shadow-sm">
                        <Coffee className="w-5 h-5 text-slate-400 mb-2" />
                        <span className="text-2xl md:text-3xl font-black text-slate-400 leading-none mb-1">{m.holidays}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80">Holidays</span>
                    </div>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3 headline-bold Daily Breakdown">Daily Breakdown</h4>
                <div className="space-y-3">
                    {selectedCategory.records.map(record => (
                        <div key={record.id} onClick={() => { setSelectedRecord(record); setViewLevel("detail"); }} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer group transition-colors gap-4 sm:gap-0">
                            {/* MOBILE UI: Breakdown row text reordered and stacked */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-6 min-w-0">
                                <span className="font-bold text-sm md:text-base text-foreground sm:w-45 truncate Headline">{record.date}</span>
                                <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 shrink-0 Subline"><Clock className="w-3.5 h-3.5" /> {record.time}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                <div className="flex items-center gap-3">
                                    {record.hasReport && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 tracking-wider headline-bold Report">
                                            <FileText className="w-3 h-3" /> REPORT
                                        </span>
                                    )}
                                    <span className={`px-2.5 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider border headline-bold Status ${getStatusStyle(record.status)}`}>
                                        {record.status}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground shrink-0 transition-colors" />
                            </div>
                        </div>
                    ))}
                    {selectedCategory.records.length === 0 && <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">No records found for this category.</div>}
                </div>
            </div >
        );
    };

    const renderRecordDetail = () => (
        <div className="flex flex-col h-full max-w-2xl mx-auto w-full animate-in slide-in-from-right-4 duration-300">
            <div className="mb-6 md:mb-8 pb-4 md:pb-6 border-b border-border">
                <h2 className="text-xl md:text-2xl font-bold text-foreground Headline headline-bold">Daily Record Details</h2>
                <p className="text-sm text-muted-foreground mt-1 Subline">Viewing details for {selectedRecord.date}</p>
            </div>

            <div className="flex flex-col items-center justify-center p-8 md:p-12 bg-card border border-border rounded-2xl mb-8 relative shadow-sm">
                <span className={`absolute top-4 md:top-6 border px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest headline-bold Status ${getStatusStyle(selectedRecord.status)}`}>
                    {selectedRecord.status}
                </span>

                <h3 className="text-2xl md:text-4xl font-black text-foreground mt-8 mb-8 text-center Headline headline-bold">{selectedRecord.date}</h3>

                {/* Responsive vertical stack on mobile */}
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold text-sm w-full sm:w-auto In">
                        <Clock className="w-4 h-4" /> In: {selectedRecord.checkIn}
                    </div>
                    <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-sm w-full sm:w-auto Out">
                        <ArrowLeft className="w-4 h-4 rotate-180" /> Out: {selectedRecord.checkOut}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2 mb-2 headline-bold Teacher's Note">
                    <FileText className="w-4 h-4 text-muted-foreground" /> Teacher's Note
                </h4>
                <div className="p-5 md:p-6 bg-muted/20 border border-border rounded-xl min-h-25 flex items-center justify-center text-center">
                    <p className={`text-sm md:text-base ${selectedRecord.note ? 'text-foreground font-medium italic headline-bold Note' : 'text-muted-foreground'}`}>
                        {selectedRecord.note || "No note provided for this record."}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-background w-full max-w-5xl rounded-2xl shadow-2xl border border-border flex flex-col h-[95vh] md:h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>

                {/* Fixed Top Header/Nav */}
                <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0 Headline headline-bold">
                    <button onClick={handleBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group headline-bold Back Button">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {viewLevel === "schools" && `Back to ${employeeName}`}
                        {viewLevel === "categories" && `Back to ${monthData.month} Schools`}
                        {viewLevel === "overview" && `Back to ${selectedSchool?.name}`}
                        {viewLevel === "detail" && `Back to ${selectedCategory?.name} Overview`}
                    </button>

                    <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0 Close Button">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Dynamic Body, no media, responsive padding/sizes. Smooth transitions between levels */}
                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-background Container">
                    {viewLevel === "schools" && renderSchoolsList()}
                    {viewLevel === "categories" && renderCategoriesList()}
                    {viewLevel === "overview" && renderCategoryOverview()}
                    {viewLevel === "detail" && renderRecordDetail()}
                </div>
            </div>
        </div>
    );
};

export default AdminAttendanceDetailsModal;