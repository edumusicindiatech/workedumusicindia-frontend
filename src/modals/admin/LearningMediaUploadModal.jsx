import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { startBackgroundUpload } from "../../store/slices/uploadSlice";
import { X, UploadCloud, CheckCircle2, Video, FileText, Type, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// --- Browser-side HD Thumbnail Generator ---
const generateHDThumbnail = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.onloadeddata = () => {
            video.currentTime = Math.min(1, video.duration || 0.1);
        };
        video.onseeked = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
            URL.revokeObjectURL(url);
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
    });
};

const LearningMediaUploadModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    // Form States
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setTitle("");
            setDescription("");
            setFiles([]);
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (isProcessing) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) setDragOffset(delta);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    // --- FILE HANDLERS ---
    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (!selectedFiles.length) return;

        setIsProcessing(true);
        const MAX_COMBINED_SIZE = 500 * 1024 * 1024; // 500 MB
        let runningTotalSize = files.reduce((total, f) => total + f.file.size, 0);

        const validItems = [];
        const toastId = toast.loading("Generating HD Previews...");

        for (const f of selectedFiles) {
            if (runningTotalSize + f.size > MAX_COMBINED_SIZE) {
                toast.error(`"${f.name}" exceeds 500MB limit.`, { id: toastId });
            } else {
                const thumbBase64 = await generateHDThumbnail(f);
                validItems.push({ file: f, thumbnail: thumbBase64 });
                runningTotalSize += f.size;
            }
        }

        toast.dismiss(toastId);
        if (validItems.length > 0) setFiles((prev) => [...prev, ...validItems]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsProcessing(false);
    };

    const removeFile = (indexToRemove) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error(t('learning_hub.toasts.title_required'));
        if (files.length === 0) return toast.error(t('learning_hub.toasts.file_required'));

        const rawFiles = files.map(item => item.file);
        const base64Thumbnails = files.map(item => item.thumbnail);

        dispatch(startBackgroundUpload({
            uploadType: 'learning-hub',
            files: rawFiles,
            metadata: {
                title,
                description,
                thumbnails: JSON.stringify(base64Thumbnails)
            }
        }));

        handleClose();
    };

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleClose}>
            <div
                className={`bg-card w-full max-w-lg rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[95vh] md:max-h-[90vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top Border Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
                    </div>

                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <UploadCloud className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground line-clamp-1 tracking-tight">
                                    {t('learning_hub.upload_modal.title', 'Upload Lesson')}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5 font-medium line-clamp-1">
                                    {t('learning_hub.upload_modal.subtitle', 'Share new learning media')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <form id="learning-upload-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-card">

                    {/* Lesson Title */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
                            <Type className="w-3.5 h-3.5 text-primary/70" /> {t('learning_hub.upload_modal.lesson_title', 'Lesson Title')} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder={t('learning_hub.upload_modal.title_placeholder', 'e.g. Basic Violin Posture')}
                            className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-primary/70" /> {t('learning_hub.upload_modal.description', 'Description')}
                        </Label>
                        <Textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder={t('learning_hub.upload_modal.desc_placeholder', 'Briefly explain what students will learn...')}
                            className="rounded-2xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 resize-none p-4"
                        />
                    </div>

                    {/* Video Selection */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
                            <Video className="w-3.5 h-3.5 text-primary/70" /> {t('learning_hub.upload_modal.video_file', 'Video Content')} <span className="text-destructive">*</span>
                        </Label>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="video/*"
                            multiple
                            className="hidden"
                        />

                        {files.length === 0 ? (
                            <div
                                onClick={() => !isProcessing && fileInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-primary/20 bg-primary/5 rounded-4xl hover:bg-primary/10 hover:border-primary/40 cursor-pointer transition-all duration-300 group"
                            >
                                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                    <UploadCloud className="w-8 h-8 text-primary" />
                                </div>
                                <p className="text-sm font-extrabold text-foreground text-center">{t('learning_hub.upload_modal.click_to_select', 'Tap to select videos')}</p>
                                <p className="text-[11px] font-bold text-muted-foreground mt-1.5 text-center uppercase tracking-tighter opacity-60">Max 500MB combined</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {files.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3.5 bg-muted/20 border border-border/60 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-black shadow-sm">
                                                <img src={item.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <Video className="w-4 h-4 text-white/80" />
                                                </div>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-extrabold text-foreground truncate max-w-45 sm:max-w-60">{item.file.name}</p>
                                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(index)}
                                            onTouchStart={(e) => e.stopPropagation()}
                                            className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0"
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    className="w-full h-12 rounded-xl border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 hover:border-primary/50"
                                >
                                    + Add another video
                                </Button>
                            </div>
                        )}
                    </div>
                </form>

                {/* FOOTER */}
                <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col items-center gap-3 shrink-0 pb-safe">
                    <Button
                        type="submit"
                        form="learning-upload-form"
                        disabled={files.length === 0 || !title.trim() || isProcessing}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5" />
                        )}
                        {t('learning_hub.upload_modal.start_upload_btn', 'Start Upload')}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="md:hidden text-muted-foreground font-bold"
                    >
                        {t('learning_hub.upload_modal.cancel', 'Cancel')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LearningMediaUploadModal;