import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import {
    Users, School, MapPin, ChevronRight, Film, Calendar as CalendarIcon,
    Award, Clock, Star, AlertTriangle,
    Copy, AlertCircle, Download, ChevronDown,
    Trash2, PlayCircle, Eye, FileSpreadsheet, X
} from "lucide-react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import api from "../../api/axios";
import CustomSelect from "../../components/ui/CustomSelect";
import ReviewModal from "../../modals/admin/ReviewModal";
import DeleteModal from "../../modals/admin/DeleteModal";
import { useTranslation } from "react-i18next";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { withCredentials: true });

// --- THE NEW VIDEO PLAYER COMPONENT ---
const VideoPlayer = ({ src, thumbnailUrl, id, onError }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const videoRef = useRef(null);

    if (!isLoaded) {
        return (
            <div
                className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center cursor-pointer group bg-cover bg-center"
                style={{ backgroundImage: `url(${thumbnailUrl || 'https://via.placeholder.com/1280x720/000000/FFFFFF/?text=EduMusic+Video'})` }}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsLoaded(true);
                }}
            >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300"></div>
                <div className="relative z-10 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 backdrop-blur-md border border-white/30 shadow-2xl">
                    <PlayCircle className="w-8 h-8 text-white group-hover:text-primary-foreground transition-colors" />
                </div>
            </div>
        );
    }

    return (
        <video
            id={`video-${id}`}
            ref={videoRef}
            src={src}
            controls
            autoPlay
            controlsList="nodownload"
            preload="auto"
            playsInline
            onError={onError}
            className="absolute inset-0 w-full h-full object-contain bg-black animate-in fade-in duration-300"
        />
    );
};


