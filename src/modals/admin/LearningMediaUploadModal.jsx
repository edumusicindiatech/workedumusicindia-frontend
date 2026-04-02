import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { startBackgroundUpload } from "../../store/slices/uploadSlice";
import { X, UploadCloud, Film, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const LearningMediaUploadModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState(null);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setTitle("");
            setDescription("");
            setFile(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        const MAX_SIZE = 500 * 1024 * 1024;
        if (selectedFile.size > MAX_SIZE) {
            return toast.error("Video exceeds the 500MB limit.");
        }
        setFile(selectedFile);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error("Title is required");
        if (!file) return toast.error("Please select a video file");

        // 🔥 Dispatch to the Global Uppy Manager!
        dispatch(startBackgroundUpload({
            uploadType: 'learning-hub', // Tells Uppy which logic to use
            files: [file], // Put the single file in an array so Uppy can loop it
            metadata: { title, description }
        }));

        // Instantly close so they can keep browsing!
        onClose();
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-foreground">Upload Training Video</h2>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Share a lesson with all employees</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="learning-upload-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">Lesson Title <span className="text-destructive">*</span></label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Advanced Snare Drum Techniques" className="w-full h-11 px-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all" />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">Description <span className="text-muted-foreground lowercase font-medium tracking-normal">(Optional)</span></label>
                        <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly explain what this video covers..." className="w-full p-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all resize-none" />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">Video File <span className="text-destructive">*</span></label>
                        {!file ? (
                            <div onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl hover:bg-primary/10 hover:border-primary/60 cursor-pointer transition-all duration-300">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                                    <UploadCloud className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-bold text-foreground">Click to select video</p>
                                <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM (Max 500MB)</p>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*" className="hidden" />
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                        <Film className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setFile(null)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </form>

                <div className="p-5 border-t border-border bg-muted/20 shrink-0">
                    <button type="submit" form="learning-upload-form" disabled={!file || !title.trim()} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                        <CheckCircle2 className="w-5 h-5" /> Start Background Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LearningMediaUploadModal;