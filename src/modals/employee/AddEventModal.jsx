import { useState, useEffect } from "react";
import { PartyPopper, Calendar, Clock, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next"; // <-- Added import

const AddEventModal = ({ isOpen, onClose, onSubmit, targetSchool, targetCategory, actionLoading }) => {
    const { t } = useTranslation(); // <-- Initialize hook
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [timeFrom, setTimeFrom] = useState("");
    const [timeTo, setTimeTo] = useState("");
    const [description, setDescription] = useState("");

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setStartDate("");
            setEndDate("");
            setTimeFrom("");
            setTimeTo("");
            setDescription("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit({
            schoolName: targetSchool,
            categoryName: targetCategory,
            startDate,
            // If end date is left empty, it defaults to the start date
            endDate: endDate || startDate,
            timeFrom,
            timeTo,
            description: description.trim()
        });
    };

    const isFormValid = startDate && timeFrom && timeTo && description.trim();

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card border border-border shadow-2xl w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                            <PartyPopper className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{t('add_event_modal.title')}</h2>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-62.5">
                                {targetSchool} • {targetCategory}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" /> {t('add_event_modal.from_date')}
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" /> {t('add_event_modal.to_date')} <span className="text-[10px] font-normal opacity-70">{t('add_event_modal.optional')}</span>
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate} // Prevent selecting an end date before start date
                                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" /> {t('add_event_modal.start_time')}
                            </label>
                            <input
                                type="time"
                                value={timeFrom}
                                onChange={(e) => setTimeFrom(e.target.value)}
                                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" /> {t('add_event_modal.end_time')}
                            </label>
                            <input
                                type="time"
                                value={timeTo}
                                onChange={(e) => setTimeTo(e.target.value)}
                                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" /> {t('add_event_modal.description_label')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('add_event_modal.description_placeholder')}
                            className="w-full min-h-25 rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/10 shrink-0 flex gap-3">
                    <Button variant="ghost" className="flex-1 h-11 rounded-xl font-semibold" onClick={onClose}>
                        {t('add_event_modal.cancel')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isFormValid || actionLoading}
                        className="flex-1 h-11 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-glow"
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('add_event_modal.save_event')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddEventModal;