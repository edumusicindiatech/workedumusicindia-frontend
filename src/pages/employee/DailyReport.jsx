import { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import {
    FileText, Calendar, MapPin,
    CheckCircle, Tag, ChevronDown, Check, Send, Loader2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
        if (!band) return false; // Ensure Band is selected
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
            band, // Include the selected band
            date: getTodayDateString(),
            category,
            summary: summary.trim(),
            eventName: category === "Event Report" ? eventName.trim() : null,
            eventDate: category === "Event Report" ? eventDate : null,
        };

        try {
            await api.post('/employee/daily-report', payload);

            setIsSubmitting(false);
            setSuccessMsg(t('daily_report.success_msg') || 'Report submitted successfully');

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
            const errMsg = error.response?.data?.message || t('daily_report.error_msg') || 'Error submitting report';
            toast.error(errMsg);
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 h-96 bg-muted/20 animate-pulse rounded-3xl max-w-4xl mx-auto" />;
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <FileText className="w-6 h-6 text-primary" />
                    </div>
                    {t('daily_report.title') || 'Daily Report'}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {t('daily_report.subtitle') || 'Submit your daily activities'}
                </p>
            </div>

            {/* Success Notification */}
            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold text-sm">{successMsg}</p>
                </div>
            )}

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-visible">
                <div className="bg-muted/30 border-b border-border/50 p-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        {todayFormatted}
                    </div>
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                    
                    {/* Assigned School Selection */}
                    <div className="space-y-2 relative z-30">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> {t('daily_report.assigned_school') || 'Assigned School'} <span className="text-destructive">*</span>
                        </label>
                        <CustomSelect 
                            value={currentSelectedName} 
                            onChange={handleSchoolSelect} 
                            options={schoolOptions}
                            onOpen={fetchFreshSchools}
                            isLoading={isFetchingSchools}
                        />
                    </div>

                    {/* --- NEW: Band Category Selection --- */}
                    <div className="space-y-2 z-20">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> {t('daily_report.label_band') || 'Band Category'} <span className="text-destructive">*</span>
                        </label>
                        <div className="flex bg-muted/30 border border-input p-1 rounded-xl">
                            {['Junior Band', 'Senior Band'].map((b) => {
                                const isActive = band === b;
                                return (
                                    <button
                                        key={b}
                                        type="button"
                                        onClick={() => setBand(b)}
                                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        }`}
                                    >
                                        {isActive && <Check className="w-4 h-4" />}
                                        {b === 'Junior Band' ? (t('daily_report.junior_band') || 'Junior Band') : (t('daily_report.senior_band') || 'Senior Band')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2 relative z-10" ref={dropdownRef}>
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" /> {t('daily_report.label_category') || 'Category'}
                        </label>

                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-muted/30"
                        >
                            <span className="text-foreground font-medium">
                                {category === "Regular Report" ? (t('daily_report.categories.regular') || 'Regular Report') : (t('daily_report.categories.event') || 'Event Report')}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-1.5 flex flex-col gap-1">
                                    {[
                                        { label: t('daily_report.categories.regular') || 'Regular Report', value: "Regular Report" },
                                        { label: t('daily_report.categories.event') || 'Event Report', value: "Event Report" }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setCategory(option.value);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${category === option.value
                                                ? "bg-primary/10 text-primary font-bold"
                                                : "text-foreground hover:bg-muted font-medium"
                                                }`}
                                        >
                                            {option.label}
                                            {category === option.value && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Conditional Event Inputs */}
                    {category === "Event Report" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 z-0">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">{t('daily_report.label_event_name') || 'Event Name'}</label>
                                <input
                                    type="text"
                                    placeholder={t('daily_report.placeholder_event_name') || 'Enter event name'}
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">{t('daily_report.label_event_date') || 'Event Date'}</label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>
                        </div>
                    )}

                    {/* Summary Area */}
                    <div className="space-y-2 z-0">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> {t('daily_report.label_summary') || 'Summary'}
                        </label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder={t('daily_report.placeholder_summary') || 'Write your summary here...'}
                            className="w-full min-h-40 rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow custom-scrollbar"
                        />
                    </div>

                    <div className="pt-4 border-t border-border/50 flex justify-end z-0">
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isFormValid() || isSubmitting}
                            className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-base shadow-glow flex items-center justify-center transition-all"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('daily_report.btn_submitting') || 'Submitting...'}</>
                            ) : (
                                <>{t('daily_report.btn_submit') || 'Submit Report'} <Send className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyReport;