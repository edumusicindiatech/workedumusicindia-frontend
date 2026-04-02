import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { startBackgroundUpload } from "../../store/slices/uploadSlice";
import { X, UploadCloud, Film, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const LearningMediaUploadModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState([]); // Updated to handle an array of files

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setTitle("");
            setDescription("");
            setFiles([]); // Reset to empty array
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (!selectedFiles.length) return;

        const MAX_COMBINED_SIZE = 500 * 1024 * 1024; // 500 MB

        // 1. Calculate the size of files already in the upload queue
        const currentTotalSize = files.reduce((total, f) => total + f.size, 0);

        // 2. Keep track of the running total as we evaluate new files
        let runningTotalSize = currentTotalSize;
        const validFiles = [];

        // 3. Evaluate each newly selected file
        for (const f of selectedFiles) {
            if (runningTotalSize + f.size > MAX_COMBINED_SIZE) {
                // Show an error and skip this file if it pushes us over the limit
                // Note: You may want to add a specific translation key for this in your i18n file!
                toast.error(`Cannot add "${f.name}". The total upload size cannot exceed 500MB.`);
            } else {
                // If it fits, add it to our valid list and update the running total
                validFiles.push(f);
                runningTotalSize += f.size;
            }
        }

        // Append only the files that fit within the combined limit
        if (validFiles.length > 0) {
            setFiles((prev) => [...prev, ...validFiles]);
        }

        // Reset the input value so the same file can be selected again if removed later
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (indexToRemove) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error(t('learning_hub.toasts.title_required'));
        if (files.length === 0) return toast.error(t('learning_hub.toasts.file_required'));

        dispatch(startBackgroundUpload({
            uploadType: 'learning-hub',
            files: files, // Sending the array of files
            metadata: { title, description }
        }));

        onClose();
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-foreground">{t('learning_hub.upload_modal.title')}</h2>
                        <p className="text-xs font-medium text-muted-foreground mt-1">{t('learning_hub.upload_modal.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="learning-upload-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">
                            {t('learning_hub.upload_modal.lesson_title')} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('learning_hub.upload_modal.title_placeholder')}
                            className="w-full h-11 px-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">
                            {t('learning_hub.upload_modal.description')} <span className="text-muted-foreground lowercase font-medium tracking-normal">{t('learning_hub.upload_modal.optional')}</span>
                        </label>
                        <textarea
                            rows="3"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('learning_hub.upload_modal.desc_placeholder')}
                            className="w-full p-4 bg-background border border-input rounded-xl text-sm font-medium focus:border-primary outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[13px] font-bold uppercase tracking-wider text-foreground">
                            {t('learning_hub.upload_modal.video_file')} <span className="text-destructive">*</span>
                        </label>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="video/*"
                            multiple
                            className="hidden"
                        />

                        {files.length === 0 ? (
                            <div onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl hover:bg-primary/10 hover:border-primary/60 cursor-pointer transition-all duration-300">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                                    <UploadCloud className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-bold text-foreground">{t('learning_hub.upload_modal.click_to_select')}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t('learning_hub.upload_modal.file_limits')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                <Film className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold truncate">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeFile(index)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[13px] text-primary font-bold hover:underline mt-2 flex items-center gap-1"
                                >
                                    + Add another video
                                </button>
                            </div>
                        )}
                    </div>
                </form>

                <div className="p-5 border-t border-border bg-muted/20 shrink-0">
                    <button type="submit" form="learning-upload-form" disabled={files.length === 0 || !title.trim()} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                        <CheckCircle2 className="w-5 h-5" /> {t('learning_hub.upload_modal.start_upload_btn')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LearningMediaUploadModal;