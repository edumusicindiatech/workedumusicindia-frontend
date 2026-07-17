import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    UploadCloud, X, Film, Info, MapPin,
    CalendarDays, ChevronRight, Users, CheckCircle2,
    Loader2, Video,
    ChevronUp,
    ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import { startBackgroundUpload } from "../../store/slices/uploadSlice";
import CustomSelect from "../../components/ui/CustomSelect";
import { useTranslation } from "react-i18next";
import api from "../../api/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Generates a lightweight Base64 image in the browser (Zero backend CPU needed!)
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
            // 640x360 keeps the payload tiny while looking perfectly crisp on cards
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Compress to JPEG at 70% quality (Results in ~30kb payload)
            resolve(canvas.toDataURL("image/jpeg", 0.7));
            URL.revokeObjectURL(url);
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
    });
};

const EmployeeMediaUploadModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { user, isHydrating } = useSelector((state) => state.auth);
    const { isUploading } = useSelector((state) => state.upload);
    const dispatch = useDispatch();

    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [band, setBand] = useState("");
    const [bandStage, setBandStage] = useState(""); // <-- ADDED: Band Stage state
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [studentsCount, setStudentsCount] = useState("");
    const [files, setFiles] = useState([]); // Stores array of { file, thumbnail }
    const [description, setDescription] = useState("");
    const [liveSchools, setLiveSchools] = useState([]);
    const [isFetchingSchools, setIsFetchingSchools] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const fileInputRef = useRef(null);

    // High-Performance Animation Refs (Replaces State)
    const modalRef = useRef(null);
    const dragStartY = useRef(0);
    const currentDragY = useRef(0);

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape' && !isUploading) handleCloseModal(); };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, isUploading]);

    useEffect(() => {
        if (!isOpen && !isUploading) {
            setFiles([]);
            setEventName("");
            setEventDate("");
            setStudentsCount("");
            setBand("");
            setBandStage(""); // <-- ADDED: Reset state
            setSelectedSchoolId("");
            setDescription("");
            setIsClosing(false);
        }

        if (isOpen) {
            // Reset position when opened
            if (modalRef.current) {
                modalRef.current.style.transform = 'translateY(0px)';
                modalRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            }
        }
    }, [isOpen, isUploading]);

    useEffect(() => {
        const fetchFreshSchools = async () => {
            if (!isOpen) return;

            setIsFetchingSchools(true);
            try {
                const response = await api.get('/employee/me/profile');
                setLiveSchools(response.data.user.assignments || []);
            } catch (error) {
                console.error("Failed to fetch fresh schools:", error);
                toast.error("Could not load your latest school assignments.");
            } finally {
                setIsFetchingSchools(false);
            }
        };

        fetchFreshSchools();
    }, [isOpen]);

    // --- NATIVE 60FPS DRAG HANDLERS ---
    const handleTouchStart = (e) => {
        // Prevent dragging if the user is interacting with buttons inside the header
        if (e.target.closest('button')) return;

        dragStartY.current = e.touches[0].clientY;
        if (modalRef.current) {
            // Remove transition during drag for 1:1 finger tracking (Zero lag)
            modalRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e) => {
        if (dragStartY.current === 0) return;

        const delta = e.touches[0].clientY - dragStartY.current;

        // Only allow dragging downwards
        if (delta > 0) {
            currentDragY.current = delta;
            if (modalRef.current) {
                // Direct GPU manipulation bypassing React lifecycle
                modalRef.current.style.transform = `translateY(${delta}px)`;
            }
        }
    };

    const handleTouchEnd = () => {
        dragStartY.current = 0;

        if (modalRef.current) {
            // Re-enable smooth spring transition for the snap
            modalRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

            // If dragged down more than 120px, close it. Otherwise, snap back up.
            if (currentDragY.current > 120 && !isUploading) {
                handleCloseModal();
            } else {
                modalRef.current.style.transform = 'translateY(0px)';
            }
        }
        currentDragY.current = 0;
    };

    const handleCloseModal = () => {
        if (isUploading) return;
        setIsClosing(true);

        // Trigger exit animation natively
        if (modalRef.current) {
            modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            modalRef.current.style.transform = 'translateY(100%)';
        }

        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    // --- DATA HANDLERS ---
    const schoolOptions = liveSchools.map(item => item.school?.schoolName || "Unnamed School") || [];

    const currentSelectedName = liveSchools.find(
        item => (item.school?._id || item.school) === selectedSchoolId
    )?.school?.schoolName || "";

    const handleSchoolSelect = (selectedName) => {
        const matchedAssignment = liveSchools.find(
            item => (item.school?.schoolName || "Unnamed School") === selectedName
        );
        if (matchedAssignment) {
            setSelectedSchoolId(matchedAssignment.school?._id || matchedAssignment.school);
        }
    };

    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (!selectedFiles.length) return;

        const MAX_COMBINED_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
        let runningTotalSize = files.reduce((total, f) => total + f.file.size, 0);

        const validItems = [];
        const toastId = toast.loading("Processing videos...");

        for (const f of selectedFiles) {
            if (runningTotalSize + f.size > MAX_COMBINED_SIZE) {
                toast.error(`Cannot add "${f.name}". Max combined limit is 2 GB.`);
            } else {
                const thumbBase64 = await generateHDThumbnail(f);
                validItems.push({ file: f, thumbnail: thumbBase64 });
                runningTotalSize += f.size;
            }
        }

        toast.dismiss(toastId);

        const availableSlots = 5 - files.length;
        if (validItems.length > availableSlots) {
            toast.error(t('upload_modal.limit_reached_toast', { slots: availableSlots }));
            setFiles((prev) => [...prev, ...validItems.slice(0, availableSlots)]);
        } else if (validItems.length > 0) {
            setFiles((prev) => [...prev, ...validItems]);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (indexToRemove) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedSchoolId) return toast.error(t('upload_modal.select_school_toast', 'Please select a school.'));
        if (!band) return toast.error(t('upload_modal.band_category_toast', 'Please select a band category.'));
        if (!bandStage) return toast.error(t('upload_modal.band_stage_toast', 'Please specify the Band Stage.')); // <-- ADDED: Validation
        if (!studentsCount) return toast.error(t('upload_modal.students_count_toast', 'Please enter the number of students.'));
        if (files.length === 0) return toast.error(t('upload_modal.add_video_toast', 'Please add at least one video.'));

        const rawFiles = files.map(item => item.file);
        const base64Thumbnails = files.map(item => item.thumbnail);

        dispatch(startBackgroundUpload({
            uploadType: 'vault',
            files: rawFiles,
            metadata: {
                schoolId: selectedSchoolId,
                schoolName: currentSelectedName,
                band,
                bandStage, // <-- ADDED: Payload integration
                eventName,
                eventDate,
                studentsCount,
                description,
                thumbnails: JSON.stringify(base64Thumbnails)
            }
        }));

        handleCloseModal();
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none pointer-events-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleCloseModal}>
            <div
                ref={modalRef}
                className={`bg-card w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[95vh] md:max-h-[90vh] relative overflow-hidden will-change-transform ${!isClosing ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95' : ''}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 pointer-events-none" />

                {/* --- HEADER (Drag Target Area) --- */}
                {/* Touch events placed ONLY here to prevent scrolling conflicts with the body content */}
                <div
                    className="sticky top-0 bg-card/95 backdrop-blur-md z-20 border-b border-border/50 touch-none cursor-grab active:cursor-grabbing shrink-0"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-full flex justify-center pt-4 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                    </div>

                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-4 pr-4 pointer-events-auto min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <UploadCloud className="w-6 h-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                                    {t('upload_modal.title', 'Upload Media')}
                                </h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 truncate">
                                    {t('upload_modal.subtitle', 'Share session videos to the Vault')}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleCloseModal} disabled={isUploading} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors pointer-events-auto">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* --- BODY --- */}
                {/* overflow-y-auto enables native scrolling without triggering the drag effect */}
                <form id="media-upload-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-card flex-1">

                    <div className="space-y-6">
                        {/* School Selection */}
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                {t('upload_modal.assigned_school', 'Assigned School')} <span className="text-destructive">*</span>
                            </Label>
                            {isHydrating || isFetchingSchools ? (
                                <div className="h-12 sm:h-13 flex items-center px-4 bg-muted/20 border border-border/60 rounded-2xl text-sm font-medium text-muted-foreground animate-pulse">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('upload_modal.loading_schools', 'Loading assignments...')}
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                        <MapPin className="w-4.5 h-4.5 text-primary/70" />
                                    </div>
                                    <div className="w-full [&>div]:h-12 sm:[&>div]:h-13 [&>div]:rounded-2xl [&>div]:bg-muted/20 [&>div]:border-border/60 [&>div]:pl-10">
                                        <CustomSelect value={currentSelectedName} onChange={handleSchoolSelect} options={schoolOptions} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Band/Category Selection */}
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                {t('upload_modal.band_category', 'Category')} <span className="text-destructive">*</span>
                            </Label>
                            <div className="flex bg-muted/20 border border-border/60 p-1.5 rounded-2xl">
                                {['Junior Band', 'Senior Band'].map((b) => {
                                    const isActive = band === b;
                                    return (
                                        <button
                                            key={b} type="button" onClick={() => setBand(b)}
                                            className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${isActive ? 'bg-primary text-primary-foreground shadow-md sm:scale-[0.98]' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                                        >
                                            {isActive && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                            <span className="truncate">{b === 'Junior Band' ? t('upload_modal.junior_band', 'Junior Band') : t('upload_modal.senior_band', 'Senior Band')}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Event Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center justify-between sm:justify-start sm:gap-1.5">
                                    {t('upload_modal.event_name', 'Event Name')} <span className="lowercase font-medium tracking-normal opacity-70">({t('upload_modal.optional')})</span>
                                </Label>
                                <Input
                                    type="text"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    placeholder={t('upload_modal.placeholder_event', 'e.g. Annual Function')}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                                    {t('upload_modal.event_date', 'Event Date')} {eventName && <span className="text-destructive">*</span>}
                                </Label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="date"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="h-12 pl-10 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-sm font-medium scheme-light dark:scheme-dark"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5 sm:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                    {t('upload_modal.students_present', 'Students Present')} <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative group sm:w-1/2">
                                    {/* Left Icon */}
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 pointer-events-none" />

                                    {/* Input Field */}
                                    <Input
                                        type="number"
                                        value={studentsCount}
                                        onChange={(e) => setStudentsCount(e.target.value)}
                                        placeholder="0"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="h-12 pl-10 pr-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />

                                    {/* Custom Increment/Decrement Buttons */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevents modal drag/click issues
                                                setStudentsCount(prev => prev ? String(Number(prev) + 1) : "1");
                                            }}
                                            className="p-1 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevents modal drag/click issues
                                                setStudentsCount(prev => (prev && Number(prev) > 0) ? String(Number(prev) - 1) : "0");
                                            }}
                                            className="p-1 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex justify-between">
                                <span>{t('upload_modal.instructor_note', 'Instructor Note')} <span className="lowercase font-medium tracking-normal opacity-70">({t('upload_modal.optional')})</span></span>
                            </Label>
                            <Textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('upload_modal.placeholder_desc', 'Add brief details about the session...')}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="w-full p-4 min-h-25 rounded-2xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-sm font-medium resize-none shadow-sm"
                            />
                        </div>

                        {/* --- ADDED: Band Stage --- */}
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                {t('upload_modal.band_stage', 'Band Stage')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="text"
                                value={bandStage}
                                onChange={(e) => setBandStage(e.target.value)}
                                placeholder={t('upload_modal.placeholder_band_stage', 'e.g. Stage 1, Level 2...')}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div className="border-t border-border/50 border-dashed pt-6 space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                <Video className="w-3.5 h-3.5 text-primary/70" /> {t('upload_modal.video_files', 'Video Files')} <span className="text-destructive">*</span>
                            </Label>
                            <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20 uppercase tracking-widest">
                                {files.length} / 5
                            </span>
                        </div>

                        <div
                            onClick={() => files.length < 5 && fileInputRef.current?.click()}
                            className={`w-full flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed rounded-4xl transition-all duration-300 group
                                ${files.length >= 5 ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed' : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 cursor-pointer'}`}
                        >
                            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                <UploadCloud className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-sm font-extrabold text-foreground mb-1">{t('upload_modal.click_to_browse', 'Tap to select videos')}</p>
                            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">{t('upload_modal.file_limits', 'Max 5 videos, 2 GB Total')}</p>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="video/*" className="hidden" disabled={files.length >= 5} />
                        </div>

                        {files.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                {files.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between bg-muted/20 p-3 rounded-2xl border border-border/60 animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center gap-3.5 overflow-hidden">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-black shadow-sm">
                                                <img src={item.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <Film className="w-4 h-4 text-white/80" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-xs font-extrabold text-foreground truncate max-w-37.5">{item.file.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                            className="w-9 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0 mr-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

                {/* --- FOOTER --- */}
                <div className="bg-muted/10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between border-t border-border/50 shrink-0 gap-4 rounded-b-[inherit] pb-safe">
                    <div className="hidden sm:flex items-center gap-2 text-muted-foreground bg-card px-3.5 py-2 rounded-xl border border-border/60 shadow-sm">
                        <Info className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{t('upload_modal.cloud_enabled', 'Cloud Storage Ready')}</span>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={handleCloseModal}
                            disabled={isUploading}
                            className="flex-1 sm:flex-none h-12 sm:hidden rounded-xl font-bold text-muted-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="media-upload-form"
                            disabled={files.length === 0}
                            className="flex-2 sm:flex-none h-12 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 rounded-xl font-black uppercase tracking-wider text-sm disabled:opacity-50 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-primary/20"
                        >
                            {t('upload_modal.start_upload', 'Start Upload')}
                            <ChevronRight className="w-4 h-4 shrink-0" />
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default EmployeeMediaUploadModal;