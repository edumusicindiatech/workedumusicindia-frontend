import { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import {
    FileText, Calendar, MapPin,
    CheckCircle, Tag, ChevronDown, Check, Send, Loader2, Users, CalendarDays, PartyPopper
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

    // --- Form State ---
    const [category, setCategory] = useState("Regular Report");
    const [summary, setSummary] = useState("");
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState(getTodayDateString());

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

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
            date: getTodayDateString(),
            category,
            summary: summary.trim(),
            eventName: category === "Event Report" ? eventName.trim() : null,
            eventDate: category === "Event Report" ? eventDate : null,
        };

        try {
            await api.post('/employee/daily-report', payload);

            setSuccessMsg(t('daily_report.success_msg', 'Report submitted successfully!'));

            // Reset Form
            setSelectedSchoolId("");
            setBand("");
            setSummary("");
            setEventName("");
            setCategory("Regular Report");
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
        return <div className="p-8 h-96 bg-muted/20 animate-pulse rounded-[2.5rem] max-w-4xl mx-auto mt-4" />;
    }

    return (
        <div className="animate-in fade-in duration-700 pb-24 md:pb-12 max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 mt-2 md:mt-4">
            
            {/* Header */}
            <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <FileText className="w-7 h-7 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">
                            {t('daily_report.title', 'Daily Report')}
                        </h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5 text-primary" /> {todayFormatted}
                        </p>
                    </div>
                </div>
            </div>

            {/* Success Notification */}
            {successMsg && (
                <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <CheckCircle className="w-6 h-6 shrink-0" />
                    <p className="font-extrabold text-sm uppercase tracking-wider">{successMsg}</p>
                </div>
            )}

            {/* Main Form Card */}
            <div className="bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20" />
                
                <div className="p-6 sm:p-10 space-y-8">
                    
                    {/* Assigned School Selection */}
                    <div className="space-y-3 relative z-30">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.assigned_school', 'Assigned Location')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                <MapPin className="w-4.5 h-4.5 text-primary/70" />
                            </div>
                            <div className="w-full [&>div]:h-13 [&>div]:rounded-2xl [&>div]:bg-muted/20 [&>div]:border-border/60 [&>div]:pl-11">
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
                    <div className="space-y-3 z-20">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_band', 'Category')} <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex bg-muted/20 border border-border/60 p-1.5 rounded-2xl">
                            {['Junior Band', 'Senior Band'].map((b) => {
                                const isActive = band === b;
                                return (
                                    <button
                                        key={b}
                                        type="button"
                                        onClick={() => setBand(b)}
                                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground shadow-md scale-[0.98]'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                        }`}
                                    >
                                        {isActive && <Check className="w-4 h-4" />}
                                        {b === 'Junior Band' ? (t('daily_report.junior_band', 'Junior Band')) : (t('daily_report.senior_band', 'Senior Band'))}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Selection Dropdown */}
                    <div className="space-y-3 relative z-10" ref={dropdownRef}>
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_category', 'Report Type')} <span className="text-destructive">*</span>
                        </Label>

                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full h-13 rounded-2xl border border-border/60 bg-muted/20 px-5 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all hover:bg-muted/30"
                        >
                            <span className="text-foreground font-bold flex items-center gap-2.5">
                                <Tag className="w-4 h-4 text-primary/70" />
                                {category === "Regular Report" ? (t('daily_report.categories.regular', 'Regular Report')) : (t('daily_report.categories.event', 'Event Report'))}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border/60 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-100">
                                <div className="p-2 flex flex-col gap-1">
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
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 ${category === option.value
                                                ? "bg-primary/10 text-primary font-bold shadow-sm"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
                                            }`}
                                        >
                                            <span className="flex items-center gap-2.5">
                                                <option.icon className={`w-4 h-4 ${category === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                                                {option.label}
                                            </span>
                                            {category === option.value && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Conditional Event Inputs */}
                    {category === "Event Report" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-4 z-0 p-5 bg-muted/10 border border-border/40 rounded-4xl">
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                    {t('daily_report.label_event_name', 'Event Name')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    placeholder={t('daily_report.placeholder_event_name', 'e.g. Annual Sports Day')}
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    className="h-12 rounded-xl bg-card border-border/60 focus-visible:ring-primary/30 font-medium"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                    {t('daily_report.label_event_date', 'Event Date')} <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="date"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        className="h-12 pl-10 rounded-xl bg-card border-border/60 focus-visible:ring-primary/30 font-medium scheme-light dark:scheme-dark"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Area */}
                    <div className="space-y-3 z-0">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground ml-1">
                            {t('daily_report.label_summary', 'Daily Summary')} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder={t('daily_report.placeholder_summary', 'Write a detailed summary of your activities today...')}
                            className="w-full min-h-50 rounded-3xl border border-border/60 bg-muted/20 p-5 text-base font-medium resize-none focus-visible:ring-primary/30 focus:bg-background transition-all leading-relaxed shadow-inner"
                        />
                    </div>
                </div>

                {/* Footer / Submit Button */}
                <div className="p-6 sm:p-8 bg-muted/10 border-t border-border/50">
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isSubmitting}
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all gap-3"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> {t('daily_report.btn_submitting', 'Submitting...')}</>
                        ) : (
                            <>{t('daily_report.btn_submit', 'Submit Report')} <Send className="w-5 h-5" /></>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DailyReport;