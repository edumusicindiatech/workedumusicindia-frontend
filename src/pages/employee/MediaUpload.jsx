import { useState, useRef, useEffect } from "react";
import {
    Upload, AlertCircle, Image as ImageIcon,
    FileVideo, X, CheckCircle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MediaDetailsModal from "../../modals/employee/MediaDetailsModal";
import { useTranslation } from "react-i18next"; // <-- Added import

const MediaUpload = () => {
    const { t } = useTranslation(); // <-- Initialize hook
    const isUploadAllowed = true;
    const MAX_FILES = 5;

    // State Management
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // UI States
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const fileInputRef = useRef(null);

    // Clean up temporary thumbnail URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
        };
    }, [selectedFiles]);

    const triggerError = (msg) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(""), 5000);
    };

    const handleFileSelect = (e) => {
        if (!isUploadAllowed) return;

        const incomingFiles = Array.from(e.target.files);
        if (!incomingFiles.length) return;

        const totalFilesCount = selectedFiles.length + incomingFiles.length;
        let allowedFiles = incomingFiles;

        if (totalFilesCount > MAX_FILES) {
            triggerError(t('media_upload.error_limit', { count: MAX_FILES }));
            const availableSlots = MAX_FILES - selectedFiles.length;
            allowedFiles = incomingFiles.slice(0, availableSlots);
        } else {
            setErrorMsg("");
        }

        // Attach a preview URL for the thumbnail
        const filesWithPreviews = allowedFiles.map(file => Object.assign(file, {
            preview: URL.createObjectURL(file)
        }));

        setSelectedFiles(prev => [...prev, ...filesWithPreviews]);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleUploadClick = () => {
        if (!isUploadAllowed) {
            triggerError(t('media_upload.error_locked'));
            return;
        }
        fileInputRef.current.click();
    };

    const removeFile = (indexToRemove) => {
        const fileToRemove = selectedFiles[indexToRemove];
        URL.revokeObjectURL(fileToRemove.preview); // Memory cleanup
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleFinalSubmit = (details) => {
        setIsUploading(true);

        // Mocking API submission
        console.log("🚀 Uploading to Backend:", {
            filesCount: selectedFiles.length,
            files: selectedFiles.map(f => f.name),
            ...details
        });

        // Simulate network delay
        setTimeout(() => {
            setIsUploading(false);
            setIsModalOpen(false);

            // Clean up URLs and clear state
            selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
            setSelectedFiles([]);

            setSuccessMsg(t('media_upload.success_msg'));
            setTimeout(() => setSuccessMsg(""), 5000);
        }, 1500);
    };

    // ==========================================
    // RENDER: LOADING STATE (SHIMMER)
    // ==========================================
    const loading = false; // Setting this based on your original logic provided
    if (loading) {
        return (
            <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-4xl mx-auto pb-20">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-xl animate-pulse shrink-0" />
                        <div className="h-8 w-48 sm:w-64 bg-muted rounded-lg animate-pulse" />
                    </div>
                    <div className="h-5 w-3/4 sm:w-96 bg-muted/60 rounded-md animate-pulse" />
                </div>

                <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden relative">
                    <div className="bg-muted/20 border-b border-border/50 p-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="p-4 sm:p-6 space-y-6">
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted/80 rounded animate-pulse" />
                            <div className="w-full h-12 rounded-xl bg-muted animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted/80 rounded animate-pulse" />
                            <div className="w-full h-40 rounded-xl bg-muted animate-pulse" />
                        </div>
                        <div className="pt-4 border-t border-border/50 flex justify-end">
                            <div className="w-full sm:w-40 h-12 rounded-xl bg-muted animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-4xl mx-auto pb-20">

            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                    {t('media_upload.title')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('media_upload.subtitle')}
                </p>
            </div>

            {/* Notification Toasts */}
            {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-semibold text-sm">{errorMsg}</p>
                </div>
            )}

            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold text-sm">{successMsg}</p>
                </div>
            )}

            {/* Upload Zone */}
            {selectedFiles.length < MAX_FILES && (
                <div
                    onClick={handleUploadClick}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 relative overflow-hidden group
                        ${isUploadAllowed
                            ? "border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                            : "border-border/50 bg-muted/10 cursor-not-allowed opacity-70"
                        }`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        disabled={!isUploadAllowed}
                    />

                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm transition-transform duration-300
                        ${isUploadAllowed ? "bg-background text-primary group-hover:scale-110" : "bg-muted text-muted-foreground"}`}>
                        <Upload className="w-6 h-6" />
                    </div>

                    <h3 className={`text-lg font-bold mb-1 ${isUploadAllowed ? "text-foreground" : "text-muted-foreground"}`}>
                        {isUploadAllowed ? t('media_upload.dropzone_title') : t('media_upload.dropzone_locked')}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {isUploadAllowed
                            ? t('media_upload.dropzone_limit_info', { count: MAX_FILES - selectedFiles.length })
                            : t('media_upload.dropzone_locked_info')}
                    </p>
                </div>
            )}

            {/* File Review Section with Thumbnails */}
            {selectedFiles.length > 0 && (
                <div className="bg-card border border-border rounded-2xl shadow-card p-6 animate-in zoom-in-95 mt-6">

                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="font-bold text-lg">
                            {t('media_upload.selected_title', { current: selectedFiles.length, max: MAX_FILES })}
                        </h3>
                    </div>

                    {/* Rich Media Grid List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="bg-muted/30 border border-border/50 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-primary/30 transition-colors">

                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    {/* THUMBNAIL PREVIEW */}
                                    <div className="w-14 h-14 rounded-lg bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                                        {file.type.startsWith('video/') ? (
                                            <>
                                                <video src={file.preview} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <FileVideo className="w-6 h-6 text-white drop-shadow-md" />
                                                </div>
                                            </>
                                        ) : (
                                            <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                                        )}
                                    </div>

                                    {/* FILE INFO */}
                                    <div className="truncate flex-1">
                                        <p className="font-semibold text-sm text-foreground truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>

                                {/* REMOVE BUTTON */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                                    title={t('media_upload.remove_file')}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Proceed Button */}
                    <div className="pt-4 border-t border-border/50 flex justify-end">
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full sm:w-auto h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-base shadow-glow px-8"
                        >
                            {t('media_upload.btn_continue')} <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            <MediaDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleFinalSubmit}
                fileCount={selectedFiles.length}
                actionLoading={isUploading}
            />

        </div>
    );
};

export default MediaUpload;