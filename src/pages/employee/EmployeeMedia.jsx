import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
    Film, Calendar as CalendarIcon, UploadCloud, MapPin,
    Users, PlayCircle, Award, Clock, X, Download,
    ChevronDown, Trash2, AlertTriangle, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import EmployeeMediaUploadModal from "../../modals/employee/EmployeeMediaUploadModal";
import CustomSelect from "../../components/ui/CustomSelect";

const EmployeeMedia = () => {
    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [expandedMonth, setExpandedMonth] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // State for Modals & Actions
    const [activeVideo, setActiveVideo] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);

    // State for Real Data
    const [mediaData, setMediaData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // 🔥 NEW: Redux state for the Cinematic Upload feature
    const { isUploading, jobQueue } = useSelector((state) => state.upload);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleCancelUpload = (e) => {
        e.stopPropagation(); // Prevent the click from doing anything else
        window.dispatchEvent(new CustomEvent('vault-upload-cancel'));
        toast.error("Upload cancelled.");
    };

    const toggleMonth = (month) => {
        setExpandedMonth(expandedMonth === month ? null : month);
    };

    // --- DATA FETCHING (Wrapped in useCallback so we can trigger it after upload) ---
    const fetchMedia = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/employee/media?year=${selectedYear}`);

            if (response.data.success) {
                const rawLogs = response.data.data;
                const grouped = {};
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

                rawLogs.forEach(log => {
                    const date = new Date(log.eventDate);
                    const month = monthNames[date.getMonth()];

                    if (!grouped[month]) grouped[month] = [];

                    if (log.files && log.files.length > 0) {
                        log.files.forEach((file, index) => {
                            grouped[month].push({
                                id: file._id || `${log._id}-${index}`,
                                schoolName: log.school?.schoolName || "Unknown School",
                                band: log.band,
                                eventName: log.eventContext || null,
                                eventDate: date.toISOString().split('T')[0],
                                students: log.studentRecord,
                                marks: file.marks !== undefined ? file.marks : null,
                                remark: file.remark || null,
                                videoUrl: file.url,
                            });
                        });
                    }
                });

                setMediaData(grouped);
                const availableMonths = Object.keys(grouped);
                if (availableMonths.length > 0 && !isUploading) {
                    setExpandedMonth(availableMonths[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load media", error);
            toast.error("Failed to load media gallery.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, isUploading]);

    // Initial Fetch
    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

    // --- NEW: LISTEN TO HEADLESS UPLOADER ---
    useEffect(() => {
        const handleProgress = (e) => setUploadProgress(e.detail);
        const handleRefresh = () => fetchMedia();

        // 🔥 Catch the new events and fire the toasts from the stable UI!
        const handleSuccess = () => toast.success("Video successfully saved to Vault!");
        const handleError = (e) => toast.error(e.detail || "An upload error occurred.");

        window.addEventListener('vault-upload-progress', handleProgress);
        window.addEventListener('refreshMediaGallery', handleRefresh);
        window.addEventListener('vault-upload-success', handleSuccess);
        window.addEventListener('vault-upload-error', handleError);

        return () => {
            window.removeEventListener('vault-upload-progress', handleProgress);
            window.removeEventListener('refreshMediaGallery', handleRefresh);
            window.removeEventListener('vault-upload-success', handleSuccess);
            window.removeEventListener('vault-upload-error', handleError);
        };
    }, [fetchMedia]);

    // --- NEW: GENERATE TEMPORARY LOCAL PREVIEW FOR GHOST CARD ---
    useEffect(() => {
        if (isUploading && jobQueue?.files?.length > 0) {
            const url = URL.createObjectURL(jobQueue.files[0]);
            setPreviewUrl(url);

            // Auto-expand the month we are uploading to
            const d = new Date(jobQueue.metadata.eventDate || new Date());
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            setExpandedMonth(monthNames[d.getMonth()]);

            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
            setUploadProgress(0);
        }
    }, [isUploading, jobQueue]);

    // --- NEW: INJECT GHOST CARD INTO DATA ---
    const displayMediaData = { ...mediaData };
    if (isUploading && jobQueue) {
        const d = new Date(jobQueue.metadata.eventDate || new Date());
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[d.getMonth()];

        const ghostRecord = {
            id: 'uploading-ghost',
            isGhost: true,
            schoolName: jobQueue.metadata.schoolName,
            band: jobQueue.metadata.band,
            eventName: jobQueue.metadata.eventName,
            eventDate: jobQueue.metadata.eventDate,
            students: jobQueue.metadata.studentsCount,
        };

        // Create the month array if it's the very first video of the month
        if (!displayMediaData[monthName]) displayMediaData[monthName] = [];

        // Put the ghost card at the very front!
        displayMediaData[monthName] = [ghostRecord, ...displayMediaData[monthName]];
    }

    const getMonthlyStats = (files) => {
        const gradedFiles = files.filter(f => f.marks !== null && !f.isGhost);
        if (gradedFiles.length === 0) return { average: null, colorClass: "bg-muted text-muted-foreground border-border" };

        const sum = gradedFiles.reduce((acc, curr) => acc + curr.marks, 0);
        const average = Math.round(sum / gradedFiles.length);

        let colorClass = "";
        if (average < 50) colorClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
        else if (average < 80) colorClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
        else colorClass = "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30";

        return { average, colorClass };
    };

    // --- CUSTOM DELETE DIALOG HANDLERS ---
    const triggerDeleteConfirmation = (e, fileId, monthKey) => {
        e.stopPropagation();
        setDeleteConfirmation({ fileId, monthKey });
    };

    const executeDelete = async () => {
        if (!deleteConfirmation) return;

        const { fileId, monthKey } = deleteConfirmation;
        const toastId = toast.loading("Deleting video...");

        try {
            const response = await api.delete(`/employee/media/file/${fileId}`);

            if (response.data.success) {
                toast.success("Video deleted successfully.", { id: toastId });

                setMediaData(prevData => {
                    const updatedMonthFiles = prevData[monthKey].filter(file => file.id !== fileId);
                    const newData = { ...prevData };

                    if (updatedMonthFiles.length === 0) delete newData[monthKey];
                    else newData[monthKey] = updatedMonthFiles;

                    return newData;
                });
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(error.response?.data?.message || "Failed to delete video.", { id: toastId });
        } finally {
            setDeleteConfirmation(null);
        }
    };

    // --- NATIVE DOWNLOAD FUNCTION ---
    const handleDownload = async (videoUrl, fileName) => {
        if (!videoUrl) return toast.error("No video file found.");
        const toastId = toast.loading("Starting download...");

        try {
            const response = await api.post('/employee/media/generate-download-url', {
                fileUrl: videoUrl,
                fileName: fileName || "band-performance.mp4"
            });

            if (response.data.success) {
                const link = document.createElement('a');
                link.href = response.data.downloadUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Download started!", { id: toastId });
            } else {
                throw new Error("Failed to get download link");
            }
        } catch (error) {
            console.error("Download Error:", error);
            toast.error("Failed to start download.", { id: toastId });
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 mt-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight mb-2">
                        Media Gallery
                    </h1>
                    <p className="text-[13px] font-medium text-muted-foreground flex items-center gap-2">
                        <Film className="w-4 h-4" />
                        Browse uploads and view administrator feedback.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-full sm:w-32 z-10">
                        <CustomSelect
                            value={selectedYear}
                            onChange={(val) => setSelectedYear(Number(val))}
                            options={availableYears}
                        />
                    </div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 shrink-0"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span className="hidden sm:inline">Upload Media</span>
                        <span className="sm:hidden">Upload</span>
                    </button>
                </div>
            </div>

            {/* Shimmer Loading */}
            {isLoading && !isUploading ? (
                <div className="space-y-4">
                    {[1, 2].map((skeletonMonth) => (
                        <div key={skeletonMonth} className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                            <div className="w-full px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between animate-pulse bg-muted/10">
                                <div className="flex items-center flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-muted dark:bg-slate-800" />
                                        <div className="w-24 sm:w-32 h-5 rounded-md bg-muted dark:bg-slate-800" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.keys(displayMediaData).map((month) => {
                        const isExpanded = expandedMonth === month;
                        const mediaFiles = displayMediaData[month];
                        const { average, colorClass } = getMonthlyStats(mediaFiles);

                        return (
                            <div key={month} className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
                                {/* Accordion Header */}
                                <button
                                    onClick={() => toggleMonth(month)}
                                    className="w-full px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between bg-transparent hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <div className="flex items-center flex-wrap gap-3">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className={`w-5 h-5 ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <h2 className="text-lg font-bold text-foreground">{month} {selectedYear}</h2>
                                        </div>
                                        <div className="flex items-center gap-2 ml-1 sm:ml-4 border-l border-border dark:border-slate-700 pl-4">
                                            <span className="px-2.5 py-1 rounded-md bg-muted dark:bg-[#0d1117] text-[11px] font-bold text-muted-foreground">
                                                {mediaFiles.length} videos
                                            </span>
                                            {average !== null && (
                                                <div className={`px-2.5 py-1 rounded-md border text-[11px] font-extrabold flex items-center gap-1.5 ${colorClass}`}>
                                                    <Award className="w-3 h-3" />
                                                    AVG: {average}/100
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Accordion Content */}
                                {isExpanded && (
                                    <div className="p-5 sm:p-6 pt-2 border-t border-border dark:border-slate-800 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {mediaFiles.map((media) => (
                                                media.isGhost ? (
                                                    // 🔥 THE CINEMATIC GHOST CARD
                                                    <div key="ghost" className="group bg-background dark:bg-[#0d1117] border border-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-xl overflow-hidden flex flex-col relative transition-all duration-300">
                                                        <div className="relative aspect-video bg-black overflow-hidden shrink-0">

                                                            {/* 🔥 NEW: The Cancel Button Overlay */}
                                                            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
                                                                <button
                                                                    onClick={handleCancelUpload}
                                                                    className="p-2 sm:p-2 bg-black/40 hover:bg-destructive/90 active:bg-destructive backdrop-blur-md text-white rounded-full transition-all duration-200 shadow-lg border border-white/20 active:scale-90"
                                                                    title="Cancel Upload"
                                                                    aria-label="Cancel Upload"
                                                                >
                                                                    {/* 5x5 icon on mobile, 4x4 on desktop */}
                                                                    <X className="w-5 h-5 sm:w-4 sm:h-4" />
                                                                </button>
                                                            </div>

                                                            {previewUrl ? (
                                                                <video
                                                                    src={previewUrl}
                                                                    className="w-full h-full object-cover transition-all duration-300"
                                                                    style={{
                                                                        filter: `blur(${Math.max(0, 8 - (uploadProgress * 0.08))}px) grayscale(${Math.max(0, 100 - uploadProgress)}%) brightness(${0.5 + (uploadProgress * 0.005)})`
                                                                    }}
                                                                    autoPlay loop muted playsInline
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                                    <UploadCloud className="w-8 h-8 text-primary animate-pulse" />
                                                                </div>
                                                            )}

                                                            {/* Cinematic Progress Bar Overlay */}
                                                            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50">
                                                                <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                                                            </div>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <span className="text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter">{uploadProgress}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 space-y-3 flex-1 opacity-60 animate-pulse">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                    <h3 className="font-bold text-foreground text-sm truncate">{media.schoolName}</h3>
                                                                </div>
                                                                <span className="shrink-0 bg-primary/10 text-primary text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm tracking-wider">
                                                                    {media.band}
                                                                </span>
                                                            </div>
                                                            <div className="pt-2 border-t border-border dark:border-slate-800">
                                                                <p className="text-[12px] font-semibold text-primary truncate flex items-center gap-1.5">
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                    {uploadProgress === 100 ? "Finalizing database..." : "Uploading to Vault..."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // STANDARD REAL DB CARD
                                                    <div key={media.id} className="group bg-background dark:bg-[#0d1117] border border-border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col relative">
                                                        <div
                                                            className="relative aspect-video bg-slate-900 overflow-hidden shrink-0 cursor-pointer"
                                                            onClick={() => media.videoUrl && setActiveVideo(media)}
                                                        >
                                                            {media.videoUrl ? (
                                                                <video
                                                                    src={`${media.videoUrl}#t=0.001`}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70 group-hover:opacity-100"
                                                                    preload="metadata" muted playsInline
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Film className="w-8 h-8 text-slate-700" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                                                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border border-white/10">
                                                                    <PlayCircle className="w-6 h-6 text-white ml-0.5" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="p-4 space-y-3 flex-1">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                    <h3 className="font-bold text-foreground text-sm truncate">{media.schoolName}</h3>
                                                                </div>
                                                                <span className="shrink-0 bg-primary/10 text-primary text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm tracking-wider">
                                                                    {media.band}
                                                                </span>
                                                            </div>
                                                            <div className="pt-2 border-t border-border dark:border-slate-800 flex flex-wrap gap-y-2 gap-x-4">
                                                                <div className="w-full">
                                                                    {media.eventName && <p className="text-[12px] font-semibold text-foreground truncate">{media.eventName}</p>}
                                                                    <p className="text-[11px] text-muted-foreground mt-0.5">{media.eventDate}</p>
                                                                </div>
                                                                {media.students && (
                                                                    <div className="flex items-center gap-1.5 mt-1 bg-muted dark:bg-slate-800/50 px-2 py-1 rounded-md">
                                                                        <Users className="w-3.5 h-3.5 text-blue-500" />
                                                                        <span className="text-[11px] font-bold text-muted-foreground">{media.students} Present</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {media.remark && (
                                                            <div className="px-4 pb-3">
                                                                <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2.5 items-start">
                                                                    <span className="text-blue-500 font-serif text-2xl leading-none h-4">"</span>
                                                                    <p className="text-[12px] italic text-foreground font-medium leading-snug pt-1">{media.remark}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="p-3.5 border-t border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-800/30 mt-auto">
                                                            {media.marks !== null ? (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                                                            <Award className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                                        </div>
                                                                        <span className="text-[11px] font-extrabold text-green-700 dark:text-green-400 uppercase tracking-wide">Admin Score</span>
                                                                    </div>
                                                                    <span className="text-sm font-black text-foreground">{media.marks}/100</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 opacity-80">
                                                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                                                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Pending Review</span>
                                                                    </div>
                                                                    {!media.remark && (
                                                                        <button
                                                                            onClick={(e) => triggerDeleteConfirmation(e, media.id, month)}
                                                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md transition-colors active:scale-95 shadow-sm"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                            <span className="text-[11px] font-extrabold uppercase tracking-wide">Delete</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {Object.keys(displayMediaData).length === 0 && !isUploading && (
                        <div className="text-center py-16 bg-card dark:bg-[#181d29] rounded-2xl border border-border dark:border-slate-700/50">
                            <Film className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-foreground">No media found</h3>
                            <p className="text-sm text-muted-foreground mt-1">There are no uploads for the year {selectedYear}.</p>
                        </div>
                    )}
                </div>
            )}

            <EmployeeMediaUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
            />

            {deleteConfirmation && (
                <div className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Delete Video?</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Are you sure you want to permanently delete this video? It will be removed from the vault and the admin will no longer be able to review it.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-border dark:border-slate-800">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors shadow-md"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeVideo && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="absolute top-0 left-0 right-0 w-full max-w-6xl mx-auto p-4 flex justify-between items-start z-50">
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shadow-2xl">
                            <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
                                {activeVideo.schoolName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider rounded border border-blue-500/20">
                                    {activeVideo.band}
                                </span>
                                <span className="text-slate-400 text-xs font-medium">
                                    • {activeVideo.eventName || activeVideo.eventDate}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl">
                            <button
                                onClick={() => handleDownload(activeVideo.videoUrl, `${activeVideo.schoolName.replace(/\s+/g, '-')}.mp4`)}
                                className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all duration-200 active:scale-95 group"
                            >
                                <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                            </button>
                            <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
                            <button
                                onClick={() => setActiveVideo(null)}
                                className="p-2.5 sm:p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all duration-200 active:scale-95 hover:rotate-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full max-w-5xl rounded-3xl overflow-hidden bg-[#050505] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] ring-1 ring-white/5 animate-in zoom-in-95 duration-300 relative mt-16 sm:mt-0">
                        <video
                            src={activeVideo.videoUrl}
                            controls
                            autoPlay
                            className="w-full max-h-[75vh] object-contain outline-none"
                            controlsList="nodownload"
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeMedia;