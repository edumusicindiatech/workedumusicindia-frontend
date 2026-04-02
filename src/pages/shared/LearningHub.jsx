import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { BookOpen, UploadCloud, GraduationCap, X, Loader2, Trash2, Download, Edit2, CalendarDays } from "lucide-react";
import api from "../../api/axios";
import axios from "axios";
import toast from "react-hot-toast";

import LearningMediaUploadModal from "../../modals/admin/LearningMediaUploadModal";

const WhatsAppIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.484-1.459-1.657-1.756-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
);

const LearningHub = () => {
    const { user } = useSelector((state) => state.auth);
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, videoId: null });

    // --- EDIT STATE ---
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");

    // --- BACKGROUND UPLOAD STATE ---
    const [uploadJob, setUploadJob] = useState(null);
    const abortControllerRef = useRef(null);

    const fetchVideos = async () => {
        try {
            const response = await api.get('/learning');
            if (response.data.success) {
                setVideos(response.data.data);
            }
        } catch (error) {
            toast.error("Failed to load training videos");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    // --- FORMAT DATE HELPER ---
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    };

    // --- UPLOAD LOGIC ---
    const handleStartUpload = async ({ title, description, file }) => {
        setIsUploadModalOpen(false);

        const previewUrl = URL.createObjectURL(file);
        setUploadJob({ file, title, description, progress: 0, previewUrl });
        abortControllerRef.current = new AbortController();

        try {
            const presignRes = await api.post('/learning/presign', {
                fileName: file.name,
                fileType: file.type
            });

            if (!presignRes.data.success) throw new Error("Failed to get upload link");
            const { signedUrl, publicUrl } = presignRes.data;

            await axios.put(signedUrl, file, {
                headers: { 'Content-Type': file.type },
                signal: abortControllerRef.current.signal,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadJob(prev => prev ? { ...prev, progress: percentCompleted } : null);
                }
            });

            const saveRes = await api.post('/learning', {
                title,
                description,
                fileUrl: publicUrl
            });

            if (saveRes.data.success) {
                toast.success("Lesson uploaded successfully!");
                fetchVideos();
            }

        } catch (error) {
            if (axios.isCancel(error)) toast.error("Upload cancelled.");
            else toast.error("Upload failed. Please check your connection.");
        } finally {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setUploadJob(null);
            abortControllerRef.current = null;
        }
    };

    const cancelUpload = (e) => {
        e.stopPropagation();
        if (abortControllerRef.current) abortControllerRef.current.abort();
    };

    // --- HANDLE DELETE ---
    const triggerDelete = (videoId) => {
        setDeleteDialog({ isOpen: true, videoId });
    };

    const confirmDelete = async () => {
        if (!deleteDialog.videoId) return;

        const toastId = toast.loading("Deleting video...");
        try {
            const response = await api.delete(`/learning/${deleteDialog.videoId}`);
            if (response.data.success) {
                toast.success("Video deleted successfully", { id: toastId });
                setVideos(prev => prev.filter(v => v._id !== deleteDialog.videoId));
            }
        } catch (error) {
            toast.error("Failed to delete video", { id: toastId });
        } finally {
            setDeleteDialog({ isOpen: false, videoId: null });
        }
    };

    // --- HANDLE EDIT ---
    const openEditModal = (video) => {
        setEditingVideo(video);
        setEditTitle(video.title);
        setEditDescription(video.description || "");
        setEditModalOpen(true);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!editTitle.trim()) return toast.error("Title is required");

        const toastId = toast.loading("Updating lesson...");
        try {
            const res = await api.put(`/learning/${editingVideo._id}`, {
                title: editTitle,
                description: editDescription
            });

            if (res.data.success) {
                toast.success("Updated successfully!", { id: toastId });
                // Update UI instantly
                setVideos(prev => prev.map(v => v._id === editingVideo._id ? res.data.data : v));
                setEditModalOpen(false);
            }
        } catch (error) {
            toast.error("Failed to update lesson", { id: toastId });
        }
    };

    // --- HANDLE DOWNLOAD ---
    const handleDownload = async (video) => {
        const toastId = toast.loading("Preparing download...");
        try {
            // Make a safe filename based on the title
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
                toast.success("Download started!", { id: toastId });
            } else {
                throw new Error("Failed to get download link");
            }
        } catch (error) {
            toast.error("Failed to download video.", { id: toastId });
        }
    };

    // --- HANDLE WHATSAPP SHARE ---
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
                onStartUpload={handleStartUpload}
            />

            {/* --- CUSTOM EDIT DIALOG --- */}
            {editModalOpen && (
                <div className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-foreground">Edit Lesson Details</h3>
                            <button onClick={() => setEditModalOpen(false)} className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">Title <span className="text-destructive">*</span></label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full h-11 px-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">Description</label>
                                <textarea
                                    rows="3"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full p-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6">
                                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={!editTitle.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- CUSTOM DELETE DIALOG --- */}
            {deleteDialog.isOpen && (
                <div className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20">
                                <Trash2 className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Delete Video</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Are you sure you want to delete this training video? This action cannot be undone and will remove the video for all employees.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-border">
                            <button onClick={() => setDeleteDialog({ isOpen: false, videoId: null })} className="px-5 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl text-sm font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors shadow-md">
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-primary flex items-center gap-3">
                        <BookOpen className="w-8 h-8" />
                        Training Vault
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Learn from global instruction videos uploaded by administrators.
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shrink-0"
                    >
                        <UploadCloud className="w-5 h-5" />
                        Upload Lesson
                    </button>
                )}
            </div>

            {isLoading && !uploadJob ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden aspect-video animate-pulse" />
                    ))}
                </div>
            ) : videos.length === 0 && !uploadJob ? (
                <div className="flex flex-col items-center justify-center text-center p-16 bg-card border border-border rounded-3xl shadow-sm animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-black text-foreground mb-1">Vault is Empty</h3>
                    <p className="text-muted-foreground font-medium max-w-sm">There are no training videos available at the moment. {isAdmin && "Click 'Upload Lesson' to add the first one!"}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">

                    {/* --- THE GHOST CARD --- */}
                    {uploadJob && (
                        <div className="group bg-background dark:bg-[#0d1117] border border-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-3xl overflow-hidden flex flex-col relative transition-all duration-300">

                            <div className="relative w-full aspect-video bg-black overflow-hidden shrink-0">

                                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
                                    <button onClick={cancelUpload} className="p-2 bg-black/40 hover:bg-destructive/90 active:bg-destructive backdrop-blur-md text-white rounded-full transition-all duration-200 shadow-lg border border-white/20 active:scale-90" title="Cancel Upload">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {uploadJob.previewUrl && (
                                    <video
                                        src={uploadJob.previewUrl}
                                        className="absolute top-0 left-0 w-full h-full object-contain transition-all duration-300"
                                        style={{
                                            filter: `blur(${Math.max(0, 8 - (uploadJob.progress * 0.08))}px) grayscale(${Math.max(0, 100 - uploadJob.progress)}%) brightness(${0.5 + (uploadJob.progress * 0.005)})`
                                        }}
                                        autoPlay loop muted playsInline
                                    />
                                )}

                                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50 z-10">
                                    <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out" style={{ width: `${uploadJob.progress}%` }} />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <span className="text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter">{uploadJob.progress}%</span>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col flex-1 opacity-60 animate-pulse">
                                <h3 className="font-extrabold text-foreground text-lg line-clamp-1">{uploadJob.title}</h3>

                                <div className="mt-auto pt-4 border-t border-border">
                                    <p className="text-[12px] font-semibold text-primary truncate flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        {uploadJob.progress === 100 ? 'Finalizing...' : 'Uploading to Cloud...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- THE ACTUAL RENDERED VIDEOS --- */}
                    {videos.map((video) => (
                        <div key={video._id} className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">

                            <div className="relative w-full aspect-video bg-black shrink-0 overflow-hidden">
                                <video
                                    src={`${video.fileUrl}#t=0.001`}
                                    controls
                                    controlsList="nodownload"
                                    preload="metadata"
                                    className="absolute top-0 left-0 w-full h-full object-contain"
                                />
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="font-extrabold text-foreground text-lg line-clamp-1">{video.title}</h3>

                                {/* Modification Date added right below the title */}
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
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Instructor</span>
                                            {/* Role Badge moved next to Instructor Name */}
                                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border shadow-sm ${video.uploaderRole === 'SuperAdmin'
                                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                                }`}>
                                                {video.uploaderRole}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-foreground mt-0.5">{video.uploaderName}</span>
                                    </div>

                                    {/* --- ACTION BUTTONS --- */}
                                    <div className="flex items-center gap-1.5">

                                        {/* Download Button (Everyone) */}
                                        <button
                                            onClick={() => handleDownload(video)}
                                            className="p-2.5 bg-muted text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                                            title="Download Video"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>

                                        {/* WhatsApp Share Button (Everyone) */}
                                        <button
                                            onClick={() => handleWhatsAppShare(video)}
                                            className="p-2.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl transition-colors"
                                            title="Share on WhatsApp"
                                        >
                                            <WhatsAppIcon className="w-4 h-4" />
                                        </button>

                                        {/* Admin Action Buttons */}
                                        {isAdmin && (
                                            <>
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => openEditModal(video)}
                                                    className="p-2.5 bg-muted text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 rounded-xl transition-colors"
                                                    title="Edit Video Details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => triggerDelete(video._id)}
                                                    className="p-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl transition-colors"
                                                    title="Delete Video"
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