const AdminMediaGallery = () => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState('employees');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedBand, setSelectedBand] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [historicalSchools, setHistoricalSchools] = useState([]);
    const [mediaData, setMediaData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const currentYear = new Date().getFullYear();
    const availableYears = [
        { label: String(currentYear), value: currentYear },
        { label: String(currentYear - 1), value: currentYear - 1 },
        { label: String(currentYear - 2), value: currentYear - 2 }
    ];
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [expandedMonth, setExpandedMonth] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});

    const [playingVideos, setPlayingVideos] = useState({});

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState({});
    const [isReportLoading, setIsReportLoading] = useState(false);

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [activeReview, setActiveReview] = useState(null);
    const [reviewMarks, setReviewMarks] = useState(0);
    const [reviewRemark, setReviewRemark] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [videoErrors, setVideoErrors] = useState({});

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, logId: null, fileId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // --- NEW: Real-Time Presence State ---
    const [onlineUsers, setOnlineUsers] = useState({});
    const timeoutsRef = useRef({});

    const refetchTimestamp = useRef(0);
    const { user } = useSelector((state) => state.auth);

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/admin/employees');
            setEmployees(response.data.data || []);
        } catch (error) {
            toast.error(t('media_vault.admin.error_directory'));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistoricalSchools = async (empId) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/admin/employees/${empId}/media-filters?_t=${Date.now()}`);
            setHistoricalSchools(response.data.data || []);
            setViewMode('schools');
        } catch (error) {
            toast.error(t('media_vault.admin.error_history'));
            setViewMode('employees');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMedia = useCallback(async (isSilentRefresh = false) => {
        if (!selectedEmployee || !selectedSchool || !selectedBand) return;

        if (!isSilentRefresh) {
            setIsLoading(true);
        }

        try {
            const response = await api.get(`/admin/media?teacher=${selectedEmployee._id || selectedEmployee.id}&school=${selectedSchool._id}&band=${selectedBand}&year=${selectedYear}&_t=${Date.now()}`);

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
                                eventName: log.eventContext || log.mediaType,
                                eventDate: date.toISOString().split('T')[0],
                                students: log.studentRecord,
                                bandStage: log.bandStage || null,
                                marks: file.marks !== undefined ? file.marks : null,
                                remark: file.remark || null,
                                description: log.description || null,
                                videoUrl: file.url,
                                thumbnailUrl: file.thumbnailUrl || null,
                            });
                        });
                    }
                });
                setMediaData(grouped);

                setExpandedMonth(prev => {
                    const availableMonths = Object.keys(grouped);
                    if (prev && availableMonths.includes(prev)) return prev;
                    return null;
                });
            }
        } catch (error) {
            toast.error(t('media_vault.admin.error_media'));
        } finally {
            if (!isSilentRefresh) {
                setIsLoading(false);
            }
        }
    }, [selectedEmployee, selectedSchool, selectedBand, selectedYear, t]);

    useEffect(() => {
        const handleRealTimeGalleryUpdate = (notif) => {
            if (notif?.type === 'Media') {
                if (viewMode === 'gallery') {
                    if (Date.now() - refetchTimestamp.current > 1000) {
                        refetchTimestamp.current = Date.now();
                        fetchMedia(true);
                    }
                } else if (viewMode === 'employees') {
                    fetchEmployees();
                } else if (viewMode === 'schools' || viewMode === 'bands') {
                    if (selectedEmployee) fetchHistoricalSchools(selectedEmployee._id || selectedEmployee.id);
                }
            }
        };

        socket.on('new_notification', handleRealTimeGalleryUpdate);

        return () => {
            socket.off('new_notification', handleRealTimeGalleryUpdate);
        };
    }, [viewMode, fetchMedia, selectedEmployee]);

    useEffect(() => {
        if (viewMode === 'gallery') fetchMedia();
    }, [viewMode, fetchMedia]);

    // --- Join Rooms and Monitor Presence ---
    useEffect(() => {
        if (user && (user._id || user.id)) {
            const adminId = user._id || user.id;
            socket.emit('join_room', adminId);
        }

        socket.emit("join_admin_room");

        const handleLocationUpdate = (data) => {
            const empId = data.employeeId;
            if (!empId) return;

            setOnlineUsers((prev) => ({ ...prev, [empId]: true }));

            if (timeoutsRef.current[empId]) {
                clearTimeout(timeoutsRef.current[empId]);
            }

            timeoutsRef.current[empId] = setTimeout(() => {
                setOnlineUsers((prev) => ({ ...prev, [empId]: false }));
            }, 15000);
        };

        socket.on("employee_location_changed", handleLocationUpdate);

        return () => {
            socket.off("employee_location_changed", handleLocationUpdate);
            Object.values(timeoutsRef.current).forEach(clearTimeout);
        };
    }, [user]);

    const handleDrillDown = (mode, data) => {
        if (mode === 'schools') { setSelectedEmployee(data); fetchHistoricalSchools(data._id || data.id); }
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

    const handleCopyLink = (url) => {
        navigator.clipboard.writeText(url);
        toast.success(t('media_vault.admin.link_copied'));
    };

    const handleDownload = async (fileUrl, smartFileName) => {
        if (!fileUrl) return toast.error(t('media_vault.admin.no_video_found', 'No video found'));
        const toastId = toast.loading(t('media_vault.admin.preparing_download', 'Preparing video...'));

        try {
            const safeFileName = smartFileName ? `${smartFileName.replace(/\s+/g, '-')}.mp4` : 'video.mp4';

            if (Capacitor.isNativePlatform()) {
                // FIX: Perform the arrayBuffer download using our Axios instance which has proper interceptors/cors handling
                const response = await api.get(fileUrl, { responseType: 'arraybuffer' });

                // Convert binary array buffer to a clean base64 string safely inside native webview
                const bytes = new Uint8Array(response.data);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                const writeResult = await Filesystem.writeFile({
                    path: safeFileName,
                    data: base64Data,
                    directory: Directory.Cache,
                    recursive: true,
                });

                toast.success(t('media_vault.admin.download_started', 'Video ready!'), { id: toastId });

                try {
                    const { Share } = await import('@capacitor/share');
                    await Share.share({
                        title: safeFileName,
                        text: `Video Submission`,
                        url: writeResult.uri,
                        dialogTitle: 'Save or Share Video',
                    });
                } catch (shareErr) {
                    console.log("Share sheet dismissed.");
                }
            } else {
                // Standard desktop browser workflow via secure signed down-loader
                const response = await api.post('/admin/media-vault/generate-download-url', {
                    fileUrl: fileUrl,
                    fileName: safeFileName
                });

                if (response.data.success) {
                    const link = document.createElement('a');
                    link.href = response.data.downloadUrl;
                    link.setAttribute('download', safeFileName);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success(t('media_vault.admin.download_started', 'Download started!'), { id: toastId });
                } else {
                    throw new Error("Failed to get download link");
                }
            }
        } catch (error) {
            console.error("Download Error:", error);
            toast.error(t('media_vault.admin.download_failed', 'Download failed.'), { id: toastId });

            if (!Capacitor.isNativePlatform()) {
                window.open(fileUrl, '_blank');
            }
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/admin/media/${deleteModal.logId}/file/${deleteModal.fileId}`);
            toast.success(t('media_vault.admin.delete_success'));
            setDeleteModal({ isOpen: false, logId: null, fileId: null });
            fetchMedia();
        } catch (error) {
            toast.error(t('media_vault.admin.delete_error'));
        } finally {
            setIsDeleting(false);
        }
    };

    // Function to fetch the Preview Data
    const handlePreviewReport = async () => {
        if (!selectedEmployee) return;
        setIsReportLoading(true);
        setReportModalOpen(true);
        try {
            const empId = selectedEmployee._id || selectedEmployee.id;
            const response = await api.get(`/admin/employees/${empId}/media-report-30-days`);
            if (response.data.success) {
                setReportData(response.data.data);
            }
        } catch (error) {
            toast.error("Failed to load report preview.");
            setReportModalOpen(false);
        } finally {
            setIsReportLoading(false);
        }
    };

    // Function to handle the .xlsx Download
    const handleDownloadExcel = async () => {
        if (!selectedEmployee) return;
        const toastId = toast.loading('Generating Excel file...');
        try {
            const empId = selectedEmployee._id || selectedEmployee.id;
            const safeExcelName = `Media_Report_${selectedEmployee.name.replace(/\s+/g, '_')}_30_Days.xlsx`;

            if (Capacitor.isNativePlatform()) {
                // Fetch as arraybuffer for unified native base64 mapping
                const response = await api.get(`/admin/employees/${empId}/media-report-30-days/download`, {
                    responseType: 'arraybuffer'
                });

                const bytes = new Uint8Array(response.data);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                // Write report into Cache directory so the OS can safely hand it over to share system
                const writeResult = await Filesystem.writeFile({
                    path: safeExcelName,
                    data: base64Data,
                    directory: Directory.Cache,
                    recursive: true
                });

                toast.success('Excel Sheet Compiled!', { id: toastId });

                const { Share } = await import('@capacitor/share');
                await Share.share({
                    title: safeExcelName,
                    url: writeResult.uri,
                    dialogTitle: 'Open Report'
                });
            } else {
                // Desktop Web browser download fallback
                const response = await api.get(`/admin/employees/${empId}/media-report-30-days/download`, {
                    responseType: 'blob'
                });
                const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', safeExcelName);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success('Download complete!', { id: toastId });
            }
        } catch (error) {
            console.error('Excel Download Error:', error);
            toast.error('Failed to download Excel report.', { id: toastId });
        }
    };

    const openReviewModal = (media) => {
        setPlayingVideos(prev => ({ ...prev, [media.fileId]: false }));

        const videoEl = document.getElementById(`video-${media.fileId}`);
        if (videoEl) {
            videoEl.pause();
        }

        setActiveReview(media);
        setReviewMarks(media.marks !== null ? media.marks : 0);
        setReviewRemark(media.remark || "");
        setReviewModalOpen(true);
    };

    const submitReview = async () => {
        if (reviewMarks < 0 || reviewMarks > 10) return toast.error(t('media_vault.admin.score_error'));
        setIsSubmitting(true);
        try {
            await api.put(`/admin/media/${activeReview.logId}/grade/${activeReview.fileId}`, {
                marks: Number(reviewMarks),
                remark: reviewRemark
            });
            toast.success(t('media_vault.admin.grade_success'));
            setReviewModalOpen(false);

            // Re-fetch all trails to instantly clear badges from the UI
            fetchMedia();
            fetchEmployees();
            if (selectedEmployee) fetchHistoricalSchools(selectedEmployee._id || selectedEmployee.id);

        } catch (error) {
            toast.error(t('media_vault.admin.grade_error'));
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

            {/* 30-Day Report Preview Modal */}
            {reportModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setReportModalOpen(false)}>
                    <div className="bg-card w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <div>
                                <h2 className="text-2xl font-black text-foreground">30-Day Media Report</h2>
                                <p className="text-sm font-semibold text-muted-foreground mt-1">{selectedEmployee?.name}</p>
                            </div>
                            <button onClick={() => setReportModalOpen(false)} className="p-2 bg-background rounded-full hover:bg-muted transition-colors">
                                <X className="w-6 h-6 text-foreground" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            {isReportLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-muted-foreground font-bold animate-pulse">Compiling Report...</p>
                                </div>
                            ) : Object.keys(reportData).length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-xl font-bold text-muted-foreground">No media submissions found in the last 30 days.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(reportData).map(([schoolName, submissions]) => (
                                        <div key={schoolName} className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
                                            <div className="bg-primary/5 p-4 border-b border-border">
                                                <h3 className="font-extrabold text-lg text-primary">{schoolName}</h3>
                                            </div>
                                            <div className="divide-y divide-border/50">
                                                {submissions.map((sub, idx) => (
                                                    <div key={idx} className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center hover:bg-muted/10 transition-colors">
                                                        <div className="sm:col-span-3 text-sm font-bold text-foreground">
                                                            {sub.date}
                                                        </div>
                                                        <div className="sm:col-span-4 text-sm font-semibold text-muted-foreground">
                                                            {sub.eventName}
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            {sub.marks === 'Marking Pending' ? (
                                                                <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-xs font-black tracking-wider uppercase">Pending</span>
                                                            ) : (
                                                                <span className="px-3 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg text-xs font-black tracking-wider">{sub.marks}</span>
                                                            )}
                                                        </div>
                                                        <div className="sm:col-span-3 text-xs font-bold text-muted-foreground text-right sm:text-left">
                                                            {sub.gradedBy !== '-' && <span className="opacity-70">Graded by: </span>}
                                                            {sub.gradedBy !== '-' && <span className="text-foreground">{sub.gradedBy}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight bg-linear-to-r from-primary to-blue-500 bg-clip-text">
                        {t('media_vault.admin.title')}
                    </h1>
                    <div className="flex items-center flex-wrap gap-2 mt-2 text-sm font-semibold text-muted-foreground">
                        <button onClick={() => handleBreadcrumb('employees')} className={`hover:text-primary transition-colors ${viewMode === 'employees' ? 'text-primary' : ''}`}>
                            {t('media_vault.admin.directory')}
                        </button>
                        {selectedEmployee && (<><ChevronRight className="w-4 h-4 opacity-50" /><button onClick={() => handleBreadcrumb('schools')} className={`hover:text-primary transition-colors ${viewMode === 'schools' ? 'text-primary' : ''}`}>{selectedEmployee.name}</button></>)}
                        {selectedSchool && (<><ChevronRight className="w-4 h-4 opacity-50" /><button onClick={() => handleBreadcrumb('bands')} className={`hover:text-primary transition-colors ${viewMode === 'bands' ? 'text-primary' : ''}`}>{selectedSchool.schoolName}</button></>)}
                        {selectedBand && (<><ChevronRight className="w-4 h-4 opacity-50" /><span className="text-primary">{selectedBand === 'Junior Band' ? t('media_vault.admin.junior_band') : t('media_vault.admin.senior_band')}</span></>)}
                    </div>
                </div>
                {viewMode === 'gallery' && (
                    <div className="w-full sm:w-32 z-10 shrink-0 animate-in fade-in zoom-in duration-300">
                        <CustomSelect value={selectedYear} onChange={(val) => setSelectedYear(Number(val))} options={availableYears} />
                    </div>
                )}
            </div>

            {/* DIRECTORY VIEW */}
            {viewMode === 'employees' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isLoading ? (
                        [1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="group relative bg-card dark:bg-[#0d1117] border border-border rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden shadow-sm">
                                <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                                    <div className="w-14 h-14 rounded-full bg-muted/60 dark:bg-slate-800/50 animate-pulse shrink-0"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-muted/80 dark:bg-slate-700/80 animate-pulse rounded w-24"></div>
                                        <div className="h-3 bg-muted/80 dark:bg-slate-700/80 animate-pulse rounded w-32"></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : employees.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 py-24 text-center bg-card dark:bg-[#0d1117] border border-border rounded-3xl shadow-sm animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                                <Users className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-2xl font-black text-foreground mb-2">{t('media_vault.admin.no_employees', 'Directory Empty')}</h3>
                            <p className="text-muted-foreground max-w-sm">{t('media_vault.admin.no_employees_desc', 'There are no active employees available in the directory at this time.')}</p>
                        </div>
                    ) : employees.map(emp => {
                        const avgScore = emp.lastMonthAvg ? parseFloat(emp.lastMonthAvg).toFixed(1) : "N/A";
                        const pendingCount = emp.pendingCount || 0;
                        const isExcellent = emp.lastMonthAvg >= 8;
                        const isOnline = onlineUsers[emp._id || emp.id];

                        return (
                            <div key={emp._id} onClick={() => handleDrillDown('schools', emp)} className="group relative bg-card dark:bg-[#0d1117] border border-border rounded-3xl p-6 hover:border-primary/50 hover:shadow-xl cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-visible transition-all duration-300 hover:-translate-y-1">

                                {pendingCount > 0 && (
                                    <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-10 border-4 border-card dark:border-[#0d1117] animate-in zoom-in duration-300">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {pendingCount} Pending
                                    </div>
                                )}

                                <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                                    <div className="relative shrink-0">
                                        <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-blue-600 flex items-center justify-center text-xl font-black text-white overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-primary/20 group-hover:scale-110 transition-all duration-500">
                                            {emp.profilePicture && typeof emp.profilePicture === 'string' && emp.profilePicture.startsWith('http') ? (
                                                <img
                                                    src={emp.profilePicture}
                                                    alt={emp.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                emp.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div
                                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] border-card transition-colors duration-500 ${isOnline ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "bg-slate-400"}`}
                                            title={isOnline ? "Online" : "Offline"}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-extrabold text-foreground text-base truncate group-hover:text-primary transition-colors duration-300">{emp.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                                    </div>
                                </div>
                                <div className="shrink-0 self-end sm:self-auto flex flex-col items-end gap-1">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Avg Score</span>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-black transition-colors duration-300 ${avgScore === "N/A" ? 'bg-muted text-muted-foreground border-border' : isExcellent ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                                        <Star className={`w-3.5 h-3.5 ${avgScore === "N/A" ? 'fill-muted-foreground opacity-50' : isExcellent ? 'fill-green-600' : 'fill-blue-600'}`} /> {avgScore}{avgScore !== "N/A" && "/10"}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SCHOOLS VIEW */}
            {viewMode === 'schools' && selectedEmployee && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={handlePreviewReport}
                            className="flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-2.5 bg-primary/10 text-primary rounded-xl font-black tracking-wide hover:bg-primary/20 transition-all duration-300 shadow-sm hover:-translate-y-0.5"
                            title="Preview 30-Day Report"
                        >
                            <Eye className="w-5 h-5" />
                            <span className="hidden sm:inline">Preview 30-Day Report</span>
                        </button>
                        <button
                            onClick={handleDownloadExcel}
                            className="flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-2.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl font-black tracking-wide hover:bg-green-500/20 transition-all duration-300 shadow-sm hover:-translate-y-0.5"
                            title="Download .xlsx"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            <span className="hidden sm:inline">Download .xlsx</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isLoading ? (
                            [1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-card dark:bg-[#0d1117] border border-border rounded-3xl p-6 flex items-center gap-5 shadow-sm">
                                    <div className="w-14 h-14 rounded-2xl bg-muted/60 dark:bg-slate-800/50 animate-pulse shrink-0"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 bg-muted/80 dark:bg-slate-700/80 animate-pulse rounded w-1/2"></div>
                                        <div className="h-3 bg-muted/80 dark:bg-slate-700/80 animate-pulse rounded w-1/3"></div>
                                    </div>
                                </div>
                            ))
                        ) : historicalSchools.length === 0 ? (<p className="text-muted-foreground italic col-span-full animate-in fade-in duration-500">{t('media_vault.admin.no_uploads_found')}</p>) : (
                            historicalSchools.map((schoolData, idx) => (
                                <div key={idx} onClick={() => handleDrillDown('bands', schoolData)} className="bg-card dark:bg-[#0d1117] border border-border rounded-3xl p-5 sm:p-6 hover:border-primary/50 cursor-pointer flex flex-row items-center gap-4 sm:gap-5 group transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors duration-300">
                                        <School className="w-6 h-6 sm:w-7 sm:h-7 text-primary group-hover:text-white transition-colors duration-300" />
                                    </div>

                                    {/* Added flex-1 and min-w-0 to prevent layout blowouts on long text */}
                                    <div className="flex-1 min-w-0">
                                        {/* Added flex-wrap so the badge gracefully falls to the next line on small screens */}
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                                            <h3 className="font-extrabold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                                {schoolData.schoolName}
                                            </h3>
                                            {schoolData.totalPendingCount > 0 && (
                                                <span className="shrink-0 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-in zoom-in shadow-sm flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> {schoolData.totalPendingCount} Pending
                                                </span>
                                            )}
                                        </div>

                                        {/* Adjusted flex alignment and added shrink-0 to the icon so it doesn't deform */}
                                        <p className="text-xs sm:text-sm text-muted-foreground flex items-start sm:items-center gap-1.5 mt-1 opacity-80">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
                                            <span className="line-clamp-2">{t('media_vault.admin.click_to_view')}</span>
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* BANDS VIEW */}
            {viewMode === 'bands' && selectedSchool && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-8 duration-500 max-w-3xl">
                    {['Junior Band', 'Senior Band'].map(band => {
                        const hasHistory = selectedSchool.bands.includes(band);
                        const bandDetail = selectedSchool.bandsDetails?.find(b => b.band === band);
                        const pendingCount = bandDetail?.pendingCount || 0;

                        return (
                            <button key={band} disabled={!hasHistory} onClick={() => handleDrillDown('gallery', band)}
                                className={`relative p-10 rounded-4xl border-2 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${hasHistory ? 'border-primary/20 bg-card hover:border-primary hover:-translate-y-2 hover:shadow-xl' : 'border-border bg-muted/30 opacity-60 cursor-not-allowed grayscale'} overflow-hidden`}
                            >
                                <Users className={`w-14 h-14 transition-colors duration-300 ${hasHistory ? 'text-primary' : 'text-muted-foreground'}`} />
                                <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    {band === 'Junior Band' ? t('media_vault.admin.junior_band') : t('media_vault.admin.senior_band')}
                                    {pendingCount > 0 && (
                                        <span className="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full animate-in zoom-in shadow-sm flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5" /> {pendingCount}
                                        </span>
                                    )}
                                </h2>
                                <span className={`text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-colors duration-300 ${hasHistory ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                                    {hasHistory ? t('media_vault.admin.open_vault') : t('media_vault.admin.no_uploads')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* --- GALLERY VIEW --- */}
            {viewMode === 'gallery' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-card dark:bg-[#131821] border border-border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="w-full aspect-video bg-muted/60 dark:bg-slate-800/50 animate-pulse" />
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="w-4 h-4 rounded-full bg-muted/80 dark:bg-slate-700/80 animate-pulse shrink-0" />
                                                <div className="h-4 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse w-3/4" />
                                            </div>
                                            <div className="w-16 h-4 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse shrink-0" />
                                        </div>
                                        <div className="pt-2 border-t border-border dark:border-slate-800/80 space-y-2">
                                            <div className="h-3 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse w-1/2" />
                                            <div className="h-3 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse w-1/3" />
                                        </div>
                                    </div>
                                    <div className="p-3.5 border-t border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-800/30 flex justify-between">
                                        <div className="h-4 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse w-24" />
                                        <div className="h-4 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse w-12" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : Object.keys(mediaData).length === 0 ? (
                        <div className="text-center py-24 bg-card border border-border rounded-3xl shadow-sm animate-in fade-in duration-500">
                            <Film className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-foreground">{t('media_vault.admin.vault_empty')}</h3>
                            <p className="text-muted-foreground mt-2">{t('media_vault.admin.no_media_year', { band: selectedBand === 'Junior Band' ? t('media_vault.admin.junior_band') : t('media_vault.admin.senior_band'), year: selectedYear })}</p>
                        </div>
                    ) : (
                        Object.keys(mediaData).map(month => {
                            const isExpanded = expandedMonth === month;
                            const mediaFiles = mediaData[month];
                            const { average, colorClass, pendingCount } = getMonthlyStats(mediaFiles);

                            return (
                                <div key={month} className="bg-card dark:bg-[#0d1117] border border-border rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
                                    <button onClick={() => toggleMonth(month)} className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors duration-300">
                                        <div className="flex items-center flex-wrap gap-3">
                                            <div className={`p-3 rounded-2xl transition-colors duration-300 ${isExpanded ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground shadow-sm'}`}>
                                                <CalendarIcon className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <h2 className="text-xl font-black text-foreground tracking-tight transition-colors">{t(`months.${month.toLowerCase()}`)} {selectedYear}</h2>
                                                <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">{mediaFiles.length} {t('media_vault.admin.total_videos')}</p>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-3 ml-6 border-l border-border pl-6">
                                                {pendingCount > 0 && (
                                                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                                        <AlertCircle className="w-3.5 h-3.5" /> {pendingCount} {t('media_vault.admin.pending')}
                                                    </span>
                                                )}
                                                {average !== null && (
                                                    <div className={`px-3 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 shadow-sm ${colorClass}`}>
                                                        <Award className="w-4 h-4" /> {t('media_vault.admin.avg')}: {average}/10
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-6 h-6 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-90 text-primary' : ''}`} />
                                    </button>

                                    {/* Smooth CSS Grid Accordion Trick for the Month Wrapper */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="p-4 sm:p-6 pt-0 sm:pt-2 border-t border-border bg-background/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {mediaFiles.map((media) => {
                                                    const isCardExpanded = expandedCards[media.fileId];

                                                    return (
                                                        <div key={media.fileId} className="flex flex-col bg-card dark:bg-[#131821] border border-border rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">

                                                            {/* REPLACED NATIVE VIDEO WITH VIDEOPLAYER */}
                                                            <div className="w-full relative bg-black shrink-0 overflow-hidden transition-all duration-300 aspect-video">
                                                                {videoErrors[media.fileId] || !media.videoUrl ? (
                                                                    <div className="flex flex-col items-center justify-center h-full w-full p-8 bg-slate-900 border-b border-border text-center absolute inset-0">
                                                                        <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t('media_vault.admin.unavailable')}</span>
                                                                    </div>
                                                                ) : (
                                                                    <VideoPlayer
                                                                        src={media.videoUrl}
                                                                        thumbnailUrl={media.thumbnailUrl}
                                                                        id={media.fileId}
                                                                        onError={() => handleVideoError(media.fileId)}
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* ACCORDION HEADER */}
                                                            <div
                                                                onClick={() => toggleCard(media.fileId)}
                                                                className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-muted/30 transition-colors duration-300"
                                                            >
                                                                <div className="min-w-0 pr-4">
                                                                    <h3 className="font-bold text-foreground text-sm truncate transition-colors">{media.eventName || t('media_vault.admin.regular_class')}</h3>
                                                                    <p className="text-muted-foreground text-xs">{media.eventDate}</p>
                                                                </div>
                                                                <div className={`p-2 rounded-full bg-muted transition-all duration-300 ${isCardExpanded ? 'rotate-180 bg-primary/10 text-primary shadow-sm' : ''}`}>
                                                                    <ChevronDown className="w-4 h-4" />
                                                                </div>
                                                            </div>

                                                            {/* Smooth CSS Grid Accordion Trick for the Video Details */}
                                                            <div className={`grid transition-all duration-300 ease-in-out ${isCardExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                                                <div className="overflow-hidden">
                                                                    <div className="p-5 pt-2 flex flex-col flex-1 border-t border-border">
                                                                        <div className="flex justify-between items-start mb-4">
                                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                                                <Users className="w-4 h-4 opacity-70" /> {media.students || '0'} {t('media_vault.admin.students_present')}
                                                                            </div>
                                                                            {media.marks !== null ? (
                                                                                <span className="shrink-0 px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg text-sm font-black tabular-nums">{media.marks}/10</span>
                                                                            ) : (
                                                                                <span className="shrink-0 px-2 py-1 bg-muted text-muted-foreground border border-border rounded-lg text-[10px] font-bold uppercase">{t('media_vault.admin.unscored')}</span>
                                                                            )}
                                                                        </div>

                                                                        <div className="space-y-4 flex-1 mb-5">
                                                                            {/* --- ADDED: Band Stage --- */}
                                                                            {media.bandStage && media.bandStage !== 'N/A' && (
                                                                                <div>
                                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                                                                                        {t('media_vault.admin.band_stage', 'Band Stage')}
                                                                                    </span>
                                                                                    <div className="text-xs text-foreground/90 font-medium px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
                                                                                        {media.bandStage}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            <div>
                                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t('media_vault.admin.instructor_note')}</span>
                                                                                <div className="text-xs text-foreground/90 bg-muted/40 p-3 rounded-xl border border-border/50 max-h-24 overflow-y-auto custom-scrollbar">
                                                                                    {media.description ? media.description : <span className="italic text-muted-foreground/50">{t('media_vault.admin.no_description')}</span>}
                                                                                </div>
                                                                            </div>

                                                                            {media.remark && (
                                                                                <div>
                                                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 block">{t('media_vault.admin.your_feedback')}</span>
                                                                                    <div className="bg-primary/10 border-l-2 border-primary p-3 rounded-r-xl text-xs italic font-medium text-primary/90">
                                                                                        "{media.remark}"
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* ACTION BUTTONS */}
                                                                        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button onClick={() => handleCopyLink(media.videoUrl)} title={t('media_vault.admin.copy_link_title')} className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors duration-300 border border-border">
                                                                                    <Copy className="w-4 h-4" />
                                                                                </button>
                                                                                <button onClick={() => handleDownload(media.videoUrl, media.eventName)} title={t('media_vault.admin.download_title')} className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors duration-300 border border-border" disabled={!media.videoUrl || videoErrors[media.fileId]}>
                                                                                    <Download className="w-4 h-4" />
                                                                                </button>
                                                                                <button onClick={() => setDeleteModal({ isOpen: true, logId: media.logId, fileId: media.fileId })} title={t('media_vault.admin.delete_title')} className="p-2.5 rounded-xl bg-muted text-destructive hover:bg-destructive/10 transition-colors duration-300 border border-border">
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                            <button onClick={() => openReviewModal(media)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-sm ${media.marks !== null ? 'bg-muted text-foreground border border-border hover:bg-muted/80' : 'bg-primary text-white hover:scale-[1.05] hover:shadow-md'}`}>
                                                                                {media.marks !== null ? t('media_vault.admin.edit_grade') : t('media_vault.admin.review')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
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