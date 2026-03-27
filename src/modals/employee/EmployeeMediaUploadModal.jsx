import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    UploadCloud, X, Film, Info, MapPin,
    CalendarDays, ChevronRight, Users, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { startBackgroundUpload } from "../../store/slices/uploadSlice";
import CustomSelect from "../../components/ui/CustomSelect";

const EmployeeMediaUploadModal = ({ isOpen, onClose }) => {
    const { user, isHydrating } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    // Form State
    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [band, setBand] = useState("");
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [studentsCount, setStudentsCount] = useState("");
    const [files, setFiles] = useState([]);

    const fileInputRef = useRef(null);

    // Handle initial state and escape key
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // --- CustomSelect Helper Logic ---
    // Extract just the names for the CustomSelect options
    const schoolOptions = user?.assignments?.map(item => item.school?.schoolName || "Unnamed School") || [];

    // Get the currently selected name to display in the CustomSelect
    const currentSelectedName = user?.assignments?.find(
        item => (item.school?._id || item.school) === selectedSchoolId
    )?.school?.schoolName || "";

    // Handle when user picks a name from CustomSelect
    const handleSchoolSelect = (selectedName) => {
        const matchedAssignment = user?.assignments?.find(
            item => (item.school?.schoolName || "Unnamed School") === selectedName
        );
        if (matchedAssignment) {
            setSelectedSchoolId(matchedAssignment.school?._id || matchedAssignment.school);
        }
    };
    // ---------------------------------

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const availableSlots = 5 - files.length;
        if (selectedFiles.length > availableSlots) {
            toast.error(`Limit reached: Only ${availableSlots} more allowed.`);
            setFiles((prev) => [...prev, ...selectedFiles.slice(0, availableSlots)]);
        } else {
            setFiles((prev) => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedSchoolId) return toast.error("Please select a school.");
        if (!band) return toast.error("Band category is required.");
        if (files.length === 0) return toast.error("Please add at least one video.");

        const MAX_SIZE = 200 * 1024 * 1024;
        if (files.some(f => f.size > MAX_SIZE)) {
            return toast.error("Files exceed 200MB limit.");
        }

        // 1. Send the actual File objects to Redux
        dispatch(startBackgroundUpload({
            files: files,
            metadata: {
                schoolId: selectedSchoolId,
                schoolName: currentSelectedName,
                band, eventName, eventDate, studentsCount
            }
        }));

        // 2. Show a silent, non-blocking notification
        toast.success("Upload started in background. You can continue working.");

        // 3. Immediately close the modal!
        onClose();
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-700/50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border dark:border-slate-800 bg-muted/20">
                    <div>
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight">Upload to Vault</h2>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Add performance videos to your school's secure gallery.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="media-upload-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* SECTION 1: Core Assignment */}
                    <div className="p-5 rounded-2xl bg-background/50 dark:bg-[#0d1117]/50 border border-border dark:border-slate-800 space-y-5">

                        {/* School CustomSelect */}
                        <div className="relative z-20">
                            <label className="block text-[13px] font-bold text-foreground mb-2 uppercase tracking-wider">
                                Assigned School <span className="text-destructive">*</span>
                            </label>
                            {isHydrating ? (
                                <div className="h-10.5 flex items-center px-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 rounded-lg text-sm text-muted-foreground">
                                    Loading schools...
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <div className="absolute left-3 z-10 pointer-events-none">
                                        <MapPin className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="w-full pl-8">
                                        <CustomSelect
                                            value={currentSelectedName}
                                            onChange={handleSchoolSelect}
                                            options={schoolOptions}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Band Segmented Control */}
                        <div className="relative z-10">
                            <label className="block text-[13px] font-bold text-foreground mb-2 uppercase tracking-wider">
                                Band Category <span className="text-destructive">*</span>
                            </label>
                            <div className="flex bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 p-1 rounded-xl">
                                {['Junior Band', 'Senior Band'].map((b) => {
                                    const isActive = band === b;
                                    return (
                                        <button
                                            key={b}
                                            type="button"
                                            onClick={() => setBand(b)}
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${isActive
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                }`}
                                        >
                                            {isActive && <CheckCircle2 className="w-4 h-4" />}
                                            {b}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Event Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl bg-background/50 dark:bg-[#0d1117]/50 border border-border dark:border-slate-800">
                        <div className="space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">Event Name <span className="text-muted-foreground lowercase font-medium tracking-normal">(Optional)</span></label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Spring Concert" className="w-full h-11 pl-11 pr-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">Event Date {eventName && <span className="text-destructive">*</span>}</label>
                            <div className="relative">
                                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full h-11 px-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all scheme-light dark:scheme-dark" />
                            </div>
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">Students Present <span className="text-muted-foreground lowercase font-medium tracking-normal">(Optional)</span></label>
                            <div className="relative sm:w-1/2">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                <input type="number" value={studentsCount} onChange={(e) => setStudentsCount(e.target.value)} placeholder="0" className="w-full h-11 pl-11 pr-4 bg-background dark:bg-[#12141c] border border-input dark:border-slate-700 focus:border-primary rounded-xl text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Media Dropzone */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[13px] font-bold text-foreground uppercase tracking-wider">
                                Video Files <span className="text-destructive">*</span>
                            </label>
                            <span className="text-[11px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                {files.length} / 5
                            </span>
                        </div>

                        <div
                            onClick={() => files.length < 5 && fileInputRef.current?.click()}
                            className={`w-full flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed rounded-2xl transition-all duration-300 ${files.length >= 5
                                ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                                : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 cursor-pointer'
                                }`}
                        >
                            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                                <UploadCloud className="w-7 h-7 text-primary" />
                            </div>
                            <p className="text-sm font-bold text-foreground mb-1">Click to browse videos</p>
                            <p className="text-[11px] text-muted-foreground font-medium">MP4 or MOV • Max 200MB per file</p>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="video/*" className="hidden" disabled={files.length >= 5} />
                        </div>

                        {/* File Previews */}
                        {files.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border dark:border-slate-800 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                                <Film className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[13px] font-bold text-foreground truncate">{file.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
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

                {/* Footer */}
                <div className="bg-muted/30 dark:bg-[#121620] p-5 md:px-7 flex items-center justify-between border-t border-border dark:border-slate-800">
                    <div className="hidden sm:flex items-center gap-2 text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg border border-border dark:border-slate-800">
                        <Info className="w-4 h-4 text-primary" />
                        <span className="text-[11px] font-bold tracking-wide">Direct-to-Cloud Enabled</span>
                    </div>

                    <button
                        type="submit"
                        form="media-upload-form"
                        disabled={files.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:grayscale transition-all duration-300 active:scale-95 shadow-md"
                    >
                        Start Upload
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeMediaUploadModal;