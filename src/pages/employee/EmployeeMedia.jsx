import { useState, useEffect } from "react";
import {
    Film, Calendar as CalendarIcon, UploadCloud, MapPin,
    Users, PlayCircle, Award, Clock, X, Download,
    ChevronDown, Trash2, AlertTriangle
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
    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { fileId, monthKey }

    // State for Real Data
    const [mediaData, setMediaData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const toggleMonth = (month) => {
        setExpandedMonth(expandedMonth === month ? null : month);
    };

    // --- DATA FETCHING & GROUPING ---
    useEffect(() => {
        const fetchMedia = async () => {
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

                        // MAPPING GRANULAR FILES: 1 Video = 1 Card
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
                    if (availableMonths.length > 0) {
                        setExpandedMonth(availableMonths[0]);
                    } else {
                        setExpandedMonth(null);
                    }
                }
            } catch (error) {
                console.error("Failed to load media", error);
                toast.error("Failed to load media gallery.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMedia();
    }, [selectedYear]);

    const getMonthlyStats = (files) => {
        const gradedFiles = files.filter(f => f.marks !== null);
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
        e.stopPropagation(); // Prevents the video player from opening
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

                // Optimistic UI Update
                setMediaData(prevData => {
                    const updatedMonthFiles = prevData[monthKey].filter(file => file.id !== fileId);
                    const newData = { ...prevData };

                    if (updatedMonthFiles.length === 0) {
                        delete newData[monthKey]; // Remove month header if empty
                    } else {
                        newData[monthKey] = updatedMonthFiles;
                    }
                    return newData;
                });
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(error.response?.data?.message || "Failed to delete video.", { id: toastId });
        } finally {
            setDeleteConfirmation(null); // Close the dialog
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
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map((skeletonMonth) => (
                        <div key={skeletonMonth} className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                            <div className="w-full px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between animate-pulse bg-muted/10">
                                <div className="flex items-center flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-muted dark:bg-slate-800" />
                                        <div className="w-24 sm:w-32 h-5 rounded-md bg-muted dark:bg-slate-800" />
                                    </div>
                                    <div className="flex items-center gap-2 ml-1 sm:ml-4 border-l border-border dark:border-slate-700 pl-4">
                                        <div className="w-14 h-6 rounded-md bg-muted dark:bg-slate-800" />
                                        <div className="w-20 h-6 rounded-md bg-muted dark:bg-slate-800" />
                                    </div>
                                </div>
                                <div className="w-5 h-5 rounded-md bg-muted dark:bg-slate-800" />
                            </div>
                            <div className="p-5 sm:p-6 pt-2 border-t border-border dark:border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map((skeletonCard) => (
                                        <div key={skeletonCard} className="bg-background dark:bg-[#0d1117] border border-border dark:border-slate-800 rounded-xl overflow-hidden flex flex-col animate-pulse">
                                            <div className="aspect-video w-full bg-muted dark:bg-slate-800 shrink-0" />
                                            <div className="p-4 space-y-4 flex-1">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="h-4 bg-muted dark:bg-slate-800 rounded w-2/3" />
                                                    <div className="h-4 bg-muted dark:bg-slate-800 rounded w-1/4" />
                                                </div>
                                                <div className="space-y-2 pt-2 border-t border-border dark:border-slate-800">
                                                    <div className="h-3 bg-muted dark:bg-slate-800 rounded w-1/2" />
                                                    <div className="h-3 bg-muted dark:bg-slate-800 rounded w-1/3" />
                                                </div>
                                            </div>
                                            <div className="p-3.5 border-t border-border dark:border-slate-800 bg-muted/10 flex justify-between items-center">
                                                <div className="h-3 bg-muted dark:bg-slate-800 rounded w-1/3" />
                                                <div className="h-3 bg-muted dark:bg-slate-800 rounded w-1/6" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.keys(mediaData).map((month) => {
                        const isExpanded = expandedMonth === month;
                        const mediaFiles = mediaData[month];
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
                                            <div className={`px-2.5 py-1 rounded-md border text-[11px] font-extrabold flex items-center gap-1.5 ${colorClass}`}>
                                                <Award className="w-3 h-3" />
                                                {average !== null ? `AVG: ${average}/100` : "Pending Grading"}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Accordion Content */}
                                {isExpanded && (
                                    <div className="p-5 sm:p-6 pt-2 border-t border-border dark:border-slate-800 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {mediaFiles.map((media) => (
                                                <div key={media.id} className="group bg-background dark:bg-[#0d1117] border border-border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col relative">

                                                    {/* Delete Button (Only visible if ungraded) */}
                                                    {media.marks === null && !media.remark && (
                                                        <button
                                                            onClick={(e) => triggerDeleteConfirmation(e, media.id, month)}
                                                            className="absolute top-2 right-2 z-10 p-2 bg-black/50 hover:bg-red-500/90 backdrop-blur-md text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md hover:scale-105"
                                                            title="Delete Video"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {/* Smart Video Thumbnail */}
                                                    <div
                                                        className="relative aspect-video bg-slate-900 overflow-hidden shrink-0 cursor-pointer"
                                                        onClick={() => media.videoUrl && setActiveVideo(media)}
                                                    >
                                                        {media.videoUrl ? (
                                                            <video
                                                                src={`${media.videoUrl}#t=0.001`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70 group-hover:opacity-100"
                                                                preload="metadata"
                                                                muted
                                                                playsInline
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

                                                    {/* Card Details */}
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

                                                    {/* Admin Remarks Block */}
                                                    {media.remark && (
                                                        <div className="px-4 pb-3">
                                                            <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2.5 items-start">
                                                                <span className="text-blue-500 font-serif text-2xl leading-none h-4">"</span>
                                                                <p className="text-[12px] italic text-foreground font-medium leading-snug pt-1">
                                                                    {media.remark}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Marking Footer */}
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
                                                            <div className="flex items-center justify-between opacity-80">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Pending Review</span>
                                                                </div>
                                                                <span className="text-sm font-bold text-muted-foreground">--/100</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {Object.keys(mediaData).length === 0 && (
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

            {/* =========================================
                BEAUTIFUL DELETE CONFIRMATION MODAL 
            ========================================== */}
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

            {/* Cinematic Video Player */}
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
                                title="Download Video"
                            >
                                <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                            </button>
                            <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
                            <button
                                onClick={() => setActiveVideo(null)}
                                className="p-2.5 sm:p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all duration-200 active:scale-95 hover:rotate-90"
                                title="Close Player"
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