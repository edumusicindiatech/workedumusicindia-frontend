import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { BookOpen, UploadCloud, GraduationCap, X, Loader2, Trash2, Download, Edit2, CalendarDays } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useTranslation } from "react-i18next";

import LearningMediaUploadModal from "../../modals/admin/LearningMediaUploadModal";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { withCredentials: true });

const WhatsAppIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.484-1.459-1.657-1.756-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
);

// Helper component to explicitly force the browser to render the first frame 
// immediately, ensuring a thumbnail is visible across all devices (including iOS).
const VideoPlayer = ({ src }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            // Force seeking to 0.001 to trigger thumbnail generation on mobile Safari/Chrome
            videoRef.current.currentTime = 0.001;
        }
    }, [src]);

    return (
        <video
            ref={videoRef}
            src={`${src}#t=0.001`}
            controls
            controlsList="nodownload"
            preload="metadata"
            playsInline
            className="absolute top-0 left-0 w-full h-full object-contain bg-black"
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
    const [editingVideo, setEditingVideo] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");

    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(null);

    const isLearningUploadActive = isUploading && jobQueue?.uploadType === 'learning-hub';

    const fetchVideos = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/learning');
            if (response.data.success) {
                setVideos(response.data.data);
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.load_failed'));
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
        const handleError = (e) => toast.error(e.detail || t('learning_hub.toasts.upload_failed'));

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
        toast.error(t('learning_hub.toasts.upload_cancelled'));
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

        const toastId = toast.loading(t('learning_hub.toasts.deleting'));
        try {
            const response = await api.delete(`/learning/${deleteDialog.videoId}`);
            if (response.data.success) {
                toast.success(t('learning_hub.toasts.delete_success'), { id: toastId });
                setVideos(prev => prev.filter(v => v._id !== deleteDialog.videoId));
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.delete_failed'), { id: toastId });
        } finally {
            setDeleteDialog({ isOpen: false, videoId: null });
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
        if (!editTitle.trim()) return toast.error(t('learning_hub.toasts.title_required'));

        const toastId = toast.loading(t('learning_hub.toasts.updating'));
        try {
            const res = await api.put(`/learning/${editingVideo._id}`, {
                title: editTitle,
                description: editDescription
            });

            if (res.data.success) {
                toast.success(t('learning_hub.toasts.update_success'), { id: toastId });
                setVideos(prev => prev.map(v => v._id === editingVideo._id ? res.data.data : v));
                setEditModalOpen(false);
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.update_failed'), { id: toastId });
        }
    };

    const handleDownload = async (video) => {
        const toastId = toast.loading(t('learning_hub.toasts.preparing_download'));
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
                toast.success(t('learning_hub.toasts.download_started'), { id: toastId });
            } else {
                throw new Error("Failed to get download link");
            }
        } catch (error) {
            toast.error(t('learning_hub.toasts.download_failed'), { id: toastId });
        }
    };

    const handleWhatsAppShare = (video) => {
        const text = `Check out this training video from EduMusic India!\n\n*${video.title}*\n${video.fileUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 mt-4 pb-24">

            <LearningMediaUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
            />

            {/* --- EDIT DIALOG --- */}
            {editModalOpen && (
                <div className="fixed inset-0 z-120 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h3 className="text-xl font-black text-foreground">{t('learning_hub.edit_dialog.title')}</h3>
                            <button onClick={() => setEditModalOpen(false)} className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="space-y-4 overflow-y-auto custom-scrollbar grow pb-safe">
                            <div className="space-y-2">
                                <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">{t('learning_hub.edit_dialog.lesson_title')} <span className="text-destructive">*</span></label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full h-11 px-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">{t('learning_hub.edit_dialog.description')}</label>
                                <textarea
                                    rows="3"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full p-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6 shrink-0">
                                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors">
                                    {t('learning_hub.edit_dialog.cancel_btn')}
                                </button>
                                <button type="submit" disabled={!editTitle.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50">
                                    {t('learning_hub.edit_dialog.save_btn')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DELETE DIALOG --- */}
            {deleteDialog.isOpen && (
                <div className="fixed inset-0 z-120 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 pb-safe sm:pb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20">
                                <Trash2 className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">{t('learning_hub.delete_dialog.title')}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {t('learning_hub.delete_dialog.warning_text')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-border">
                            <button onClick={() => setDeleteDialog({ isOpen: false, videoId: null })} className="px-5 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors">
                                {t('learning_hub.delete_dialog.cancel_btn')}
                            </button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl text-sm font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors shadow-md">
                                {t('learning_hub.delete_dialog.confirm_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-primary flex items-center gap-3">
                        <BookOpen className="w-8 h-8" />
                        {t('learning_hub.page_title')}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        {t('learning_hub.page_subtitle')}
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shrink-0 w-full sm:w-auto justify-center"
                    >
                        <UploadCloud className="w-5 h-5" />
                        {t('learning_hub.upload_btn')}
                    </button>
                )}
            </div>

            {isLoading && !isLearningUploadActive ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden aspect-video animate-pulse" />
                    ))}
                </div>
            ) : videos.length === 0 && !isLearningUploadActive ? (
                <div className="flex flex-col items-center justify-center text-center p-10 sm:p-16 bg-card border border-border rounded-3xl shadow-sm animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-black text-foreground mb-1">{t('learning_hub.empty_state_title')}</h3>
                    <p className="text-muted-foreground font-medium max-w-sm">
                        {t('learning_hub.empty_state_desc')} {isAdmin && t('learning_hub.empty_state_admin_hint')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">

                    {/* --- THE GHOST CARD --- */}
                    {isLearningUploadActive && jobQueue && (
                        <div className="group bg-background dark:bg-[#0d1117] border border-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-3xl overflow-hidden flex flex-col relative transition-all duration-300">
                            <div className="relative w-full aspect-video bg-black overflow-hidden shrink-0">
                                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
                                    <button onClick={handleCancelUpload} className="p-2 bg-black/40 hover:bg-destructive/90 active:bg-destructive backdrop-blur-md text-white rounded-full transition-all duration-200 shadow-lg border border-white/20 active:scale-90" title={t('learning_hub.ghost_card.cancel_upload')}>
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {previewUrl && (
                                    <video
                                        src={previewUrl}
                                        className="absolute top-0 left-0 w-full h-full object-contain transition-all duration-300"
                                        style={{
                                            filter: `blur(${Math.max(0, 8 - (uploadProgress * 0.08))}px) grayscale(${Math.max(0, 100 - uploadProgress)}%) brightness(${0.5 + (uploadProgress * 0.005)})`
                                        }}
                                        autoPlay loop muted playsInline
                                    />
                                )}

                                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50 z-10">
                                    <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <span className="text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter">{uploadProgress}%</span>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col flex-1 opacity-60 animate-pulse">
                                <h3 className="font-extrabold text-foreground text-lg line-clamp-1">{jobQueue.metadata.title}</h3>

                                <div className="mt-auto pt-4 border-t border-border">
                                    <p className="text-[12px] font-semibold text-primary truncate flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        {uploadProgress === 100 ? t('learning_hub.ghost_card.finalizing') : t('learning_hub.ghost_card.uploading')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- THE ACTUAL RENDERED VIDEOS --- */}
                    {videos.map((video) => (
                        <div key={video._id} className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">

                            <div className="relative w-full aspect-video bg-black shrink-0 overflow-hidden">
                                {/* Utilizing the explicit VideoPlayer component to guarantee thumbnail loads immediately */}
                                <VideoPlayer src={video.fileUrl} />
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="font-extrabold text-foreground text-lg line-clamp-1">{video.title}</h3>

                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 mb-2 font-medium">
                                    <CalendarDays className="w-3.5 h-3.5 opacity-70" />
                                    {formatDate(video.updatedAt || video.createdAt)}
                                </div>

                                {video.description && (
                                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{video.description}</p>
                                )}

                                <div className="mt-auto pt-5 border-t border-border flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t('learning_hub.video_card.instructor_label')}</span>
                                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border shadow-sm ${video.uploaderRole === 'SuperAdmin'
                                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                                }`}>
                                                {video.uploaderRole}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-foreground mt-0.5">{video.uploaderName}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleDownload(video)}
                                            className="p-2.5 bg-muted text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                                            title={t('learning_hub.video_card.download_tooltip')}
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleWhatsAppShare(video)}
                                            className="p-2.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl transition-colors"
                                            title={t('learning_hub.video_card.share_tooltip')}
                                        >
                                            <WhatsAppIcon className="w-4 h-4" />
                                        </button>

                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(video)}
                                                    className="p-2.5 bg-muted text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 rounded-xl transition-colors"
                                                    title={t('learning_hub.video_card.edit_tooltip')}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => triggerDelete(video._id)}
                                                    className="p-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl transition-colors"
                                                    title={t('learning_hub.video_card.delete_tooltip')}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LearningHub;