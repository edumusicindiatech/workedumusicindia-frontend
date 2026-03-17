import { useState } from "react";
import {
    FileText, Calendar, MapPin,
    CheckCircle, Send, ListChecks, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DailyReport = () => {
    // State Management
    // Category is auto-selected by default to ensure it's never missed
    const [category, setCategory] = useState("Routine Visit");
    const [summary, setSummary] = useState("");
    const [actionItems, setActionItems] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    // Get today's formatted date
    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Mock API Call - Replace with your actual Axios/Fetch request
        setTimeout(() => {
            setIsSubmitting(false);
            setSuccessMsg("Daily report submitted successfully!");
            setSummary("");
            setActionItems("");

            setTimeout(() => setSuccessMsg(""), 4000);
        }, 1000);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-8 h-8 text-primary" />
                    End of Day Report
                </h1>
                <p className="text-muted-foreground mt-1">
                    Summarize your field visits, outline challenges, and log your action items.
                </p>
            </div>

            {/* Success Toast */}
            {successMsg && (
                <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-semibold text-sm">{successMsg}</p>
                </div>
            )}

            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
                {/* Read-only Context Bar */}
                <div className="bg-muted/30 border-b border-border/50 p-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Calendar className="w-4 h-4 text-primary" />
                        {today}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <MapPin className="w-4 h-4 text-primary" />
                        uttar pradesh,sultanpur,228001
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">

                    {/* Category Selection */}
                    <div className="space-y-2 relative">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            Report Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none cursor-pointer"
                        >
                            <option value="Routine Visit">Routine Visit</option>
                            <option value="Special Assignment">Special Assignment</option>
                            <option value="Follow-up">Follow-up</option>
                            <option value="Administrative">Administrative</option>
                        </select>
                        {/* Custom Dropdown Arrow */}
                        <div className="absolute right-4 top-[38px] pointer-events-none text-muted-foreground text-xs">
                            ▼
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Daily Summary
                        </label>
                        <textarea
                            required
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Describe the schools visited, overall progress, and any immediate challenges faced today..."
                            className="w-full min-h-[150px] rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow custom-scrollbar"
                        />
                    </div>

                    {/* Action Items */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <ListChecks className="w-4 h-4 text-primary" />
                            Action Items & Next Steps
                        </label>
                        <textarea
                            value={actionItems}
                            onChange={(e) => setActionItems(e.target.value)}
                            placeholder="List any follow-ups required for tomorrow (e.g., Check attendance logs at Washington Middle School)..."
                            className="w-full min-h-[100px] rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow custom-scrollbar"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !summary.trim()}
                            className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-base shadow-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Daily Report
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DailyReport;