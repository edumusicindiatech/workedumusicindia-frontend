import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    UploadCloud, X, Film, Info, MapPin,
    CalendarDays, ChevronRight, Users, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { startBackgroundUpload } from "../../store/slices/uploadSlice";
import CustomSelect from "../../components/ui/CustomSelect";
import { useTranslation } from "react-i18next";
import api from "../../api/axios";

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
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [studentsCount, setStudentsCount] = useState("");
    const [files, setFiles] = useState([]); // Now stores array of { file, thumbnail }
    const [description, setDescription] = useState("");
    const [liveSchools, setLiveSchools] = useState([]);
    const [isFetchingSchools, setIsFetchingSchools] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen && !isUploading) {
            setFiles([]);
            setEventName("");
            setEventDate("");
            setStudentsCount("");
            setBand("");
            setSelectedSchoolId("");
            setDescription("");
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

        const MAX_COMBINED_SIZE = 500 * 1024 * 1024; // 500 MB
        let runningTotalSize = files.reduce((total, f) => total + f.file.size, 0);

        const validItems = [];
        const toastId = toast.loading("Processing videos...");

        for (const f of selectedFiles) {
            if (runningTotalSize + f.size > MAX_COMBINED_SIZE) {
                toast.error(`Cannot add "${f.name}". Max combined limit is 500MB.`);
            } else {
                // Extract thumbnail instantly
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
        if (!selectedSchoolId) return toast.error(t('upload_modal.select_school_toast'));
        if (!band) return toast.error(t('upload_modal.band_category_toast'));
        if (!studentsCount) return toast.error(t('upload_modal.students_count_toast'));
        if (files.length === 0) return toast.error(t('upload_modal.add_video_toast'));

        // Separate raw files for Uppy, and stringify thumbnails for Metadata
        const rawFiles = files.map(item => item.file);
        const base64Thumbnails = files.map(item => item.thumbnail);

        dispatch(startBackgroundUpload({
            uploadType: 'vault',
            files: rawFiles,
            metadata: {
                schoolId: selectedSchoolId,
                schoolName: currentSelectedName,
                band, eventName, eventDate, studentsCount,
                description,
                thumbnails: JSON.stringify(base64Thumbnails) // Pack it into metadata
            }
        }));

        onClose();
    };

    const visibilityClass = isOpen
        ? "opacity-100 pointer-events-auto z-60"
        : "opacity-0 pointer-events-none -z-50";

    return (
        <div className={`fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm transition-all duration-300 ${visibilityClass}`}>
            <div className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-700/50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">

                <div className="flex items-center justify-between p-6 border-b border-border dark:border-slate-800 bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('upload_modal.title')}</h2>
                        <p className="text-xs font-medium text-muted-foreground mt-1">{t('upload_modal.subtitle')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="media-upload-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 pb-40 space-y-6 custom-scrollbar">
                    <div className="p-5 rounded-2xl bg-background/50 dark:bg-[#0d1117]/50 border border-border dark:border-slate-800 space-y-5">

                        <div className="relative z-100">
                            <label className="block text-[13px] font-bold text-foreground mb-2 uppercase tracking-wider">
                                {t('upload_modal.assigned_school')} <span className="text-destructive">*</span>
                            </label>
                            {isHydrating || isFetchingSchools ? (
                                <div className="h-10.5 flex items-center px-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 rounded-lg text-sm text-muted-foreground">
                                    {t('upload_modal.loading_schools')}
                                </div>
                            ) : (
                                <div className="flex items-center relative">
                                    <div className="absolute left-3 z-10 pointer-events-none">
                                        <MapPin className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="w-full pl-8">
                                        <CustomSelect value={currentSelectedName} onChange={handleSchoolSelect} options={schoolOptions} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative z-10">
                            <label className="block text-[13px] font-bold text-foreground mb-2 uppercase tracking-wider">
                                {t('upload_modal.band_category')} <span className="text-destructive">*</span>
                            </label>
                            <div className="flex bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 p-1 rounded-xl">
                                {['Junior Band', 'Senior Band'].map((b) => {
                                    const isActive = band === b;
                                    return (
                                        <button
                                            key={b} type="button" onClick={() => setBand(b)}
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                                        >
                                            {isActive && <CheckCircle2 className="w-4 h-4" />}
                                            {b === 'Junior Band' ? t('upload_modal.junior_band') : t('upload_modal.senior_band')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl bg-background/50 dark:bg-[#0d1117]/50 border border-border dark:border-slate-800">
                        <div className="space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">{t('upload_modal.event_name')} <span className="text-muted-foreground lowercase font-medium tracking-normal">{t('upload_modal.optional')}</span></label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder={t('upload_modal.placeholder_event')} className="w-full h-11 pl-11 pr-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">{t('upload_modal.event_date')} {eventName && <span className="text-destructive">*</span>}</label>
                            <div className="relative">
                                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full h-11 px-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all scheme-light dark:scheme-dark" />
                            </div>
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">
                                {t('upload_modal.students_present')} <span className="text-destructive">*</span>
                            </label>
                            <div className="relative sm:w-1/2">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                <input type="number" value={studentsCount} onChange={(e) => setStudentsCount(e.target.value)} placeholder="0" className="w-full h-11 pl-11 pr-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" />
                            </div>
                        </div>
                        <div className="sm:col-span-2 space-y-2 mt-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">
                                {t('upload_modal.instructor_note')} <span className="text-muted-foreground lowercase font-medium tracking-normal">{t('upload_modal.optional')}</span>
                            </label>
                            <textarea
                                rows="3"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('upload_modal.placeholder_desc')}
                                className="w-full p-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 resize-none"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">
                                {t('upload_modal.video_files')} <span className="text-destructive">*</span>
                            </label>
                            <span className="text-[11px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                {files.length} / 5
                            </span>
                        </div>

                        <div
                            onClick={() => files.length < 5 && fileInputRef.current?.click()}
                            className={`w-full flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed rounded-2xl transition-all duration-300 ${files.length >= 5 ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed' : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 cursor-pointer'}`}
                        >
                            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                                <UploadCloud className="w-7 h-7 text-primary" />
                            </div>
                            <p className="text-sm font-bold text-foreground mb-1">{t('upload_modal.click_to_browse')}</p>
                            <p className="text-[11px] text-muted-foreground font-medium">{t('upload_modal.file_limits')}</p>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="video/*" className="hidden" disabled={files.length >= 5} />
                        </div>

                        {files.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                {files.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border dark:border-slate-800 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {/* Pre-rendered Image instead of the default generic icon */}
                                            <img
                                                src={item.thumbnail}
                                                alt="Video Thumbnail"
                                                className="w-12 h-12 object-cover rounded-lg shrink-0 border border-border bg-black"
                                            />
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[13px] font-bold text-foreground truncate">{item.file.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

                <div className="bg-muted/30 dark:bg-[#121620] p-5 md:px-7 flex items-center justify-between border-t border-border dark:border-slate-800 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg border border-border dark:border-slate-800">
                        <Info className="w-4 h-4 text-primary" />
                        <span className="text-[11px] font-bold tracking-wide">{t('upload_modal.cloud_enabled')}</span>
                    </div>

                    <button
                        type="submit"
                        form="media-upload-form"
                        disabled={files.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:grayscale transition-all duration-300 active:scale-95 shadow-md"
                    >
                        {t('upload_modal.start_upload')}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeMediaUploadModal;