import { useState, useRef, useEffect } from "react";
import {
    FileText, Calendar, MapPin,
    CheckCircle, Tag, ChevronDown, Check, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Import Modal ---
import ActionItemsModal from "../../modals/ActionItemsModal";

const DailyReport = () => {
    // Auto-generate today's date in YYYY-MM-DD format for the date picker
    const getTodayDateString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    // State Management
    const [category, setCategory] = useState("Regular Report"); // 'Regular Report' | 'Event Report'
    const [summary, setSummary] = useState("");
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState(getTodayDateString());
    
    // Custom Select State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Modal & Submission State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    // Display Date
    const todayFormatted = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Close custom dropdown if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Form Validation before opening modal
    const isFormValid = () => {
        if (!summary.trim()) return false;
        if (category === "Event Report") {
            if (!eventName.trim() || !eventDate) return false;
        }
        return true;
    };

    // Triggered from the Modal
    const handleFinalSubmit = (actionItems) => {
        setIsSubmitting(true);

        const payload = {
            category,
            summary: summary.trim(),
            eventName: category === "Event Report" ? eventName.trim() : null,
            eventDate: category === "Event Report" ? eventDate : null,
            actionItems: actionItems.trim() || null
        };

        // Mock API Call 
        console.log("🚀 Submitting Daily Report:", payload);

        setTimeout(() => {
            setIsSubmitting(false);
            setIsModalOpen(false);
            
            // Reset Form
            setSuccessMsg("Daily report submitted successfully!");
            setSummary("");
            setEventName("");
            setCategory("Regular Report");
            setEventDate(getTodayDateString());

            setTimeout(() => setSuccessMsg(""), 4000);
        }, 1500);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <FileText className="w-6 h-6 text-primary" />
                    </div>
                    End of Day Report
                </h1>
                <p className="text-muted-foreground mt-2">
                    Summarize your field visits, outline challenges, and document events.
                </p>
            </div>

            {/* Success Toast */}
            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold text-sm">{successMsg}</p>
                </div>
            )}

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-visible">
                {/* Read-only Context Bar */}
                <div className="bg-muted/30 border-b border-border/50 p-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        {todayFormatted}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate max-w-50 sm:max-w-none">Uttar Pradesh, Sultanpur, 228001</span>
                    </div>
                </div>

                {/* Form */}
                <div className="p-4 sm:p-6 space-y-6">

                    {/* Custom Category Selection */}
                    <div className="space-y-2 relative z-20" ref={dropdownRef}>
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" /> Report Category
                        </label>
                        
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-muted/30"
                        >
                            <span className="text-foreground font-medium">{category}</span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-1.5 flex flex-col gap-1">
                                    {["Regular Report", "Event Report"].map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => {
                                                setCategory(option);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                                                category === option 
                                                    ? "bg-primary/10 text-primary font-bold" 
                                                    : "text-foreground hover:bg-muted font-medium"
                                            }`}
                                        >
                                            {option}
                                            {category === option && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Conditional Event Fields */}
                    {category === "Event Report" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 z-10">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">Event Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Annual Sports Day"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">Event Date</label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="space-y-2 z-10">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> Daily Summary
                        </label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Describe the schools visited, overall progress, and any challenges faced today..."
                            className="w-full min-h-40 rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow custom-scrollbar"
                        />
                    </div>

                    {/* Proceed Button */}
                    <div className="pt-4 border-t border-border/50 flex justify-end z-10">
                        <Button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            disabled={!isFormValid()}
                            className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-base shadow-glow flex items-center justify-center transition-all"
                        >
                            Continue to Review <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Final Submission Modal */}
            <ActionItemsModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleFinalSubmit}
                actionLoading={isSubmitting}
            />
        </div>
    );
};

export default DailyReport;