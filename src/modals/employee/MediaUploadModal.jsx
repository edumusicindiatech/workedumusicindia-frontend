import { useState, useRef, useEffect } from "react";
import {
    Upload, AlertCircle, Image as ImageIcon, FileVideo,
    X, Loader2, Send, ChevronRight, ChevronLeft,
    Tag, Calendar, FileText, ChevronDown, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next"; // <-- Added import

const MediaUploadModal = ({ isOpen, onClose, onSubmit, targetSchool, targetCategory, actionLoading }) => {
    const { t } = useTranslation(); // <-- Initialize hook
    const MAX_FILES = 5;

    // Wizard State
    const [step, setStep] = useState(1);

    // Media States
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const fileInputRef = useRef(null);

    // Details States
    const [uploadCategory, setUploadCategory] = useState("Regular"); // 'Regular' | 'Event'
    const [eventDate, setEventDate] = useState("");
    const [eventDescription, setEventDescription] = useState("");

    // Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Clean up memory and states when modal closes/opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedFiles([]);
            setErrorMsg("");
            setUploadCategory("Regular");
            setEventDate("");
            setEventDescription("");
            setIsDropdownOpen(false);
        }
        return () => {
            selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
        };
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

    const triggerError = (msg) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(""), 5000);
    };

    const handleFileSelect = (e) => {
        const incomingFiles = Array.from(e.target.files);
        if (!incomingFiles.length) return;

        const totalFilesCount = selectedFiles.length + incomingFiles.length;
        let allowedFiles = incomingFiles;

        if (totalFilesCount > MAX_FILES) {
            triggerError(t('media_upload.limit_error', { count: MAX_FILES }));
            const availableSlots = MAX_FILES - selectedFiles.length;
            allowedFiles = incomingFiles.slice(0, availableSlots);
        } else {
            setErrorMsg("");
        }

        const filesWithPreviews = allowedFiles.map(file => Object.assign(file, {
            preview: URL.createObjectURL(file)
        }));

        setSelectedFiles(prev => [...prev, ...filesWithPreviews]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (indexToRemove) => {
        const fileToRemove = selectedFiles[indexToRemove];
        URL.revokeObjectURL(fileToRemove.preview);
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = () => {
        onSubmit({
            schoolName: targetSchool,
            categoryName: targetCategory,
            files: selectedFiles,
            uploadType: uploadCategory,
            eventDate: uploadCategory === "Event" ? eventDate : null,
            eventDescription: uploadCategory === "Event" ? eventDescription.trim() : null
        });
    };

    const isDetailsValid = uploadCategory === "Regular" || (eventDate && eventDescription.trim());

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card border border-border shadow-2xl w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0 transition-all">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="p-1.5 hover:bg-muted rounded-full transition-colors border border-transparent hover:border-border"
                            >
                                <ChevronLeft className="w-5 h-5 text-foreground" />
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                {step === 1 ? t('media_upload.title_step1') : t('media_upload.title_step2')}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-50 sm:max-w-62.5">
                                {targetSchool} • {targetCategory}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body: Step 1 - File Selection */}
                {step === 1 && (
                    <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar animate-in slide-in-from-left-4 fade-in duration-300">

                        {errorMsg && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p className="font-semibold text-xs leading-tight">{errorMsg}</p>
                            </div>
                        )}

                        {selectedFiles.length < MAX_FILES && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*,video/*"
                                    multiple
                                    className="hidden"
                                />
                                <div className="w-12 h-12 rounded-full bg-background text-primary flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-bold text-foreground mb-1">{t('media_upload.browse_files')}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {t('media_upload.upload_help', { count: MAX_FILES - selectedFiles.length })}
                                </p>
                            </div>
                        )}

                        {selectedFiles.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold">
                                        {t('media_upload.selected_files', { current: selectedFiles.length, max: MAX_FILES })}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="bg-muted/30 border border-border/50 rounded-xl p-2.5 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                <div className="w-12 h-12 rounded-lg bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                                                    {file.type.startsWith('video/') ? (
                                                        <>
                                                            <video src={file.preview} className="w-full h-full object-cover opacity-80" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <FileVideo className="w-5 h-5 text-white drop-shadow-md" />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="truncate flex-1">
                                                    <p className="font-semibold text-xs text-foreground truncate">{file.name}</p>
                                                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Body: Step 2 - Form Details */}
                {step === 2 && (
                    <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar animate-in slide-in-from-right-4 fade-in duration-300">

                        <div className="space-y-2" ref={dropdownRef}>
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Tag className="w-4 h-4 text-muted-foreground" /> {t('media_upload.media_type')}
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-muted/30"
                                >
                                    <span className="text-foreground font-medium">
                                        {uploadCategory === "Regular" ? t('media_upload.type_regular') : t('media_upload.type_event')}
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
                                                        setUploadCategory(option);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${uploadCategory === option
                                                        ? "bg-primary/10 text-primary font-bold"
                                                        : "text-foreground hover:bg-muted font-medium"
                                                        }`}
                                                >
                                                    {option === "Regular" ? t('media_upload.type_regular') : t('media_upload.type_event')}
                                                    {uploadCategory === option && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {uploadCategory === "Event" && (
                            <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> {t('media_upload.event_date')}
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
                                        <FileText className="w-4 h-4" /> {t('media_upload.event_context')}
                                    </label>
                                    <textarea
                                        value={eventDescription}
                                        onChange={(e) => setEventDescription(e.target.value)}
                                        placeholder={t('media_upload.context_placeholder')}
                                        className="w-full min-h-25 rounded-xl border border-input bg-background p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow custom-scrollbar"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/10 shrink-0 flex gap-3">
                    <Button variant="ghost" className="flex-1 h-11 rounded-xl font-semibold" onClick={onClose}>
                        {t('media_upload.btn_cancel')}
                    </Button>

                    {step === 1 ? (
                        <Button
                            onClick={() => setStep(2)}
                            disabled={selectedFiles.length === 0}
                            className="flex-1 h-11 rounded-xl font-bold shadow-sm"
                        >
                            {t('media_upload.btn_continue')} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!isDetailsValid || actionLoading}
                            className="flex-1 h-11 rounded-xl font-bold shadow-glow"
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <><Send className="w-4 h-4 mr-2" /> {selectedFiles.length === 1 ? t('media_upload.btn_upload_one', { count: 1 }) : t('media_upload.btn_upload_other', { count: selectedFiles.length })}</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaUploadModal;    