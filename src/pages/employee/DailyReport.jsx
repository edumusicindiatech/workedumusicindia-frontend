import { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import {
    FileText, Calendar, MapPin,
    CheckCircle, Tag, ChevronDown, Check, Send, Loader2, Users, CalendarDays, PartyPopper, ChevronUp, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import CustomSelect from "../../components/ui/CustomSelect";

const DailyReport = () => {
    const { t } = useTranslation();

    const getTodayDateString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    const [loading, setLoading] = useState(false);

    // --- State for Assigned School ---
    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [liveSchools, setLiveSchools] = useState([]);
    const [isFetchingSchools, setIsFetchingSchools] = useState(false);

    // --- State for Band Category ---
    const [band, setBand] = useState("");
    const [bandStage, setBandStage] = useState("");

    // --- Form State ---
    const [category, setCategory] = useState("Regular Report");
    const [summary, setSummary] = useState("");
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState(getTodayDateString());
    const [studentsPresent, setStudentsPresent] = useState("");

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [timeFrom, setTimeFrom] = useState("09:00");
    const [timeTo, setTimeTo] = useState("17:00");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const todayFormatted = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch Logic
    const fetchFreshSchools = async () => {
        setIsFetchingSchools(true);
        try {
            const response = await api.get('/employee/me/profile');
            setLiveSchools(response.data.user.assignments || []);
        } catch (error) {
            console.error("Failed to fetch fresh schools:", error);
            toast.error("Could not load your latest school assignments.");
        } finally {
            setIsFetchingSchools(false);
        }
    };

    useEffect(() => {
        fetchFreshSchools();
    }, []);

    // Mapping Data for CustomSelect
    const schoolOptions = liveSchools.map(item => item.school?.schoolName || "Unnamed School") || [];

    const currentSelectedName = liveSchools.find(
        item => (item.school?._id || item.school) === selectedSchoolId
    )?.school?.schoolName || "";

    const handleSchoolSelect = (selectedName) => {
        const matchedAssignment = liveSchools.find(
            item => (item.school?.schoolName || "Unnamed School") === selectedName
        );
        if (matchedAssignment) {
            setSelectedSchoolId(matchedAssignment.school?._id || matchedAssignment.school);
        }
    };

    const isFormValid = () => {
        if (!selectedSchoolId) return false;
        if (!band) return false;
        if (!studentsPresent) return false;
        if (!bandStage.trim()) return false;
        if (!summary.trim()) return false;
        if (category === "Event Report") {
            if (!eventName.trim() || !eventDate) return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        const payload = {
            schoolId: selectedSchoolId,
            band,
            bandStage: bandStage.trim(),
            date: getTodayDateString(),
            category,
            studentsPresent: Number(studentsPresent),
            summary: summary.trim(),
            eventName: category === "Event Report" ? eventName.trim() : null,
            eventDate: category === "Event Report" ? eventDate : null,
            timeFrom: category === "Event Report" ? timeFrom : null,
            timeTo: category === "Event Report" ? timeTo : null,
        };

        try {
            await api.post('/employee/daily-report', payload);

            toast.success(t('daily_report.success_msg', 'Report submitted successfully!'));
            setSuccessMsg(t('daily_report.success_msg', 'Report submitted successfully!'));

            // Reset Form
            setSelectedSchoolId("");
            setBand("");
            setBandStage("");
            setSummary("");
            setEventName("");
            setCategory("Regular Report");
            setStudentsPresent("");
            setEventDate(getTodayDateString());

            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (error) {
            console.error("Failed to submit report", error);
            const errMsg = error.response?.data?.message || t('daily_report.error_msg', 'Error submitting report');
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-4 sm:p-8 h-96 bg-muted/20 animate-pulse rounded-3xl sm:rounded-[2.5rem] w-full max-w-4xl mx-auto mt-4" />;
    }

    return (
        <div className="animate-in fade-in duration-700 pb-24 md:pb-12 w-full max-w-[100vw] sm:max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 mt-2 md:mt-4 overflow-hidden sm:overflow-visible box-border">

            {/* Header */}
            <div className="mb-6 sm:mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
                <div className="flex items-center gap-3 sm:gap-4 md:gap-5 min-w-0 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase truncate">
                            {t('daily_report.title', 'Daily Report')}
                        </h1>
                        <p className="text-[10px] sm:text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                            <span className="truncate">{todayFormatted}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Success Notification */}
            {successMsg && (
                <div className="mb-5 sm:mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm w-full">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 shrink-0" />
                    <p className="font-extrabold text-[10px] sm:text-xs md:text-sm uppercase tracking-wider leading-snug">{successMsg}</p>
                </div>
            )}

            {/* Main Form Card (Removed overflow-hidden to prevent vertical cutoff, added max-w-full to prevent horizontal leak) */}
            <div className="bg-card rounded-4xl sm:rounded-3xl md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 relative flex flex-col w-full max-w-full min-w-0">
                {/* Top decorative gradient line */}
                <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-4xl sm:rounded-t-3xl md:rounded-t-[2.5rem]" />

                <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-5 sm:space-y-6 md:space-y-8 w-full max-w-full min-w-0">

                    {/* Assigned School Selection */}
                    <div className="space-y-2 sm:space-y-2.5 md:space-y-3 relative z-30 w-full min-w-0">
                        <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.assigned_school', 'Assigned Location')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative w-full max-w-full min-w-0">
                            <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-primary/70" />
                            </div>
                            {/* Target deep nested CustomSelect logic using descending classes to force word wrap and limit width */}
                            <div className="w-full max-w-full min-w-0 [&>div]:w-full [&>div]:max-w-full [&>div]:h-10 sm:[&>div]:h-12 md:[&>div]:h-14 [&>div]:rounded-xl sm:[&>div]:rounded-2xl [&>div]:bg-muted/20 [&>div]:border-border/60 [&>div]:pl-9 sm:[&>div]:pl-10 md:[&>div]:pl-11 [&>div]:text-xs sm:[&>div]:text-sm [&_ul]:w-full! [&_ul]:max-w-full! [&_ul]:overflow-x-hidden [&_li]:whitespace-normal! [&_li]:wrap-break-word! [&_li]:h-auto! [&_li]:py-2.5!">
                                <CustomSelect
                                    value={currentSelectedName}
                                    onChange={handleSchoolSelect}
                                    options={schoolOptions}
                                    onOpen={fetchFreshSchools}
                                    isLoading={isFetchingSchools}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Band Category Selection */}
                    <div className="space-y-2 sm:space-y-2.5 md:space-y-3 z-20 w-full min-w-0">
                        <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_band', 'Category')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex flex-col sm:flex-row bg-muted/20 border border-border/60 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl gap-1 sm:gap-0 w-full">
                            {['Junior Band', 'Senior Band'].map((b) => {
                                const isActive = band === b;
                                return (
                                    <button
                                        key={b}
                                        type="button"
                                        onClick={() => setBand(b)}
                                        className={`flex-1 py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-sm font-bold rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${isActive
                                            ? 'bg-primary text-primary-foreground shadow-md sm:scale-[0.98]'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                            }`}
                                    >
                                        {isActive && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                                        <span className="truncate">
                                            {b === 'Junior Band' ? (t('daily_report.junior_band', 'Junior Band')) : (t('daily_report.senior_band', 'Senior Band'))}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Selection Dropdown */}
                    <div className={`space-y-2 sm:space-y-2.5 md:space-y-3 relative w-full min-w-0 ${isDropdownOpen ? "z-50" : "z-10"}`} ref={dropdownRef}>
                        <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_category', 'Report Type')} <span className="text-destructive">*</span>
                        </Label>

                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full max-w-full h-10 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl border border-border/60 bg-muted/20 px-3.5 sm:px-4 md:px-5 text-xs sm:text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all hover:bg-muted/30"
                        >
                            <span className="text-foreground font-bold flex items-center gap-2 sm:gap-2.5 min-w-0">
                                <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/70 shrink-0" />
                                <span className="truncate">
                                    {category === "Regular Report" ? (t('daily_report.categories.regular', 'Regular Report')) : (t('daily_report.categories.event', 'Event Report'))}
                                </span>
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full max-w-full mt-1.5 sm:mt-2 bg-card border border-border/60 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50 max-h-60 overflow-y-auto">
                                <div className="p-1.5 sm:p-2 flex flex-col gap-1 w-full">
                                    {[
                                        { label: t('daily_report.categories.regular', 'Regular Report'), value: "Regular Report", icon: FileText },
                                        { label: t('daily_report.categories.event', 'Event Report'), value: "Event Report", icon: PartyPopper }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setCategory(option.value);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all duration-200 ${category === option.value
                                                ? "bg-primary/10 text-primary font-bold shadow-sm"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
                                                }`}
                                        >
                                            <span className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                                <option.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${category === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <span className="truncate">{option.label}</span>
                                            </span>
                                            {category === option.value && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Students Present Input */}
                    <div className="space-y-2 sm:space-y-2.5 md:space-y-3 relative z-0 animate-in fade-in slide-in-from-top-2 w-full min-w-0">
                        <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_students', 'No. of Students Present')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative group w-full max-w-full">
                            <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-primary/70" />
                            </div>
                            <Input
                                type="number"
                                min="0"
                                placeholder={t('daily_report.placeholder_students', 'e.g. 45')}
                                value={studentsPresent}
                                onChange={(e) => setStudentsPresent(e.target.value)}
                                className="w-full max-w-full h-10 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl bg-muted/20 border border-border/60 pl-9 sm:pl-10 md:pl-11 pr-10 sm:pr-12 text-xs sm:text-sm font-bold focus-visible:ring-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={() => setStudentsPresent(prev => prev ? String(Number(prev) + 1) : "1")}
                                    className="p-0.5 sm:p-1 md:p-1.5 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
                                >
                                    <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStudentsPresent(prev => (prev && Number(prev) > 0) ? String(Number(prev) - 1) : "0")}
                                    className="p-0.5 sm:p-1 md:p-1.5 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
                                >
                                    <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Band Stage Input */}
                    <div className="space-y-2 sm:space-y-2.5 md:space-y-3 relative z-0 animate-in fade-in slide-in-from-top-2 w-full min-w-0">
                        <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_band_stage', 'Band Stage')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative group w-full max-w-full">
                            <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-primary/70" />
                            </div>
                            <Input
                                type="text"
                                placeholder={t('daily_report.placeholder_band_stage', 'e.g. Beginner, Level 2, Performing')}
                                value={bandStage}
                                onChange={(e) => setBandStage(e.target.value)}
                                className="w-full max-w-full h-10 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl bg-muted/20 border border-border/60 pl-9 sm:pl-10 md:pl-11 pr-4 text-xs sm:text-sm font-bold focus-visible:ring-primary/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* Conditional Event Inputs */}
                    {category === "Event Report" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 animate-in fade-in slide-in-from-top-4 z-0 p-3 sm:p-4 md:p-5 bg-muted/10 border border-border/40 rounded-2xl sm:rounded-3xl md:rounded-4xl w-full">
                            <div className="space-y-2 sm:space-y-2.5 w-full min-w-0">
                                <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground ml-1">
                                    {t('daily_report.label_event_name', 'Event Name')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    placeholder={t('daily_report.placeholder_event_name', 'e.g. Annual Sports Day')}
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    className="w-full max-w-full h-10 sm:h-12 rounded-xl bg-card border-border/60 text-xs sm:text-sm focus-visible:ring-primary/30 font-medium"
                                />
                            </div>
                            <div className="space-y-2 sm:space-y-2.5 w-full min-w-0">
                                <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground ml-1">
                                    {t('daily_report.label_event_date', 'Event Date')} <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative w-full">
                                    <CalendarDays className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="date"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        className="w-full max-w-full h-10 sm:h-12 pl-9 sm:pl-10 text-xs sm:text-sm rounded-xl bg-card border-border/60 focus-visible:ring-primary/30 font-medium scheme-light dark:scheme-dark"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 col-span-1 sm:col-span-2 w-full">
                                <div className="space-y-2 w-full min-w-0">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-foreground ml-1">Start Time</Label>
                                    <Input className="w-full max-w-full h-10 sm:h-12 rounded-xl bg-card" type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
                                </div>
                                <div className="space-y-2 w-full min-w-0">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-foreground ml-1">End Time</Label>
                                    <Input className="w-full max-w-full h-10 sm:h-12 rounded-xl bg-card" type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Area */}
                    <div className="space-y-2 sm:space-y-2.5 md:space-y-3 z-0 w-full min-w-0">
                        <Label className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_summary', 'Daily Summary')} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder={t('daily_report.placeholder_summary', 'Write a detailed summary of your activities today...')}
                            className="w-full max-w-full min-h-32 sm:min-h-40 md:min-h-50 rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20 p-3.5 sm:p-4 md:p-5 text-xs sm:text-sm md:text-base font-medium resize-none focus-visible:ring-primary/30 focus:bg-background transition-all leading-relaxed shadow-inner"
                        />
                    </div>
                </div>

                {/* Footer / Submit Button */}
                <div className="p-4 sm:p-6 md:p-8 bg-muted/10 border-t border-border/50 shrink-0 w-full mt-auto">
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isSubmitting}
                        className="w-full max-w-full h-10 sm:h-12 md:h-14 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[11px] sm:text-xs md:text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all gap-2 sm:gap-3"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" /> <span className="truncate">{t('daily_report.btn_submitting', 'Submitting...')}</span></>
                        ) : (
                            <><span className="truncate">{t('daily_report.btn_submit', 'Submit Report')}</span> <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" /></>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DailyReport;