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
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

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
                <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-primary/80 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 backdrop-blur-md shadow-xl shadow-primary/30 border border-white/20">
                    <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
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
    const availableYears = [
        { label: currentYear.toString(), value: currentYear },
        { label: (currentYear - 1).toString(), value: currentYear - 1 },
        { label: (currentYear - 2).toString(), value: currentYear - 2 }
    ];

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [expandedMonth, setExpandedMonth] = useState(null);
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
                                bandStage: log.bandStage || null, // <-- ADDED: Extract Band Stage
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

                setExpandedMonth(prev => {
                    const availableMonths = Object.keys(grouped);
                    if (prev && availableMonths.includes(prev)) return prev;
                    return null;
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
            bandStage: jobQueue.metadata.bandStage, // <-- ADDED: Ghost Band Stage
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
        const toastId = toast.loading(t('employee_media.deleting_toast', 'Deleting...'));

        try {
            const response = await api.delete(`/employee/media/file/${fileId}`);

            if (response.data.success) {
                toast.success(t('employee_media.delete_success', 'Video deleted'), { id: toastId });

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
            toast.error(error.response?.data?.message || t('employee_media.delete_error', 'Failed to delete'), { id: toastId });
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

    // --- FINALIZED HYBRID DOWNLOAD LOGIC ---
    const handleDownload = async (videoUrl, fileName) => {
        if (!videoUrl) return toast.error(t('employee_media.no_video_found', 'No video found'));
        const toastId = toast.loading(t('employee_media.starting_download', 'Preparing video...'));

        try {
            const safeFileName = fileName ? `${fileName.replace(/\s+/g, '-')}.mp4` : "band-performance.mp4";

            if (Capacitor.isNativePlatform()) {
                // --- NATIVE ANDROID/IOS PATH ---
                const response = await fetch(videoUrl);
                if (!response.ok) throw new Error("Network response was not ok");
                const blob = await response.blob();

                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    try {
                        const base64Data = reader.result.split(',')[1];

                        // 1. Temporarily save to Cache (bypasses Scoped Storage errors safely)
                        const writeResult = await Filesystem.writeFile({
                            path: safeFileName,
                            data: base64Data,
                            directory: Directory.Cache,
                            recursive: true,
                        });

                        toast.success(t('employee_media.download_started', 'Video ready!'), { id: toastId });

                        // 2. Open Native Share Sheet
                        // (User can tap "Save to Gallery", "WhatsApp", etc.)
                        try {
                            const { Share } = await import('@capacitor/share');
                            await Share.share({
                                title: safeFileName,
                                text: `Video: ${safeFileName}`,
                                url: writeResult.uri,
                                dialogTitle: 'Save or Share Video',
                            });
                        } catch (shareErr) {
                            // Suppress error if the user just dismisses the share sheet manually
                            console.log("Share sheet dismissed.");
                        }

                    } catch (err) {
                        console.error("Native write error:", err);
                        toast.error(t('employee_media.download_failed', 'Failed to prepare video.'), { id: toastId });
                    }
                };
            } else {
                // --- WEB BROWSER PATH ---
                const response = await api.post('/employee/media/generate-download-url', {
                    fileUrl: videoUrl,
                    fileName: safeFileName
                });

                if (response.data.success) {
                    const link = document.createElement('a');
                    link.href = response.data.downloadUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success(t('employee_media.download_started', 'Download started!'), { id: toastId });
                } else {
                    throw new Error("Failed to get download link");
                }
            }
        } catch (error) {
            console.error("Download Error:", error);
            toast.error(t('employee_media.download_failed', 'Download failed.'), { id: toastId });

            // Fallback for Web if fetch fails entirely
            if (!Capacitor.isNativePlatform()) {
                window.open(videoUrl, '_blank');
            }
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mt-2 md:mt-4 pb-24 overflow-x-hidden animate-in fade-in duration-700">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8 md:mb-10">
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full md:w-auto min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0 mt-1 sm:mt-0">
                        <Film className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase wrap-break-word leading-tight">
                            {t('employee_media.title', 'Media Gallery')}
                        </h1>
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 truncate mt-1">
                            {t('employee_media.subtitle', 'Your Vault Uploads')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto shrink-0">
                    <div className="w-full sm:w-44 z-10 shrink-0">
                        <CustomSelect
                            value={selectedYear}
                            onChange={(val) => setSelectedYear(Number(val))}
                            options={availableYears}
                        />
                    </div>
                    <Button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="h-12 px-6 sm:px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all w-full sm:w-auto"
                    >
                        <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="truncate">{t('employee_media.upload_media', 'Upload Media')}</span>
                    </Button>
                </div>
            </div>

            {/* --- LOADERS & EMPTY STATES --- */}
            {isLoading && !isUploading ? (
                <div className="space-y-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-card rounded-[2.5rem] border border-border/50" />
                    ))}
                </div>
            ) : Object.keys(displayMediaData).length === 0 && !isUploading ? (
                <div className="bg-card border-2 border-dashed border-border/60 rounded-[3rem] p-8 sm:p-12 md:p-20 mt-8 text-center flex flex-col items-center relative overflow-hidden group hover:border-primary/30 hover:bg-muted/10 transition-all duration-500 max-w-2xl mx-auto">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-muted/50 rounded-full flex items-center justify-center border border-border/50 shadow-inner z-10">
                            <Film className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
                        </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-3 tracking-tight uppercase italic wrap-break-word">{t('employee_media.no_media_found', 'No Media Found')}</h2>
                    <p className="text-muted-foreground font-medium text-xs sm:text-sm md:text-base leading-relaxed max-w-md">
                        {t('employee_media.no_uploads_year', { year: selectedYear })}
                    </p>
                </div>
            ) : (
                <div className="space-y-6 sm:space-y-8">
                    {/* --- GALLERY RENDER LOOP --- */}
                    {Object.keys(displayMediaData).map((month) => {
                        const isExpanded = expandedMonth === month;
                        const mediaFiles = displayMediaData[month];
                        const { average, colorClass } = getMonthlyStats(mediaFiles);

                        return (
                            <div key={month} className="bg-card rounded-4xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 relative overflow-hidden flex flex-col transition-all duration-300 min-w-0">

                                {/* Card Accent Line */}
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 pointer-events-none" />

                                {/* MONTH HEADER */}
                                <button
                                    onClick={() => toggleMonth(month)}
                                    className="w-full px-5 py-4 sm:px-8 sm:py-6 flex flex-row items-center justify-between bg-transparent hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors gap-3 sm:gap-4 group min-w-0"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 min-w-0 flex-1 text-left">
                                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                            <CalendarIcon className={`w-5 h-5 sm:w-7 sm:h-7 shrink-0 ${isExpanded ? 'text-primary' : 'text-muted-foreground group-hover:text-primary transition-colors'}`} />
                                            <h2 className="text-lg sm:text-2xl font-black text-foreground uppercase tracking-tight truncate">{month} {selectedYear}</h2>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:border-l-2 sm:border-border/60 sm:pl-5 min-w-0">
                                            <span className="px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl bg-muted/60 text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap shadow-sm shrink-0">
                                                {mediaFiles.length} {t('employee_media.videos')}
                                            </span>
                                            {average !== null && (
                                                <div className={`px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl border text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-sm shrink-0 ${colorClass}`}>
                                                    <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                    {t('employee_media.avg')}: {average}/10
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-muted/50 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary shrink-0 ${isExpanded ? 'rotate-180 bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                </button>

                                {/* ACCORDION BODY WITH CSS GRID TRICK */}
                                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="p-4 sm:p-6 lg:p-8 pt-0 sm:pt-2 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">

                                            {/* MAP THROUGH CARDS */}
                                            {mediaFiles.map((media) => {
                                                const isCardExpanded = expandedCards[media.id];

                                                return media.isGhost ? (
                                                    // --- THE UPLOADING GHOST CARD ---
                                                    <div key="ghost" className="group bg-card border-2 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.15)] rounded-3xl sm:rounded-4xl overflow-hidden flex flex-col relative transition-all duration-300 min-w-0">
                                                        <div className="relative aspect-video bg-black overflow-hidden shrink-0">
                                                            <div className="absolute top-3 right-3 z-20">
                                                                <button onClick={handleCancelUpload} className="p-2 bg-black/40 hover:bg-destructive/90 active:bg-destructive backdrop-blur-md text-white rounded-xl transition-all duration-200 shadow-lg border border-white/20 active:scale-95" title={t('employee_media.cancel_upload')}>
                                                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
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
                                                                    <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-pulse" />
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50">
                                                                <div className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                                                            </div>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter">{uploadProgress}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col p-5 sm:p-6 border-t border-border opacity-70 animate-pulse bg-muted/10 flex-1 min-w-0">
                                                            <h3 className="font-black text-foreground text-sm truncate mb-1 uppercase tracking-tight">{media.eventName || t('employee_media.regular_class', 'Regular Class')}</h3>
                                                            <p className="text-muted-foreground text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-4 truncate">{media.eventDate}</p>

                                                            {/* --- ADDED: Ghost Card Band Stage --- */}
                                                            {media.bandStage && media.bandStage !== 'N/A' && (
                                                                <div className="mb-4">
                                                                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                                                                        {t('employee_media.band_stage', 'Band Stage')}
                                                                    </span>
                                                                    <div className="text-xs text-foreground/90 font-medium px-2.5 py-1.5 bg-muted/40 rounded-lg border border-border/50 inline-block">
                                                                        {media.bandStage}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="mt-auto">
                                                                <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 bg-primary/10 w-fit px-3 py-1.5 rounded-lg border border-primary/20">
                                                                    <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin shrink-0" />
                                                                    <span className="truncate">{uploadProgress === 100 ? t('employee_media.finalizing') : t('employee_media.uploading')}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // --- THE ACTUAL RENDERED VIDEO CARD ---
                                                    <div key={media.id} className="flex flex-col bg-card dark:bg-[#131821] border border-border/60 rounded-3xl sm:rounded-4xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group/card min-w-0">

                                                        {/* VIDEO PLAYER AREA */}
                                                        <div className="w-full relative bg-black shrink-0 overflow-hidden aspect-video">
                                                            {videoErrors[media.id] || !media.videoUrl ? (
                                                                <div className="flex flex-col items-center justify-center h-full w-full p-8 bg-slate-900 border-b border-border text-center absolute inset-0">
                                                                    <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50 mb-2 sm:mb-3 shrink-0" />
                                                                    <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('employee_media.unavailable', 'Unavailable')}</span>
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

                                                        {/* CARD FOOTER INFO */}
                                                        <div className="p-4 sm:p-5 md:p-6 flex flex-col flex-1 min-w-0">

                                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 min-w-0 w-full">
                                                                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                                                                    <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-full shadow-sm shrink-0">
                                                                        {media.schoolName}
                                                                    </span>
                                                                    <span className="bg-muted text-muted-foreground border border-border/60 px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate shadow-sm shrink-0">
                                                                        {media.band === 'Junior Band' ? t('employee_media.junior_band') : t('employee_media.senior_band')}
                                                                    </span>
                                                                </div>
                                                                {media.marks !== null ? (
                                                                    <span className="self-start sm:self-auto shrink-0 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs sm:text-sm font-black tabular-nums shadow-sm">
                                                                        {media.marks}/10
                                                                    </span>
                                                                ) : (
                                                                    <span className="self-start sm:self-auto shrink-0 px-2.5 py-1 bg-muted/60 text-muted-foreground border border-border/60 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                                                                        {t('employee_media.unscored', 'Unscored')}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1 mb-5">
                                                                <h3 className="font-black text-foreground text-base sm:text-lg wrap-break-word line-clamp-2 leading-tight tracking-tight uppercase transition-colors">
                                                                    {media.eventName || t('employee_media.regular_class', 'Regular Class')}
                                                                </h3>
                                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground min-w-0">
                                                                    <span className="flex items-center gap-1 sm:gap-1.5 shrink-0"><CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {media.eventDate}</span>
                                                                    <span className="text-border text-xs hidden sm:inline-block">•</span>
                                                                    <span className="flex items-center gap-1 sm:gap-1.5 shrink-0"><Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {media.students || '0'}</span>
                                                                </div>

                                                                {/* --- ADDED: Real Card Band Stage --- */}
                                                                {media.bandStage && media.bandStage !== 'N/A' && (
                                                                    <div className="mt-3">
                                                                        <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                                                                            {t('employee_media.band_stage', 'Band Stage')}
                                                                        </span>
                                                                        <div className="text-xs text-foreground/90 font-medium px-2.5 py-1.5 bg-muted/30 rounded-lg border border-border/50 inline-block">
                                                                            {media.bandStage}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {media.remark && (
                                                                <div className="mt-4 bg-primary/10 border-l-2 border-primary p-3 rounded-r-xl">
                                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 block">
                                                                        {t('employee_media.admin_feedback', 'Admin Feedback')}
                                                                    </span>
                                                                    <p className="text-xs italic font-medium text-primary/90 leading-relaxed">
                                                                        "{media.remark}"
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* ACTION BUTTONS */}
                                                            <div className="flex items-center justify-between gap-2 pt-4 sm:pt-5 border-t border-border/60 mt-auto shrink-0 w-full min-w-0">
                                                                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pr-2">
                                                                    <button onClick={(e) => { e.stopPropagation(); handleCopyLink(media.videoUrl); }} title={t('employee_media.copy_link_title')} className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-300 border border-transparent hover:border-primary/20 shadow-sm shrink-0">
                                                                        <Copy className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDownload(media.videoUrl, media.eventName); }} title={t('employee_media.download_title')} className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-300 border border-transparent hover:border-primary/20 shadow-sm shrink-0" disabled={!media.videoUrl || videoErrors[media.id]}>
                                                                        <Download className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(media); }} title={t('employee_media.share_tooltip', 'Share on WhatsApp')} className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors duration-300 border border-[#25D366]/20 shadow-sm shrink-0">
                                                                        <WhatsAppIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>

                                                                {media.marks === null && !media.remark && (
                                                                    <button onClick={(e) => triggerDeleteConfirmation(e, media.id, month)} title={t('employee_media.delete_title')} className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 border border-destructive/20 shadow-sm shrink-0 ml-auto">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
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
                <div className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 animate-in fade-in`} onClick={() => setDeleteConfirmation(null)}>
                    <div
                        className={`bg-card w-full max-w-sm rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40 z-20 rounded-t-[inherit] pointer-events-none" />

                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                        </div>

                        <div className="p-6 md:p-8 text-center pt-6 md:pt-10">
                            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-6 shadow-inner border border-destructive/20 relative">
                                <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-40" />
                                <AlertTriangle className="w-10 h-10 relative z-10" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-foreground mb-2 tracking-tight uppercase">{t('employee_media.delete_title', 'Delete Media?')}</h3>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed px-2">
                                {t('employee_media.delete_desc', 'Are you sure you want to delete this video?')}
                            </p>
                        </div>

                        <div className="bg-muted/10 p-5 border-t border-border/50 flex flex-col gap-3 rounded-b-3xl pb-safe">
                            <Button
                                variant="destructive"
                                className="w-full h-12 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-destructive/20 hover:shadow-destructive/30 active:scale-[0.98] transition-all"
                                onClick={executeDelete}
                            >
                                {t('employee_media.yes_delete', 'Yes, Delete')}
                            </Button>
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="w-full h-12 text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-transparent hover:border-border/80"
                            >
                                {t('employee_media.cancel', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeMedia;