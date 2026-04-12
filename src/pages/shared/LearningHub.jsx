import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { BookOpen, UploadCloud, GraduationCap, X, Loader2, Trash2, Download, Edit2, CalendarDays, ChevronDown, PlayCircle, AlertTriangle } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import LearningMediaUploadModal from "../../modals/admin/LearningMediaUploadModal";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { withCredentials: true });

const WhatsAppIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.484-1.459-1.657-1.756-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
);

const VideoPlayer = ({ src, thumbnailUrl }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const videoRef = useRef(null);

    if (!isLoaded) {
        return (
            <div
                className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center cursor-pointer group bg-cover bg-center"
                style={{ backgroundImage: `url(${thumbnailUrl || 'https://via.placeholder.com/1280x720/000000/FFFFFF/?text=EduMusic+Video'})` }}
                onClick={() => setIsLoaded(true)}
            >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300"></div>
                <div className="relative z-10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl sm:rounded-3xl bg-primary/80 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 backdrop-blur-md shadow-xl shadow-primary/30 border border-white/20">
                    <PlayCircle className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            controlsList="nodownload"
            preload="auto"
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black animate-in fade-in duration-300"
        />
    );
};

const LearningHub = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const { isUploading, jobQueue } = useSelector((state) => state.upload);

    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, videoId: null });
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [modalDragOffset, setModalDragOffset] = useState(0);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const modalDragStartY = useRef(0);

    const [editingVideo, setEditingVideo] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");

    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [expandedCards, setExpandedCards] = useState({});

    const isLearningUploadActive = isUploading && jobQueue?.uploadType === 'learning-hub';
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

    const handleCloseEditModal = () => {
        setIsModalClosing(true);
        setModalDragOffset(window.innerHeight);
        setTimeout(() => {
            setEditModalOpen(false);
            setEditingVideo(null);
            setIsModalClosing(false);
            setModalDragOffset(0);
        }, 300);
    };

    const handleCloseDeleteModal = () => {
        setIsModalClosing(true);
        setModalDragOffset(window.innerHeight);
        setTimeout(() => {
            setDeleteDialog({ isOpen: false, videoId: null });
            setIsModalClosing(false);
            setModalDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => { 
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
        modalDragStartY.current = e.touches[0].clientY; 
    };

    const handleTouchMove = (e) => {
        const delta = e.touches[0].clientY - modalDragStartY.current;
        if (delta > 0) setModalDragOffset(delta);
    };

    const handleTouchEndEdit = () => {
        if (modalDragOffset > 120) handleCloseEditModal();
        else setModalDragOffset(0);
    };

    const handleTouchEndDelete = () => {
        if (modalDragOffset > 120) handleCloseDeleteModal();
        else setModalDragOffset(0);
    };

    const fetchVideos = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/learning');
            if (response.data.success) {
                setVideos(response.data.data);
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.load_failed', 'Failed to load videos'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    useEffect(() => {
        const handleNewVideo = (newVideo) => {
            setVideos(prev => prev.some(v => v._id === newVideo._id) ? prev : [newVideo, ...prev]);
        };

        const handleUpdateVideo = (updatedVideo) => {
            setVideos(prev => prev.map(v => v._id === updatedVideo._id ? updatedVideo : v));
        };

        const handleDeleteVideo = ({ videoId }) => {
            setVideos(prev => prev.filter(v => v._id !== videoId));
        };

        socket.on('learning_video_added', handleNewVideo);
        socket.on('learning_video_updated', handleUpdateVideo);
        socket.on('learning_video_deleted', handleDeleteVideo);

        return () => {
            socket.off('learning_video_added', handleNewVideo);
            socket.off('learning_video_updated', handleUpdateVideo);
            socket.off('learning_video_deleted', handleDeleteVideo);
        };
    }, []);

    useEffect(() => {
        const handleProgress = (e) => setUploadProgress(e.detail);
        const handleRefresh = () => fetchVideos();
        const handleSuccess = () => toast.success(t('learning_hub.toasts.update_success', 'Lesson uploaded successfully!'));
        const handleError = (e) => toast.error(e.detail || t('learning_hub.toasts.upload_failed', 'Upload failed'));

        window.addEventListener('learning-upload-progress', handleProgress);
        window.addEventListener('refreshLearningHub', handleRefresh);
        window.addEventListener('learning-upload-success', handleSuccess);
        window.addEventListener('learning-upload-error', handleError);

        return () => {
            window.removeEventListener('learning-upload-progress', handleProgress);
            window.removeEventListener('refreshLearningHub', handleRefresh);
            window.removeEventListener('learning-upload-success', handleSuccess);
            window.removeEventListener('learning-upload-error', handleError);
        };
    }, [t]);

    useEffect(() => {
        if (isLearningUploadActive && jobQueue?.files?.length > 0) {
            const url = URL.createObjectURL(jobQueue.files[0]);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
            setUploadProgress(0);
        }
    }, [isLearningUploadActive, jobQueue]);

    const handleCancelUpload = (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('learning-upload-cancel'));
        toast.error(t('learning_hub.toasts.upload_cancelled', 'Upload cancelled'));
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    };

    const triggerDelete = (videoId) => {
        setDeleteDialog({ isOpen: true, videoId });
    };

    const confirmDelete = async () => {
        if (!deleteDialog.videoId) return;

        const toastId = toast.loading(t('learning_hub.toasts.deleting', 'Deleting...'));
        try {
            const response = await api.delete(`/learning/${deleteDialog.videoId}`);
            if (response.data.success) {
                toast.success(t('learning_hub.toasts.delete_success', 'Video deleted'), { id: toastId });
                setVideos(prev => prev.filter(v => v._id !== deleteDialog.videoId));
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.delete_failed', 'Failed to delete'), { id: toastId });
        } finally {
            handleCloseDeleteModal();
        }
    };

    const openEditModal = (video) => {
        setEditingVideo(video);
        setEditTitle(video.title);
        setEditDescription(video.description || "");
        setEditModalOpen(true);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!editTitle.trim()) return toast.error(t('learning_hub.toasts.title_required', 'Title is required'));

        const toastId = toast.loading(t('learning_hub.toasts.updating', 'Updating...'));
        try {
            const res = await api.put(`/learning/${editingVideo._id}`, {
                title: editTitle,
                description: editDescription
            });

            if (res.data.success) {
                toast.success(t('learning_hub.toasts.update_success', 'Updated successfully'), { id: toastId });
                setVideos(prev => prev.map(v => v._id === editingVideo._id ? res.data.data : v));
                handleCloseEditModal();
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.update_failed', 'Failed to update'), { id: toastId });
        }
    };

    const handleDownload = async (video) => {
        const toastId = toast.loading(t('learning_hub.toasts.preparing_download', 'Preparing download...'));
        try {
            const safeTitle = video.title.replace(/[^a-zA-Z0-9]/g, '_');
            const ext = video.fileUrl.split('.').pop() || 'mp4';
            const fileName = `EduMusic_${safeTitle}.${ext}`;

            const response = await api.post('/learning/download', {
                fileUrl: video.fileUrl,
                fileName: fileName
            });

            if (response.data.success) {
                const link = document.createElement('a');
                link.href = response.data.downloadUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(t('learning_hub.toasts.download_started', 'Download started'), { id: toastId });
            } else {
                throw new Error("Failed to get download link");
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.download_failed', 'Download failed'), { id: toastId });
        }
    };

    const handleWhatsAppShare = (video) => {
        const text = `Check out this training video from EduMusic India!\n\n*${video.title}*\n${video.fileUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const toggleExpand = (videoId) => {
        setExpandedCards(prev => ({
            ...prev,
            [videoId]: !prev[videoId]
        }));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-24 p-4 sm:p-6 lg:p-8 mt-2 md:mt-0">

            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-20">
                <div className="flex items-center gap-4 sm:gap-5">
                    <div className="relative">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase">
                                {t('learning_hub.page_title', 'Learning Hub')}
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            {t('learning_hub.page_subtitle', 'Training & Resources')}
                        </p>
                    </div>
                </div>

                {isAdmin && (
                    <Button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="h-10 sm:h-12 px-6 sm:px-8 text-xs sm:text-sm rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all w-full sm:w-auto"
                    >
                        <UploadCloud className="w-4 h-4 shrink-0" />
                        <span>{t('learning_hub.upload_btn', 'Upload Lesson')}</span>
                    </Button>
                )}
            </div>

            {/* --- CONTENT --- */}
            {isLoading && !isLearningUploadActive ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-card rounded-3xl sm:rounded-[2.5rem] border border-border/50 h-64 sm:h-75" />
                    ))}
                </div>
            ) : videos.length === 0 && !isLearningUploadActive ? (
                <div className="bg-card border-2 border-dashed border-border/60 rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 lg:p-20 mt-8 text-center flex flex-col items-center relative overflow-hidden group hover:border-primary/30 hover:bg-muted/10 transition-all duration-500">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                        <div className="relative w-full h-full bg-muted/50 rounded-full flex items-center justify-center border border-border/50 shadow-inner z-10">
                            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
                        </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-3 tracking-tight uppercase italic">{t('learning_hub.empty_state_title', 'No Lessons Found')}</h2>
                    <p className="text-muted-foreground font-medium max-w-md text-xs sm:text-sm md:text-base leading-relaxed">
                        {t('learning_hub.empty_state_desc', 'No training materials are available at this time.')} {isAdmin && t('learning_hub.empty_state_admin_hint', 'Upload one to get started.')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">

                    {/* --- THE GHOST CARD --- */}
                    {isLearningUploadActive && jobQueue && (
                        <div className="group bg-card border-2 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.15)] rounded-4xl sm:rounded-[2.5rem] overflow-hidden flex flex-col relative transition-all duration-300">
                            <div className="relative aspect-video bg-black overflow-hidden shrink-0">
                                <div className="absolute top-3 right-3 z-20">
                                    <button onClick={handleCancelUpload} className="p-2 bg-black/40 hover:bg-destructive/90 active:bg-destructive backdrop-blur-md text-white rounded-xl transition-all duration-200 shadow-lg border border-white/20 active:scale-95" title={t('learning_hub.ghost_card.cancel_upload', 'Cancel')}>
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
                                <div className="absolute bottom-0 left-0 w-full h-1 sm:h-1.5 bg-black/50">
                                    <div className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter">{uploadProgress}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col p-4 sm:p-6 border-t border-border opacity-70 animate-pulse bg-muted/10 flex-1">
                                <h3 className="font-black text-foreground text-sm sm:text-base truncate mb-1">{jobQueue.metadata.title}</h3>
                                <div className="mt-auto pt-4 border-t border-border/50">
                                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 bg-primary/10 w-fit px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-primary/20">
                                        <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                                        {uploadProgress === 100 ? t('learning_hub.ghost_card.finalizing', 'Finalizing...') : t('learning_hub.ghost_card.uploading', 'Uploading...')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- THE ACTUAL RENDERED VIDEOS --- */}
                    {videos.map((video) => {
                        const isExpanded = expandedCards[video._id];

                        return (
                            <div key={video._id} className={`bg-card border rounded-4xl sm:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group/card ${isExpanded ? 'border-primary/40 ring-2 sm:ring-4 ring-primary/5' : 'border-border/60 hover:border-primary/30'}`}>

                                <div className="relative w-full aspect-video bg-black shrink-0 overflow-hidden">
                                    <VideoPlayer src={video.fileUrl} thumbnailUrl={video.thumbnailUrl} />
                                </div>

                                <div className="p-4 sm:p-5 md:p-6 flex flex-col flex-1 relative z-10">
                                    
                                    <div 
                                        className="flex flex-col cursor-pointer mb-1 sm:mb-2"
                                        onClick={() => toggleExpand(video._id)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-foreground text-base sm:text-lg leading-snug line-clamp-2 group-hover/card:text-primary transition-colors">{video.title}</h3>
                                                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1.5 sm:mt-2">
                                                    <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-70" />
                                                    {formatDate(video.updatedAt || video.createdAt)}
                                                </div>
                                            </div>
                                            <button className={`p-1.5 sm:p-2 bg-muted/50 text-muted-foreground rounded-full hover:bg-muted hover:text-foreground transition-all duration-300 shrink-0 ${isExpanded ? 'rotate-180 bg-primary/10 text-primary shadow-sm' : ''}`}>
                                                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ACCORDION BODY */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden flex flex-col">
                                            <div className="pt-3 sm:pt-4 mt-2 border-t border-border/50 flex flex-col h-full">

                                                {video.description && (
                                                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-4 sm:mb-5 leading-relaxed bg-muted/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/40 shadow-inner line-clamp-4">
                                                        {video.description}
                                                    </p>
                                                )}

                                                <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
                                                    
                                                    {/* Instructor Info */}
                                                    <div className="flex flex-col min-w-30 sm:min-w-40 flex-1">
                                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                                            <span className="text-[8px] sm:text-[9px] text-muted-foreground font-black uppercase tracking-wider shrink-0">{t('learning_hub.video_card.instructor_label', 'By')}</span>
                                                            <span className={`px-1.5 sm:px-2 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded-md border shadow-sm shrink-0 ${video.uploaderRole === 'SuperAdmin'
                                                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                                            }`}>
                                                                {video.uploaderRole}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-extrabold text-foreground mt-0.5 sm:mt-1 truncate w-full" title={video.uploaderName}>
                                                            {video.uploaderName}
                                                        </span>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 ml-auto">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(video); }}
                                                            className="p-2 sm:p-2.5 bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg sm:rounded-xl transition-colors border border-transparent hover:border-primary/20 shadow-sm"
                                                            title={t('learning_hub.video_card.download_tooltip', 'Download')}
                                                        >
                                                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </button>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(video); }}
                                                            className="p-2 sm:p-2.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg sm:rounded-xl transition-colors border border-[#25D366]/20 shadow-sm"
                                                            title={t('learning_hub.video_card.share_tooltip', 'Share')}
                                                        >
                                                            <WhatsAppIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </button>

                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openEditModal(video); }}
                                                                    className="p-2 sm:p-2.5 bg-muted/50 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 rounded-lg sm:rounded-xl transition-colors border border-transparent hover:border-blue-500/20 shadow-sm"
                                                                    title={t('learning_hub.video_card.edit_tooltip', 'Edit')}
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); triggerDelete(video._id); }}
                                                                    className="p-2 sm:p-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg sm:rounded-xl transition-colors border border-destructive/20 shadow-sm"
                                                                    title={t('learning_hub.video_card.delete_tooltip', 'Delete')}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <LearningMediaUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
            />

            {/* --- EDIT DIALOG (BOTTOM SHEET) --- */}
            {editModalOpen && (
                <div className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isModalClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleCloseEditModal}>
                    <div 
                        className={`bg-card w-full max-w-md rounded-t-4xl md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative max-h-[90vh] md:max-h-[85vh] overflow-hidden ${isModalClosing ? 'transition-transform duration-300 ease-out' : 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95'}`} 
                        style={{ transform: `translateY(${modalDragOffset}px)` }} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit]" />
                        
                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEndEdit}>
                            <div className="w-10 sm:w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                        </div>

                        <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 px-5 sm:px-6 pt-2 pb-3 sm:pb-4 md:pt-6 md:pb-6 flex justify-between items-center border-b border-border/50 touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEndEdit}>
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                    <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">{t('learning_hub.edit_dialog.title', 'Edit Lesson')}</h3>
                                </div>
                            </div>
                            <button onClick={handleCloseEditModal} className="p-2 sm:p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border hidden md:flex transition-colors">
                                <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-5 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-5 sm:space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1 flex items-center gap-1.5 sm:gap-2">
                                        {t('learning_hub.edit_dialog.lesson_title', 'Lesson Title')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="h-10 sm:h-12 rounded-lg sm:rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-xs sm:text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                        {t('learning_hub.edit_dialog.description', 'Description')}
                                    </Label>
                                    <Textarea
                                        rows={4}
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-xs sm:text-sm font-medium resize-none shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 bg-muted/10 border-t border-border/50 shrink-0 pb-safe flex gap-2 sm:gap-3 rounded-b-2xl sm:rounded-b-3xl">
                                <Button type="button" variant="ghost" onClick={handleCloseEditModal} className="flex-1 h-10 sm:h-12 text-xs sm:text-sm font-bold text-muted-foreground hover:bg-muted transition-colors rounded-lg sm:rounded-xl">
                                    {t('learning_hub.edit_dialog.cancel_btn', 'Cancel')}
                                </Button>
                                <Button type="submit" disabled={!editTitle.trim()} className="flex-1 h-10 sm:h-12 text-xs sm:text-sm font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all rounded-lg sm:rounded-xl">
                                    {t('learning_hub.edit_dialog.save_btn', 'Save')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DELETE DIALOG (BOTTOM SHEET) --- */}
            {deleteDialog.isOpen && (
                <div className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isModalClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleCloseDeleteModal}>
                    <div 
                        className={`bg-card w-full max-w-sm rounded-t-4xl md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative overflow-hidden ${isModalClosing ? 'transition-transform duration-300 ease-out' : 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95'}`} 
                        style={{ transform: `translateY(${modalDragOffset}px)` }} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40 z-20 rounded-t-[inherit] pointer-events-none" />

                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEndDelete}>
                            <div className="w-10 sm:w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                        </div>

                        <div className="p-5 sm:p-6 md:p-8 text-center pt-5 sm:pt-6 md:pt-10">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-4 sm:mb-6 shadow-inner border border-destructive/20 relative">
                                <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-40" />
                                <Trash2 className="w-8 h-8 sm:w-10 sm:h-10 relative z-10" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mb-1.5 sm:mb-2 tracking-tight">{t('learning_hub.delete_dialog.title', 'Delete Lesson?')}</h3>
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed px-2">
                                {t('learning_hub.delete_dialog.warning_text', 'This action cannot be undone.')}
                            </p>
                        </div>

                        <div className="bg-muted/10 p-4 sm:p-5 border-t border-border/50 flex flex-col gap-2.5 sm:gap-3 rounded-b-2xl sm:rounded-b-3xl pb-safe">
                            <Button 
                                variant="destructive" 
                                className="w-full h-10 sm:h-12 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg shadow-destructive/20 hover:shadow-destructive/30 active:scale-[0.98] transition-all"
                                onClick={confirmDelete}
                            >
                                {t('learning_hub.delete_dialog.confirm_btn', 'Yes, Delete')}
                            </Button>
                            <button 
                                onClick={handleCloseDeleteModal} 
                                className="w-full h-10 sm:h-12 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg sm:rounded-xl transition-colors border border-transparent hover:border-border/80"
                            >
                                {t('learning_hub.delete_dialog.cancel_btn', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LearningHub;