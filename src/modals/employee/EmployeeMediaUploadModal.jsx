import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
    UploadCloud, X, Film, Info, MapPin,
    CalendarDays, ChevronRight, Users, CheckCircle2, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import CustomSelect from "../../components/ui/CustomSelect";

const EmployeeMediaUploadModal = ({ isOpen, onClose }) => {
    const { user, isHydrating } = useSelector((state) => state.auth);

    // Form State
    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [band, setBand] = useState("");
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [studentsCount, setStudentsCount] = useState("");
    const [files, setFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    // 🔥 NEW: Internal Upload State to protect mobile memory
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    const fileInputRef = useRef(null);

    // Lock the Escape key if uploading
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && !isUploading) onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose, isUploading]);

    if (!isOpen) return null;

    const schoolOptions = user?.assignments?.map(item => item.school?.schoolName || "Unnamed School") || [];
    const currentSelectedName = user?.assignments?.find(
        item => (item.school?._id || item.school) === selectedSchoolId
    )?.school?.schoolName || "";

    const handleSchoolSelect = (selectedName) => {
        const matchedAssignment = user?.assignments?.find(
            item => (item.school?.schoolName || "Unnamed School") === selectedName
        );
        if (matchedAssignment) {
            setSelectedSchoolId(matchedAssignment.school?._id || matchedAssignment.school);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const availableSlots = 5 - files.length;
        if (selectedFiles.length > availableSlots) {
            toast.error(`Limit reached: Only ${availableSlots} more allowed.`);
            setFiles((prev) => [...prev, ...selectedFiles.slice(0, availableSlots)]);
        } else {
            setFiles((prev) => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

    // 🔥 THE BULLETPROOF MOBILE UPLOAD LOGIC
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSchoolId) return toast.error("Please select a school.");
        if (!band) return toast.error("Band category is required.");
        if (files.length === 0) return toast.error("Please add at least one video.");

        const MAX_SIZE = 200 * 1024 * 1024;
        if (files.some(f => f.size > MAX_SIZE)) {
            return toast.error("Files exceed 200MB limit. Please compress them.");
        }

        setIsUploading(true);
        setUploadProgress(0);
        const successfulUploads = [];
        const failedFiles = [];
        const toastId = toast.loading("Initializing secure upload...", { position: 'bottom-right' });

        const metadata = {
            schoolId: selectedSchoolId,
            schoolName: currentSelectedName,
            band, eventName, eventDate, studentsCount
        };

        try {
            // PHASE 1: Get Presigned URLs
            setUploadStatus("Requesting secure server access...");
            const filePayload = files.map(f => ({ name: f.name, type: f.type }));
            const { data: urlData } = await api.post('/employee/media/generate-urls', {
                files: filePayload, metadata
            });

            // PHASE 2: Sequential Mobile-Safe XHR Upload
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const targetUrl = urlData.urls[i].uploadUrl;
                const publicUrl = urlData.urls[i].publicUrl;

                setUploadStatus(`Uploading video ${i + 1} of ${files.length}`);
                setUploadProgress(0); // Reset progress for the new file
                toast.loading(`Uploading video ${i + 1} of ${files.length}... ⚠️ Keep app open.`, { id: toastId });

                // We wrap the older XMLHttpRequest in a Promise so we can 'await' it
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", targetUrl, true);
                    xhr.setRequestHeader("Content-Type", file.type);

                    // This tracks the live percentage!
                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = Math.round((event.loaded / event.total) * 100);
                            setUploadProgress(percentComplete);
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            successfulUploads.push({ url: publicUrl, fileType: 'video' });
                            resolve();
                        } else {
                            reject(new Error(`Cloudflare rejected upload. Status: ${xhr.status}`));
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error("Network error. Connection lost."));
                    };

                    // Send the file directly from memory
                    xhr.send(file);
                }).catch((err) => {
                    console.error(`Failed to upload ${file.name}`, err);
                    failedFiles.push(file.name);
                });
            }

            // PHASE 3: Save to Database
            if (successfulUploads.length > 0) {
                setUploadStatus("Finalizing records...");
                setUploadProgress(100);
                toast.loading("Saving to Vault...", { id: toastId });
                await api.post('/employee/media/save-log', {
                    ...metadata,
                    uploadedFiles: successfulUploads
                });
            }

            // PHASE 4: Cleanup & Success
            toast.dismiss(toastId);

            if (failedFiles.length === 0) {
                toast.success("All media successfully uploaded!", { duration: 5000 });
            } else {
                toast.error(`Uploaded ${successfulUploads.length}/${files.length}. Failed: ${failedFiles.join(', ')}`, { duration: 8000 });
                api.post('/employee/media/send-failure-email', {
                    failedFiles, eventContext: eventName || "Regular Visit", schoolId: selectedSchoolId
                }).catch(() => console.log("Offline error logging skipped."));
            }

            window.dispatchEvent(new Event('refreshMediaGallery'));
            onClose();

        } catch (error) {
            console.error("Upload Error:", error);
            toast.dismiss(toastId);
            toast.error("Upload failed. Please check your network.", { duration: 6000 });
            setIsUploading(false);
            setUploadStatus("");
            setUploadProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-700/50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border dark:border-slate-800 bg-muted/20">
                    <div>
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight">Upload to Vault</h2>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Add performance videos to your school's secure gallery.</p>
                    </div>
                    {/* Disable the X button if uploading so they don't break the process */}
                    <button
                        onClick={() => !isUploading && onClose()}
                        disabled={isUploading}
                        className={`p-2.5 rounded-xl transition-all duration-300 ${isUploading ? 'opacity-30 cursor-not-allowed' : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="media-upload-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* OVERLAY: Shows exactly what is happening during the upload */}
                    {isUploading && (
                        <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">

                            {/* Circular Progress Indicator */}
                            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted/30" />
                                    <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="6" fill="transparent"
                                        strokeDasharray={283}
                                        strokeDashoffset={283 - (283 * uploadProgress) / 100}
                                        className="text-primary transition-all duration-300 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-black text-primary">{uploadProgress}%</span>
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-foreground mb-2">Uploading Media</h3>
                            <p className="text-primary font-bold">{uploadStatus}</p>

                            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-xs">
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 leading-relaxed">
                                    ⚠️ Keep your screen on.<br />Do not close this app or lock your phone until finished.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="p-5 rounded-2xl bg-background/50 dark:bg-[#0d1117]/50 border border-border dark:border-slate-800 space-y-5">
                        <div className="relative z-20">
                            <label className="block text-[13px] font-bold text-foreground mb-2 uppercase tracking-wider">
                                Assigned School <span className="text-destructive">*</span>
                            </label>
                            {isHydrating ? (
                                <div className="h-10.5 flex items-center px-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 rounded-lg text-sm text-muted-foreground">
                                    Loading schools...
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <div className="absolute left-3 z-10 pointer-events-none">
                                        <MapPin className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="w-full pl-8">
                                        <CustomSelect
                                            value={currentSelectedName}
                                            onChange={handleSchoolSelect}
                                            options={schoolOptions}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative z-10">
                            <label className="block text-[13px] font-bold text-foreground mb-2 uppercase tracking-wider">
                                Band Category <span className="text-destructive">*</span>
                            </label>
                            <div className="flex bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 p-1 rounded-xl">
                                {['Junior Band', 'Senior Band'].map((b) => {
                                    const isActive = band === b;
                                    return (
                                        <button
                                            key={b}
                                            type="button"
                                            onClick={() => setBand(b)}
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${isActive
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                }`}
                                        >
                                            {isActive && <CheckCircle2 className="w-4 h-4" />}
                                            {b}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl bg-background/50 dark:bg-[#0d1117]/50 border border-border dark:border-slate-800">
                        <div className="space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">Event Name <span className="text-muted-foreground lowercase font-medium tracking-normal">(Optional)</span></label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Spring Concert" className="w-full h-11 pl-11 pr-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">Event Date {eventName && <span className="text-destructive">*</span>}</label>
                            <div className="relative">
                                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full h-11 px-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all scheme-light dark:scheme-dark" />
                            </div>
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">Students Present <span className="text-muted-foreground lowercase font-medium tracking-normal">(Optional)</span></label>
                            <div className="relative sm:w-1/2">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                <input type="number" value={studentsCount} onChange={(e) => setStudentsCount(e.target.value)} placeholder="0" className="w-full h-11 pl-11 pr-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">
                                Video Files <span className="text-destructive">*</span>
                            </label>
                            <span className="text-[11px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                {files.length} / 5
                            </span>
                        </div>

                        <div
                            onClick={() => !isUploading && files.length < 5 && fileInputRef.current?.click()}
                            className={`w-full flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed rounded-2xl transition-all duration-300 ${files.length >= 5 || isUploading
                                ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                                : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 cursor-pointer'
                                }`}
                        >
                            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                                <UploadCloud className="w-7 h-7 text-primary" />
                            </div>
                            <p className="text-sm font-bold text-foreground mb-1">Click to browse videos</p>
                            <p className="text-[11px] text-muted-foreground font-medium">MP4 or MOV • Max 200MB per file</p>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="video/*" className="hidden" disabled={files.length >= 5 || isUploading} />
                        </div>

                        {files.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border dark:border-slate-800 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                                <Film className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[13px] font-bold text-foreground truncate">{file.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                            disabled={isUploading}
                                            className={`p-1.5 rounded-lg transition-colors shrink-0 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive'}`}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

                <div className="bg-muted/30 dark:bg-[#121620] p-5 md:px-7 flex items-center justify-between border-t border-border dark:border-slate-800">
                    <div className="hidden sm:flex items-center gap-2 text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg border border-border dark:border-slate-800">
                        <Info className="w-4 h-4 text-primary" />
                        <span className="text-[11px] font-bold tracking-wide">Direct-to-Cloud Enabled</span>
                    </div>

                    <button
                        type="submit"
                        form="media-upload-form"
                        disabled={files.length === 0 || isUploading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:grayscale transition-all duration-300 active:scale-95 shadow-md"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Start Upload
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeMediaUploadModal;