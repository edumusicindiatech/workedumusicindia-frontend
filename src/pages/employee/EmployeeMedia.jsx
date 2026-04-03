import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import {
    Film, Calendar as CalendarIcon, UploadCloud, MapPin,
    Users, Award, Clock, X, Download,
    ChevronDown, Trash2, AlertTriangle, Loader2, PlayCircle, Copy
} from "lucide-react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import api from "../../api/axios";
import EmployeeMediaUploadModal from "../../modals/employee/EmployeeMediaUploadModal";
import CustomSelect from "../../components/ui/CustomSelect";
import { useTranslation } from "react-i18next";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { withCredentials: true });

// --- WHATSAPP ICON COMPONENT ---
const WhatsAppIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.484-1.459-1.657-1.756-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
);

// --- THE INLINE VIDEO PLAYER COMPONENT ---
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

const EmployeeMedia = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [expandedMonth, setExpandedMonth] = useState(null); // Defaults to null (closed)
    const [expandedCards, setExpandedCards] = useState({});
    const [videoErrors, setVideoErrors] = useState({});
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [mediaData, setMediaData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const { isUploading, jobQueue } = useSelector((state) => state.upload);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleCancelUpload = (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('vault-upload-cancel'));
        toast.error(t('employee_media.upload_cancelled'));
    };

    const toggleMonth = (month) => setExpandedMonth(expandedMonth === month ? null : month);

    const toggleCard = (fileId) => {
        setExpandedCards(prev => ({ ...prev, [fileId]: !prev[fileId] }));
    };

    const handleVideoError = (fileId) => setVideoErrors(prev => ({ ...prev, [fileId]: true }));

    const fetchMedia = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/employee/media?year=${selectedYear}&_t=${Date.now()}`);

            if (response.data.success) {
                const rawLogs = response.data.data;
                const grouped = {};
                const monthNames = [
                    t('months.january'), t('months.february'), t('months.march'),
                    t('months.april'), t('months.may'), t('months.june'),
                    t('months.july'), t('months.august'), t('months.september'),
                    t('months.october'), t('months.november'), t('months.december')
                ];

                rawLogs.forEach(log => {
                    const date = new Date(log.eventDate);
                    const month = monthNames[date.getMonth()];

                    if (!grouped[month]) grouped[month] = [];

                    if (log.files && log.files.length > 0) {
                        log.files.forEach((file, index) => {
                            grouped[month].push({
                                id: file._id || `${log._id}-${index}`,
                                logId: log._id,
                                schoolName: log.school?.schoolName || t('employee_media.unknown_school'),
                                band: log.band,
                                eventName: log.eventContext || null,
                                description: log.description,
                                eventDate: date.toISOString().split('T')[0],
                                students: log.studentRecord,
                                marks: file.marks !== undefined ? file.marks : null,
                                remark: file.remark || null,
                                videoUrl: file.url,
                                thumbnailUrl: file.thumbnailUrl || null,
                            });
                        });
                    }
                });

                setMediaData(grouped);

                // Ensure month accordion resets correctly if a year is switched
                setExpandedMonth(prev => {
                    const availableMonths = Object.keys(grouped);
                    if (prev && availableMonths.includes(prev)) return prev;
                    return null; // Forces it to remain closed
                });
            }
        } catch (error) {
            console.error("Failed to load media", error);
            toast.error(t('employee_media.fetch_error'));
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, t]);

    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

    // --- BULLETPROOF SOCKET LISTENERS ---
    useEffect(() => {
        if (!user || (!user._id && !user.id)) return;
        const myUserId = user._id || user.id;

        const handleDirectGrade = (data) => {
            if (data?.userId === myUserId) {
                setMediaData(prevData => {
                    const newData = { ...prevData };
                    for (const month in newData) {
                        const fileIndex = newData[month].findIndex(f => f.id === data.fileId);
                        if (fileIndex !== -1) {
                            const updatedMonthArray = [...newData[month]];
                            updatedMonthArray[fileIndex] = {
                                ...updatedMonthArray[fileIndex],
                                marks: data.marks,
                                remark: data.remark
                            };
                            newData[month] = updatedMonthArray;
                            break;
                        }
                    }
                    return newData;
                });
            }
        };

        const handleDirectDelete = (data) => {
            if (data?.userId === myUserId) {
                setMediaData(prevData => {
                    const newData = { ...prevData };
                    for (const month in newData) {
                        const updatedMonthFiles = newData[month].filter(f => f.id !== data.fileId);
                        if (updatedMonthFiles.length !== newData[month].length) {
                            if (updatedMonthFiles.length === 0) {
                                delete newData[month];
                            } else {
                                newData[month] = updatedMonthFiles;
                            }
                            break;
                        }
                    }
                    return newData;
                });
            }
        };

        const handleRemoteNotification = (data) => {
            if (data?.userId === myUserId && data?.notification?.type === 'Media') {
                toast.success(t('employee_media.admin_reviewed'), { icon: '🎓', duration: 4000 });
            }
        };

        socket.on('media_graded_direct', handleDirectGrade);
        socket.on('media_deleted_direct', handleDirectDelete);
        socket.on('new_notification_for_user', handleRemoteNotification);

        return () => {
            socket.off('media_graded_direct', handleDirectGrade);
            socket.off('media_deleted_direct', handleDirectDelete);
            socket.off('new_notification_for_user', handleRemoteNotification);
        };
    }, [user, t]);

    // --- UPLOADER LISTENERS ---
    useEffect(() => {
        const handleProgress = (e) => setUploadProgress(e.detail);
        const handleRefresh = () => fetchMedia();
        const handleSuccess = () => toast.success(t('employee_media.upload_success'));
        const handleError = (e) => toast.error(e.detail || t('employee_media.upload_error'));

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
    }, [fetchMedia, t]);

    // --- GENERATE TEMPORARY LOCAL PREVIEW FOR GHOST CARD ---
    useEffect(() => {
        if (isUploading && jobQueue?.files?.length > 0) {
            const url = URL.createObjectURL(jobQueue.files[0]);
            setPreviewUrl(url);

            const d = new Date(jobQueue.metadata.eventDate || new Date());
            const monthNames = [
                t('months.january'), t('months.february'), t('months.march'),
                t('months.april'), t('months.may'), t('months.june'),
                t('months.july'), t('months.august'), t('months.september'),
                t('months.october'), t('months.november'), t('months.december')
            ];
            setExpandedMonth(monthNames[d.getMonth()]);

            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
            setUploadProgress(0);
        }
    }, [isUploading, jobQueue, t]);

    // --- INJECT GHOST CARD INTO DATA ---
    const displayMediaData = { ...mediaData };
    if (isUploading && jobQueue) {
        const d = new Date(jobQueue.metadata.eventDate || new Date());
        const monthNames = [
            t('months.january'), t('months.february'), t('months.march'),
            t('months.april'), t('months.may'), t('months.june'),
            t('months.july'), t('months.august'), t('months.september'),
            t('months.october'), t('months.november'), t('months.december')
        ];
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

        if (!displayMediaData[monthName]) displayMediaData[monthName] = [];
        displayMediaData[monthName] = [ghostRecord, ...displayMediaData[monthName]];
    }

    const getMonthlyStats = (files) => {
        const gradedFiles = files.filter(f => f.marks !== null && !f.isGhost);
        if (gradedFiles.length === 0) return { average: null, colorClass: "bg-muted text-muted-foreground border-border" };

        const sum = gradedFiles.reduce((acc, curr) => acc + curr.marks, 0);
        const average = Math.round(sum / gradedFiles.length);

        let colorClass = "";
        if (average < 5) colorClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
        else if (average < 8) colorClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
        else colorClass = "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30";

        return { average, colorClass };
    };

    const triggerDeleteConfirmation = (e, fileId, monthKey) => {
        e.stopPropagation();
        setDeleteConfirmation({ fileId, monthKey });
    };

    const executeDelete = async () => {
        if (!deleteConfirmation) return;

        const { fileId, monthKey } = deleteConfirmation;
        const toastId = toast.loading(t('employee_media.deleting_toast'));

        try {
            const response = await api.delete(`/employee/media/file/${fileId}`);

            if (response.data.success) {
                toast.success(t('employee_media.delete_success'), { id: toastId });

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
            toast.error(error.response?.data?.message || t('employee_media.delete_error'), { id: toastId });
        } finally {
            setDeleteConfirmation(null);
        }
    };

    const handleCopyLink = (url) => {
        navigator.clipboard.writeText(url);
        toast.success(t('employee_media.link_copied', 'Link copied to clipboard!'));
    };

    const handleWhatsAppShare = (media) => {
        const text = `Check out this training video from EduMusic India!\n\n*${media.eventName || media.schoolName}*\n${media.videoUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleDownload = async (videoUrl, fileName) => {
        if (!videoUrl) return toast.error(t('employee_media.no_video_found'));
        const toastId = toast.loading(t('employee_media.starting_download'));

        try {
            const response = await api.post('/employee/media/generate-download-url', {
                fileUrl: videoUrl,
                fileName: fileName ? `${fileName.replace(/\s+/g, '-')}.mp4` : "band-performance.mp4"
            });

            if (response.data.success) {
                const link = document.createElement('a');
                link.href = response.data.downloadUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(t('employee_media.download_started'), { id: toastId });
            } else {
                throw new Error("Failed to get download link");
            }
        } catch (error) {
            console.error("Download Error:", error);
            toast.error(t('employee_media.download_failed'), { id: toastId });
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 mt-4 pb-24">

            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight mb-2">
                        {t('employee_media.title')}
                    </h1>
                    <p className="text-[13px] font-medium text-muted-foreground flex items-center gap-2">
                        <Film className="w-4 h-4" />
                        {t('employee_media.subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-full sm:w-32 z-10 shrink-0">
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
                        <span className="hidden sm:inline">{t('employee_media.upload_media')}</span>
                        <span className="sm:hidden">{t('employee_media.upload')}</span>
                    </button>
                </div>
            </div>

            {/* --- LOADERS & EMPTY STATES --- */}
            {isLoading && !isUploading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-card dark:bg-[#131821] border border-border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            <div className="w-full aspect-video bg-muted/60 dark:bg-slate-800/50 animate-pulse" />
                            <div className="p-4 space-y-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="w-4 h-4 rounded-full bg-muted/80 dark:bg-slate-700/80 animate-pulse shrink-0" />
                                        <div className="h-4 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse w-3/4" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border dark:border-slate-800/80 space-y-2">
                                    <div className="h-3 bg-muted/80 dark:bg-slate-700/80 rounded-md animate-pulse w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : Object.keys(displayMediaData).length === 0 && !isUploading ? (
                <div className="text-center py-16 bg-card dark:bg-[#181d29] rounded-2xl border border-border dark:border-slate-700/50">
                    <Film className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-foreground">{t('employee_media.no_media_found')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('employee_media.no_uploads_year', { year: selectedYear })}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* --- GALLERY RENDER LOOP --- */}
                    {Object.keys(displayMediaData).map((month) => {
                        const isExpanded = expandedMonth === month;
                        const mediaFiles = displayMediaData[month];
                        const { average, colorClass } = getMonthlyStats(mediaFiles);

                        return (
                            <div key={month} className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm transition-all duration-200">

                                {/* MONTH HEADER */}
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
                                                {mediaFiles.length} {t('employee_media.videos')}
                                            </span>
                                            {average !== null && (
                                                <div className={`px-2.5 py-1 rounded-md border text-[11px] font-extrabold flex items-center gap-1.5 ${colorClass}`}>
                                                    <Award className="w-3 h-3" />
                                                    {t('employee_media.avg')}: {average}/10
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {/* GRID WRAPPER FOR SMOOTH ANIMATION */}
                                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="p-4 sm:p-6 pt-0 sm:pt-2 border-t border-border dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                            {/* MAP THROUGH CARDS */}
                                            {mediaFiles.map((media) => {
                                                const isCardExpanded = expandedCards[media.id];

                                                return media.isGhost ? (
                                                    // --- THE UPLOADING GHOST CARD ---
                                                    <div key="ghost" className="group bg-background dark:bg-[#0d1117] border border-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-3xl overflow-hidden flex flex-col relative transition-all duration-300">
                                                        <div className="relative aspect-video bg-black overflow-hidden shrink-0">
                                                            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
                                                                <button onClick={handleCancelUpload} className="p-2 sm:p-2 bg-black/40 hover:bg-destructive/90 active:bg-destructive backdrop-blur-md text-white rounded-full transition-all duration-200 shadow-lg border border-white/20 active:scale-90" title={t('employee_media.cancel_upload')}>
                                                                    <X className="w-5 h-5 sm:w-4 sm:h-4" />
                                                                </button>
                                                            </div>
                                                            {previewUrl ? (
                                                                <video
                                                                    src={previewUrl}
                                                                    className="w-full h-full object-cover transition-all duration-300"
                                                                    style={{ filter: `blur(${Math.max(0, 8 - (uploadProgress * 0.08))}px) grayscale(${Math.max(0, 100 - uploadProgress)}%) brightness(${0.5 + (uploadProgress * 0.005)})` }}
                                                                    autoPlay loop muted playsInline
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                                    <UploadCloud className="w-8 h-8 text-primary animate-pulse" />
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50">
                                                                <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                                                            </div>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <span className="text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter">{uploadProgress}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between p-4 bg-card">
                                                            <div className="min-w-0 pr-4">
                                                                <h3 className="font-bold text-foreground text-sm truncate transition-colors">{media.eventName || t('employee_media.regular_class', 'Regular Class')}</h3>
                                                                <p className="text-muted-foreground text-xs">{media.eventDate}</p>
                                                            </div>
                                                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                        </div>
                                                        <div className="p-5 pt-2 flex flex-col flex-1 border-t border-border opacity-60 animate-pulse">
                                                            <p className="text-[12px] font-semibold text-primary flex items-center gap-1.5">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                {uploadProgress === 100 ? t('employee_media.finalizing') : t('employee_media.uploading')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // --- THE ACTUAL RENDERED VIDEO CARD ---
                                                    <div key={media.id} className="flex flex-col bg-card dark:bg-[#131821] border border-border rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">

                                                        {/* VIDEO PLAYER AREA */}
                                                        <div className="w-full relative bg-black shrink-0 overflow-hidden transition-all duration-300 aspect-video">
                                                            {videoErrors[media.id] || !media.videoUrl ? (
                                                                <div className="flex flex-col items-center justify-center h-full w-full p-8 bg-slate-900 border-b border-border text-center absolute inset-0">
                                                                    <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                                                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t('employee_media.unavailable', 'Unavailable')}</span>
                                                                </div>
                                                            ) : (
                                                                <VideoPlayer
                                                                    src={media.videoUrl}
                                                                    thumbnailUrl={media.thumbnailUrl}
                                                                    id={media.id}
                                                                    onError={() => handleVideoError(media.id)}
                                                                />
                                                            )}
                                                        </div>

                                                        {/* ACCORDION HEADER */}
                                                        <div
                                                            onClick={() => toggleCard(media.id)}
                                                            className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-muted/30 transition-colors duration-300"
                                                        >
                                                            <div className="min-w-0 pr-4">
                                                                <h3 className="font-bold text-foreground text-sm truncate transition-colors">{media.eventName || t('employee_media.regular_class', 'Regular Class')}</h3>
                                                                <p className="text-muted-foreground text-xs">{media.eventDate}</p>
                                                            </div>
                                                            <div className={`p-2 rounded-full bg-muted transition-all duration-300 ${isCardExpanded ? 'rotate-180 bg-primary/10 text-primary shadow-sm' : ''}`}>
                                                                <ChevronDown className="w-4 h-4" />
                                                            </div>
                                                        </div>

                                                        {/* ACCORDION BODY WITH CSS GRID TRICK */}
                                                        <div className={`grid transition-all duration-300 ease-in-out ${isCardExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                                            <div className="overflow-hidden">
                                                                <div className="p-5 pt-2 flex flex-col flex-1 border-t border-border">

                                                                    {/* Location / Band Badges */}
                                                                    <div className="flex items-center justify-between gap-2 mb-4">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                            <h3 className="font-bold text-foreground text-sm truncate">{media.schoolName}</h3>
                                                                        </div>
                                                                        <span className="shrink-0 bg-primary/10 text-primary text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm tracking-wider">
                                                                            {media.band === 'Junior Band' ? t('employee_media.junior_band') : t('employee_media.senior_band')}
                                                                        </span>
                                                                    </div>

                                                                    {/* Stats row */}
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                                            <Users className="w-4 h-4 opacity-70" /> {media.students || '0'} {t('employee_media.students_present', 'Present')}
                                                                        </div>
                                                                        {media.marks !== null ? (
                                                                            <span className="shrink-0 px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg text-sm font-black tabular-nums">{media.marks}/10</span>
                                                                        ) : (
                                                                            <span className="shrink-0 px-2 py-1 bg-muted text-muted-foreground border border-border rounded-lg text-[10px] font-bold uppercase">{t('employee_media.unscored', 'Unscored')}</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Notes & Remarks */}
                                                                    <div className="space-y-4 flex-1 mb-5">
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t('employee_media.instructor_note', 'Your Note')}</span>
                                                                            <div className="text-xs text-foreground/90 bg-muted/40 p-3 rounded-xl border border-border/50 max-h-24 overflow-y-auto custom-scrollbar">
                                                                                {media.description ? media.description : <span className="italic text-muted-foreground/50">{t('employee_media.no_description', 'No description provided.')}</span>}
                                                                            </div>
                                                                        </div>

                                                                        {media.remark && (
                                                                            <div>
                                                                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 block">{t('employee_media.your_feedback', 'Admin Feedback')}</span>
                                                                                <div className="bg-primary/10 border-l-2 border-primary p-3 rounded-r-xl text-xs italic font-medium text-primary/90">
                                                                                    "{media.remark}"
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* ACTION BUTTONS */}
                                                                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleCopyLink(media.videoUrl); }} title={t('employee_media.copy_link_title')} className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 hover:text-primary transition-colors duration-300 border border-border shadow-sm">
                                                                            <Copy className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDownload(media.videoUrl, media.eventName); }} title={t('employee_media.download_title')} className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 hover:text-primary transition-colors duration-300 border border-border shadow-sm" disabled={!media.videoUrl || videoErrors[media.id]}>
                                                                            <Download className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(media); }} title={t('employee_media.share_tooltip', 'Share on WhatsApp')} className="p-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors duration-300 border border-[#25D366]/20 shadow-sm">
                                                                            <WhatsAppIcon className="w-4 h-4" />
                                                                        </button>

                                                                        {/* Only allow delete if not graded */}
                                                                        {media.marks === null && !media.remark && (
                                                                            <button onClick={(e) => triggerDeleteConfirmation(e, media.id, month)} title={t('employee_media.delete_title')} className="p-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors duration-300 border border-destructive/20 ml-auto shadow-sm">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        )}
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
                    })}
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
                                <h3 className="text-xl font-bold text-foreground mb-2">{t('employee_media.delete_title')}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {t('employee_media.delete_desc')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-border dark:border-slate-800">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                            >
                                {t('employee_media.cancel')}
                            </button>
                            <button
                                onClick={executeDelete}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors shadow-md"
                            >
                                {t('employee_media.yes_delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeMedia;