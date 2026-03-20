import { useState, useRef, useEffect } from "react";
import {
    Upload, AlertCircle, Image as ImageIcon,
    FileVideo, X, CheckCircle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MediaDetailsModal from "../../modals/MediaDetailsModal";

const MediaUpload = () => {
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
            triggerError(`Limit exceeded. You can only upload a maximum of ${MAX_FILES} files at a time.`);
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
            triggerError("Upload portal is currently locked. The Admin has not granted upload permissions at this time.");
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

            setSuccessMsg("All media files and details uploaded successfully!");
            setTimeout(() => setSuccessMsg(""), 5000);
        }, 1500);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-4xl mx-auto pb-20">

            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                    Site Media Upload
                </h1>
                <p className="text-muted-foreground mt-1">
                    Upload site visit photos and videos.
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
                        {isUploadAllowed ? "Click to select media files" : "Upload Portal Locked"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {isUploadAllowed
                            ? `You can select ${MAX_FILES - selectedFiles.length} more file(s).`
                            : "Please contact your admin to enable media uploads for your account."}
                    </p>
                </div>
            )}

            {/* File Review Section with Thumbnails */}
            {selectedFiles.length > 0 && (
                <div className="bg-card border border-border rounded-2xl shadow-card p-6 animate-in zoom-in-95 mt-6">

                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="font-bold text-lg">Selected Media ({selectedFiles.length}/{MAX_FILES})</h3>
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
                                    title="Remove File"
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
                            Continue to Details <ChevronRight className="w-5 h-5 ml-1" />
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