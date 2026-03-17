import { useState, useRef } from "react";
import {
    Upload, AlertCircle, Image as ImageIcon,
    FileVideo, X, MapPin, School, Send, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MediaUpload = () => {
    // Mock Admin Permission (Replace this with your actual user context/API state)
    const isUploadAllowed = true;
    const MAX_FILES = 5;

    // State Management
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [schoolName, setSchoolName] = useState("");
    const [location, setLocation] = useState("");

    // UI States
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const fileInputRef = useRef(null);

    const triggerError = (msg) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(""), 5000);
    };

    const handleFileSelect = (e) => {
        if (!isUploadAllowed) return;

        const incomingFiles = Array.from(e.target.files);
        if (!incomingFiles.length) return;

        const totalFilesCount = selectedFiles.length + incomingFiles.length;

        if (totalFilesCount > MAX_FILES) {
            triggerError(`Limit exceeded. You can only upload a maximum of ${MAX_FILES} files at a time.`);

            // Only take enough files to fill up to the limit of 5
            const availableSlots = MAX_FILES - selectedFiles.length;
            const allowedFiles = incomingFiles.slice(0, availableSlots);
            setSelectedFiles(prev => [...prev, ...allowedFiles]);
        } else {
            setSelectedFiles(prev => [...prev, ...incomingFiles]);
            setErrorMsg("");
        }

        // Reset input so the same files can be selected again if removed
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
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = () => {
        if (!schoolName || !location || selectedFiles.length === 0) return;

        // Mocking the API submission logic
        console.log("Submitting:", {
            filesCount: selectedFiles.length,
            schoolName,
            location
        });

        // Reset and show success
        setSelectedFiles([]);
        setSchoolName("");
        setLocation("");
        setSuccessMsg("All media files uploaded successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8 max-w-3xl mx-auto">

            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                    Site Media Upload
                </h1>
                <p className="text-muted-foreground mt-1">
                    Upload your site visit photos and videos (Maximum {MAX_FILES} files).
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
                <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-semibold text-sm">{successMsg}</p>
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
                        multiple // Enables selecting multiple files at once
                        className="hidden"
                        disabled={!isUploadAllowed}
                    />

                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm transition-transform duration-300
                        ${isUploadAllowed ? "bg-background text-primary group-hover:scale-110" : "bg-muted text-muted-foreground"}`}>
                        <Upload className="w-6 h-6" />
                    </div>

                    <h3 className={`text-lg font-bold mb-1 ${isUploadAllowed ? "text-foreground" : "text-muted-foreground"}`}>
                        {isUploadAllowed ? "Click to add media files" : "Upload Portal Locked"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {isUploadAllowed
                            ? `You can upload ${MAX_FILES - selectedFiles.length} more file(s).`
                            : "Please contact your admin to enable media uploads for your account."}
                    </p>
                </div>
            )}

            {/* File Review & Submission Form */}
            {selectedFiles.length > 0 && (
                <div className="bg-card border border-border rounded-2xl shadow-card p-6 animate-in zoom-in-95 mt-6">

                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-bold text-lg">Selected Files ({selectedFiles.length}/{MAX_FILES})</h3>
                    </div>

                    {/* Media Cards List */}
                    <div className="space-y-3 mb-6 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="p-2.5 bg-background rounded-lg shadow-sm text-primary shrink-0">
                                        {file.type.startsWith('video/') ? (
                                            <FileVideo className="w-5 h-5" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="truncate">
                                        <p className="font-semibold text-sm text-foreground truncate max-w-45 sm:max-w-xs">
                                            {file.name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Input Fields */}
                    <div className="space-y-4 mb-6 pt-4 border-t border-border/50">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">School Name</label>
                            <div className="relative">
                                <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="e.g., Ryan International School"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    className="w-full h-12 rounded-xl border border-input bg-background pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Ayodhya"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full h-12 rounded-xl border border-input bg-background pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={!schoolName.trim() || !location.trim() || selectedFiles.length === 0}
                        className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-base shadow-sm"
                    >
                        <Send className="w-4 h-4 mr-2" /> Upload {selectedFiles.length} File{selectedFiles.length !== 1 && 's'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default MediaUpload;