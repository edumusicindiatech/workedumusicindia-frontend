import { useState, useEffect, useRef } from "react";
import { School, MapPin, Tag, Calendar, FileText, Send, Loader2, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next"; // <-- Added import

const MediaDetailsModal = ({ isOpen, onClose, onSubmit, fileCount, actionLoading }) => {
    const { t } = useTranslation(); // <-- Initialize hook

    // Form States
    const [schoolName, setSchoolName] = useState("");
    const [location, setLocation] = useState("");
    const [category, setCategory] = useState("Regular"); // 'Regular' | 'Event'
    const [eventDate, setEventDate] = useState("");
    const [eventDescription, setEventDescription] = useState("");

    // Custom Select State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setSchoolName("");
            setLocation("");
            setCategory("Regular");
            setEventDate("");
            setEventDescription("");
            setIsDropdownOpen(false);
        }
    }, [isOpen]);

    // Handle clicking outside the custom select to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSubmit = () => {
        // Automatically capture the exact date/time if an event note is provided
        const autoEventDate = eventDescription.trim() ? new Date().toISOString() : null;

        onSubmit({
            schoolName: schoolName.trim(),
            location: location.trim(),
            category,
            eventDate: category === "Event" ? eventDate : null,
            eventDescription: category === "Event" ? eventDescription.trim() : null,
            autoEventDate // The backend timestamp
        });
    };

    // Validation: Require base fields, plus event fields if "Event" is selected
    const isFormValid = () => {
        if (!schoolName.trim() || !location.trim()) return false;
        if (category === "Event") {
            if (!eventDate || !eventDescription.trim()) return false;
        }
        return true;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card border border-border shadow-2xl w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            {t('media_details.title')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('media_details.subtitle', { count: fileCount })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors border border-transparent hover:border-border shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <School className="w-4 h-4 text-muted-foreground" /> {t('media_details.school_name')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('media_details.school_placeholder')}
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" /> {t('media_details.location')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('media_details.location_placeholder')}
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>

                        {/* CUSTOM SELECT FOR CATEGORY */}
                        <div className="space-y-2" ref={dropdownRef}>
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Tag className="w-4 h-4 text-muted-foreground" /> {t('media_details.category_label')}
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-muted/30"
                                >
                                    <span className="text-foreground font-medium">
                                        {category === "Regular" ? t('media_details.category_regular') : t('media_details.category_event')}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-1.5 flex flex-col gap-1">
                                            {["Regular", "Event"].map((option) => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategory(option);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${category === option
                                                        ? "bg-primary/10 text-primary font-bold"
                                                        : "text-foreground hover:bg-muted font-medium"
                                                        }`}
                                                >
                                                    {option === "Regular" ? t('media_details.category_regular') : t('media_details.category_event')}
                                                    {category === option && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conditional Event Fields */}
                    {category === "Event" && (
                        <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> {t('media_details.event_date')}
                                </label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> {t('media_details.event_description')}
                                </label>
                                <textarea
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                    placeholder={t('media_details.event_placeholder')}
                                    className="w-full min-h-25 rounded-xl border border-input bg-background p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-border bg-muted/10 shrink-0">
                    <Button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || actionLoading}
                        className="w-full h-12 rounded-xl font-bold shadow-glow text-base"
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        {t('media_details.submit_btn', { count: fileCount })}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MediaDetailsModal;