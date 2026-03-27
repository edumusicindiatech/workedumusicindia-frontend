import { useState, useEffect, useCallback, useRef } from "react";
import {
    Users, School, MapPin, ChevronRight, Film, Calendar as CalendarIcon,
    Award, Clock, Star, AlertTriangle,
    Copy, AlertCircle, Download, ChevronDown,
    Trash2, Play
} from "lucide-react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import api from "../../api/axios";
import CustomSelect from "../../components/ui/CustomSelect";
import ReviewModal from "../../modals/admin/ReviewModal";
import DeleteModal from "../../modals/admin/DeleteModal";
import { useSelector } from "react-redux";

// 🔥 FIX 1: Added withCredentials so this socket joins the Admin's private room to hear the updates
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { withCredentials: true });

// --- MAIN COMPONENT ---

const AdminMediaGallery = () => {
    const [viewMode, setViewMode] = useState('employees');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedBand, setSelectedBand] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [historicalSchools, setHistoricalSchools] = useState([]);
    const [mediaData, setMediaData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [expandedMonth, setExpandedMonth] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});

    // Track which videos have been clicked to play
    const [playingVideos, setPlayingVideos] = useState({});

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [activeReview, setActiveReview] = useState(null);
    const [reviewMarks, setReviewMarks] = useState(0);
    const [reviewRemark, setReviewRemark] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [videoErrors, setVideoErrors] = useState({});

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, logId: null, fileId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const refetchTimestamp = useRef(0);

    const { user } = useSelector((state) => state.auth);

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/admin/employees');
            setEmployees(response.data.data || []);
        } catch (error) {
            toast.error("Failed to load directory.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistoricalSchools = async (empId) => {
        setIsLoading(true);
        try {
            // 🔥 FIX 2: Added cache buster to schools fetch
            const response = await api.get(`/admin/employees/${empId}/media-filters?_t=${Date.now()}`);
            setHistoricalSchools(response.data.data || []);
            setViewMode('schools');
        } catch (error) {
            toast.error("Failed to load historical assignments.");
            setViewMode('employees');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMedia = useCallback(async (isSilentRefresh = false) => {
        if (!selectedEmployee || !selectedSchool || !selectedBand) return;

        // Only trigger the loading screen if this is a manual click/first load
        if (!isSilentRefresh) {
            setIsLoading(true);
        }

        try {
            const response = await api.get(`/admin/media?teacher=${selectedEmployee._id}&school=${selectedSchool._id}&band=${selectedBand}&year=${selectedYear}&_t=${Date.now()}`);

            if (response.data.success) {
                const rawLogs = response.data.data;
                const grouped = {};
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

                rawLogs.forEach(log => {
                    const date = new Date(log.eventDate);
                    const month = monthNames[date.getMonth()];
                    if (!grouped[month]) grouped[month] = [];

                    if (log.files && log.files.length > 0) {
                        log.files.forEach((file) => {
                            grouped[month].push({
                                logId: log._id,
                                fileId: file._id,
                                eventName: log.eventContext,
                                eventDate: date.toISOString().split('T')[0],
                                students: log.studentRecord,
                                marks: file.marks !== undefined ? file.marks : null,
                                remark: file.remark || null,
                                description: log.eventContext,
                                videoUrl: file.url,
                            });
                        });
                    }
                });
                setMediaData(grouped);
                const availableMonths = Object.keys(grouped);

                setExpandedMonth(prev => {
                    if (prev && availableMonths.includes(prev)) return prev;
                    return availableMonths.length > 0 ? availableMonths[0] : null;
                });
            }
        } catch (error) {
            toast.error("Failed to load media.");
        } finally {
            // Turn off loading only if we turned it on
            if (!isSilentRefresh) {
                setIsLoading(false);
            }
        }
    }, [selectedEmployee, selectedSchool, selectedBand, selectedYear]);

    useEffect(() => {
        const handleRealTimeGalleryUpdate = (notif) => {
            if (viewMode === 'gallery' && notif?.type === 'Media') {
                if (Date.now() - refetchTimestamp.current > 1000) {
                    
                    refetchTimestamp.current = Date.now();
                    
                    // Pass 'true' to trigger the silent refresh and stop the flashing!
                    fetchMedia(true); 
                }
            }
        };

        socket.on('new_notification', handleRealTimeGalleryUpdate);

        return () => {
            socket.off('new_notification', handleRealTimeGalleryUpdate);
        };
    }, [viewMode, fetchMedia]);

    useEffect(() => {
        if (viewMode === 'gallery') fetchMedia();
    }, [viewMode, fetchMedia]);

    useEffect(() => {
        if (user && (user._id || user.id)) {
            const adminId = user._id || user.id;
            socket.emit('join_room', adminId);
        }
    }, [user]);

    const handleDrillDown = (mode, data) => {
        if (mode === 'schools') { setSelectedEmployee(data); fetchHistoricalSchools(data._id); }
        if (mode === 'bands') { setSelectedSchool(data); setViewMode('bands'); }
        if (mode === 'gallery') { setSelectedBand(data); setViewMode('gallery'); }
    };

    const handleBreadcrumb = (mode) => {
        setViewMode(mode);
        if (mode === 'employees') { setSelectedEmployee(null); setSelectedSchool(null); setSelectedBand(null); }
        if (mode === 'schools') { setSelectedSchool(null); setSelectedBand(null); }
        if (mode === 'bands') { setSelectedBand(null); }
    };

    const toggleMonth = (month) => setExpandedMonth(expandedMonth === month ? null : month);
    const handleVideoError = (fileId) => setVideoErrors(prev => ({ ...prev, [fileId]: true }));

    const toggleCard = (fileId) => {
        setExpandedCards(prev => ({ ...prev, [fileId]: !prev[fileId] }));
    };

    const handlePlayVideo = (e, fileId) => {
        e.stopPropagation();
        setPlayingVideos(prev => ({ ...prev, [fileId]: true }));
    };

    const handleCopyLink = (url) => {
        navigator.clipboard.writeText(url);
        toast.success("Video link copied to clipboard!");
    };

    const handleDownload = async (fileUrl, smartFileName) => {
        const toastId = toast.loading("Preparing secure download...");
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error("Network response was not ok");

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = smartFileName ? `${smartFileName}.mp4` : 'video.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started!", { id: toastId });
        } catch (error) {
            toast.error("Direct download failed. Opening file instead.", { id: toastId });
            window.open(fileUrl, '_blank');
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/admin/media/${deleteModal.logId}/file/${deleteModal.fileId}`);
            toast.success("Video deleted successfully!");
            setDeleteModal({ isOpen: false, logId: null, fileId: null });
            fetchMedia();
        } catch (error) {
            toast.error("Failed to delete video.");
        } finally {
            setIsDeleting(false);
        }
    };

    const openReviewModal = (media) => {
        setActiveReview(media);
        setReviewMarks(media.marks !== null ? media.marks : 0);
        setReviewRemark(media.remark || "");
        setReviewModalOpen(true);
    };

    const submitReview = async () => {
        if (reviewMarks < 0 || reviewMarks > 10) return toast.error("Please assign a score between 0 and 10.");
        setIsSubmitting(true);
        try {
            await api.put(`/admin/media/${activeReview.logId}/grade/${activeReview.fileId}`, {
                marks: Number(reviewMarks),
                remark: reviewRemark
            });
            toast.success("Grade submitted successfully!");
            setReviewModalOpen(false);
            fetchMedia();
        } catch (error) {
            toast.error("Failed to submit grade.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMonthlyStats = (files) => {
        const pendingCount = files.filter(f => f.marks === null).length;
        const gradedFiles = files.filter(f => f.marks !== null);
        if (gradedFiles.length === 0) return { average: null, colorClass: "bg-muted text-muted-foreground border-border", pendingCount };
        const average = Math.round((gradedFiles.reduce((acc, curr) => acc + curr.marks, 0) / gradedFiles.length) * 10) / 10;
        let colorClass = average < 5 ? "bg-red-500/10 text-red-600 border-red-500/30" :
            average < 8 ? "bg-blue-500/10 text-blue-600 border-blue-500/30" :
                "bg-green-500/10 text-green-600 border-green-500/30";
        return { average, colorClass, pendingCount };
    };

    const getWeeklyRating = () => Math.floor(Math.random() * (10 - 5 + 1) + 5);

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 mt-2 pb-24">

            {/* Modals */}
            <ReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                activeReview={activeReview}
                reviewMarks={reviewMarks}
                setReviewMarks={setReviewMarks}
                reviewRemark={reviewRemark}
                setReviewRemark={setReviewRemark}
                submitReview={submitReview}
                isSubmitting={isSubmitting}
                videoErrors={videoErrors}
                handleVideoError={handleVideoError}
                selectedSchool={selectedSchool}
            />

            <DeleteModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, logId: null, fileId: null })}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight bg-linear-to-r from-primary to-blue-500 bg-clip-text">Media Vault</h1>
                    <div className="flex items-center flex-wrap gap-2 mt-2 text-sm font-semibold text-muted-foreground">
                        <button onClick={() => handleBreadcrumb('employees')} className={`hover:text-primary transition-colors ${viewMode === 'employees' ? 'text-primary' : ''}`}>Directory</button>
                        {selectedEmployee && (<><ChevronRight className="w-4 h-4 opacity-50" /><button onClick={() => handleBreadcrumb('schools')} className={`hover:text-primary transition-colors ${viewMode === 'schools' ? 'text-primary' : ''}`}>{selectedEmployee.name}</button></>)}
                        {selectedSchool && (<><ChevronRight className="w-4 h-4 opacity-50" /><button onClick={() => handleBreadcrumb('bands')} className={`hover:text-primary transition-colors ${viewMode === 'bands' ? 'text-primary' : ''}`}>{selectedSchool.schoolName}</button></>)}
                        {selectedBand && (<><ChevronRight className="w-4 h-4 opacity-50" /><span className="text-primary">{selectedBand}</span></>)}
                    </div>
                </div>
                {viewMode === 'gallery' && (
                    <div className="w-full sm:w-32 z-10 shrink-0">
                        <CustomSelect value={selectedYear} onChange={(val) => setSelectedYear(Number(val))} options={availableYears} />
                    </div>
                )}
            </div>

            {/* DIRECTORY VIEW */}
            {viewMode === 'employees' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {isLoading ? <p className="text-muted-foreground animate-pulse font-medium">Loading vault directory...</p> : employees.map(emp => {
                        const weeklyScore = getWeeklyRating();
                        const isExcellent = weeklyScore >= 8;
                        return (
                            <div key={emp._id} onClick={() => handleDrillDown('schools', emp)} className="group relative bg-card dark:bg-[#0d1117] border border-border rounded-3xl p-6 hover:border-primary/50 hover:shadow-2xl cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden">
                                <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-blue-600 flex items-center justify-center text-xl font-black text-white shrink-0 group-hover:scale-110 transition-transform">
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-extrabold text-foreground text-base truncate">{emp.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                                    </div>
                                </div>
                                <div className="shrink-0 self-end sm:self-auto">
                                    <div className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-sm font-black ${isExcellent ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                                        <Star className={`w-3.5 h-3.5 ${isExcellent ? 'fill-green-600' : 'fill-blue-600'}`} /> {weeklyScore}/10
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SCHOOLS VIEW */}
            {viewMode === 'schools' && selectedEmployee && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-8 duration-500">
                    {isLoading ? <p className="text-muted-foreground col-span-full">Scanning historical records...</p> :
                        historicalSchools.length === 0 ? (<p className="text-muted-foreground italic col-span-full">No media uploads found.</p>) : (
                            historicalSchools.map((schoolData, idx) => (
                                <div key={idx} onClick={() => handleDrillDown('bands', schoolData)} className="bg-card dark:bg-[#0d1117] border border-border rounded-3xl p-6 hover:border-primary/50 cursor-pointer flex items-center gap-5 group transition-all">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                                        <School className="w-7 h-7 text-primary group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-lg text-foreground group-hover:text-primary transition-colors">{schoolData.schoolName}</h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 opacity-80"><MapPin className="w-3.5 h-3.5" /> Click to view recorded bands</p>
                                    </div>
                                </div>
                            ))
                        )}
                </div>
            )}

            {/* BANDS VIEW */}
            {viewMode === 'bands' && selectedSchool && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-right-8 duration-500 max-w-3xl">
                    {['Junior Band', 'Senior Band'].map(band => {
                        const hasHistory = selectedSchool.bands.includes(band);
                        return (
                            <button key={band} disabled={!hasHistory} onClick={() => handleDrillDown('gallery', band)}
                                className={`relative p-10 rounded-4xl border-2 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${hasHistory ? 'border-primary/20 bg-card hover:border-primary hover:-translate-y-1' : 'border-border bg-muted/30 opacity-60 cursor-not-allowed grayscale'} overflow-hidden`}
                            >
                                <Users className={`w-14 h-14 ${hasHistory ? 'text-primary' : 'text-muted-foreground'}`} />
                                <h2 className="text-2xl font-black text-foreground tracking-tight">{band}</h2>
                                <span className={`text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full ${hasHistory ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                                    {hasHistory ? 'Open Vault' : 'No Uploads'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* --- GALLERY VIEW --- */}
            {viewMode === 'gallery' && (
                <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                    {isLoading ? <p className="text-muted-foreground font-medium animate-pulse">Decrypting vault...</p> :
                        Object.keys(mediaData).length === 0 ? (
                            <div className="text-center py-24 bg-card border border-border rounded-3xl shadow-sm">
                                <Film className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-foreground">Vault is Empty</h3>
                                <p className="text-muted-foreground mt-2">No media has been uploaded for {selectedBand} in {selectedYear}.</p>
                            </div>
                        ) : (
                            Object.keys(mediaData).map(month => {
                                const isExpanded = expandedMonth === month;
                                const mediaFiles = mediaData[month];
                                const { average, colorClass, pendingCount } = getMonthlyStats(mediaFiles);

                                return (
                                    <div key={month} className="bg-card dark:bg-[#0d1117] border border-border rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
                                        <button onClick={() => toggleMonth(month)} className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-4 sm:gap-6">
                                                <div className={`p-3 rounded-2xl ${isExpanded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} shadow-sm`}>
                                                    <CalendarIcon className="w-6 h-6" />
                                                </div>
                                                <div className="text-left">
                                                    <h2 className="text-xl font-black text-foreground tracking-tight">{month} {selectedYear}</h2>
                                                    <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">{mediaFiles.length} Total Videos</p>
                                                </div>
                                                <div className="hidden sm:flex items-center gap-3 ml-6 border-l border-border pl-6">
                                                    {pendingCount > 0 && (
                                                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                                            <AlertCircle className="w-3.5 h-3.5" /> {pendingCount} Pending
                                                        </span>
                                                    )}
                                                    {average !== null && (
                                                        <div className={`px-3 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-sm ${colorClass}`}>
                                                            <Award className="w-4 h-4" /> AVG: {average}/10
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className={`w-6 h-6 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-90 text-primary' : ''}`} />
                                        </button>

                                        {isExpanded && (
                                            <div className="p-4 sm:p-6 pt-0 sm:pt-2 border-t border-border bg-background/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {mediaFiles.map((media) => {
                                                    const isCardExpanded = expandedCards[media.fileId];
                                                    const isVideoPlaying = playingVideos[media.fileId];

                                                    return (
                                                        <div key={media.fileId} className="flex flex-col bg-card dark:bg-[#131821] border border-border rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">

                                                            {/* VIDEO PLAYER AREA */}
                                                            <div className={`w-full relative bg-black shrink-0 overflow-hidden transition-all duration-300 ${isVideoPlaying ? '' : 'aspect-video'}`}>

                                                                {videoErrors[media.fileId] || !media.videoUrl ? (
                                                                    <div className="flex flex-col items-center justify-center h-full w-full p-8 bg-slate-900 border-b border-border text-center absolute inset-0">
                                                                        <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Unavailable</span>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <video
                                                                            src={`${media.videoUrl}#t=0.001`}
                                                                            controls={isVideoPlaying}
                                                                            autoPlay={isVideoPlaying}
                                                                            controlsList="nodownload"
                                                                            className={`w-full bg-black ${isVideoPlaying ? 'h-auto max-h-[60vh] object-contain' : 'absolute inset-0 h-full object-cover opacity-70'}`}
                                                                            preload="metadata"
                                                                            playsInline
                                                                            webkit-playsinline="true"
                                                                            onError={() => handleVideoError(media.fileId)}
                                                                        />

                                                                        {!isVideoPlaying && (
                                                                            <div
                                                                                className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black/20 transition-colors z-10 group/play"
                                                                                onClick={(e) => handlePlayVideo(e, media.fileId)}
                                                                            >
                                                                                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center border-2 border-white/70 shadow-2xl backdrop-blur-sm group-hover/play:scale-110 group-hover/play:bg-black/70 transition-all">
                                                                                    <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {media.marks === null && !isVideoPlaying && (
                                                                    <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-lg flex items-center gap-1 z-20 pointer-events-none">
                                                                        <Clock className="w-3 h-3" /> Pending
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* ACCORDION HEADER */}
                                                            <div
                                                                onClick={() => toggleCard(media.fileId)}
                                                                className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-muted/30 transition-colors"
                                                            >
                                                                <div className="min-w-0 pr-4">
                                                                    <h3 className="font-bold text-foreground text-sm truncate">{media.eventName || 'Regular Class'}</h3>
                                                                    <p className="text-muted-foreground text-xs">{media.eventDate}</p>
                                                                </div>
                                                                <div className={`p-2 rounded-full bg-muted transition-transform duration-300 ${isCardExpanded ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                                                                    <ChevronDown className="w-4 h-4" />
                                                                </div>
                                                            </div>

                                                            {/* ACCORDION DATA AREA */}
                                                            {isCardExpanded && (
                                                                <div className="p-5 pt-2 flex flex-col flex-1 border-t border-border animate-in slide-in-from-top-2 fade-in duration-200">
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                                            <Users className="w-4 h-4 opacity-70" /> {media.students || '0'} Students Present
                                                                        </div>
                                                                        {media.marks !== null ? (
                                                                            <span className="shrink-0 px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg text-sm font-black tabular-nums">{media.marks}/10</span>
                                                                        ) : (
                                                                            <span className="shrink-0 px-2 py-1 bg-muted text-muted-foreground border border-border rounded-lg text-[10px] font-bold uppercase">Unscored</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="space-y-4 flex-1 mb-5">
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Instructor Note</span>
                                                                            <div className="text-xs text-foreground/90 bg-muted/40 p-3 rounded-xl border border-border/50 max-h-24 overflow-y-auto custom-scrollbar">
                                                                                {media.description ? media.description : <span className="italic text-muted-foreground/50">Description not given by instructor.</span>}
                                                                            </div>
                                                                        </div>

                                                                        {media.remark && (
                                                                            <div>
                                                                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 block">Your Feedback</span>
                                                                                <div className="bg-primary/10 border-l-2 border-primary p-3 rounded-r-xl text-xs italic font-medium text-primary/90">
                                                                                    "{media.remark}"
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* ACTION BUTTONS */}
                                                                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <button onClick={() => handleCopyLink(media.videoUrl)} title="Copy Link" className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border">
                                                                                <Copy className="w-4 h-4" />
                                                                            </button>
                                                                            <button onClick={() => handleDownload(media.videoUrl, media.eventName)} title="Download" className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border" disabled={!media.videoUrl || videoErrors[media.fileId]}>
                                                                                <Download className="w-4 h-4" />
                                                                            </button>
                                                                            <button onClick={() => setDeleteModal({ isOpen: true, logId: media.logId, fileId: media.fileId })} title="Delete" className="p-2.5 rounded-xl bg-muted text-destructive hover:bg-destructive/10 transition-colors border border-border">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                        <button onClick={() => openReviewModal(media)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${media.marks !== null ? 'bg-muted text-foreground border border-border' : 'bg-primary text-white hover:scale-[1.02]'}`}>
                                                                            {media.marks !== null ? 'Edit Grade' : 'Review'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                </div>
            )}
        </div>
    );
};

export default AdminMediaGallery;