import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { UploadCloud, CheckCircle2, AlertTriangle, X, Minus, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { clearUploadJob } from '../../store/slices/uploadSlice';
const FloatingUploadManager = () => {
    const dispatch = useDispatch();
    const { isUploading, jobQueue } = useSelector((state) => state.upload);

    // Local UI State for the floating widget
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing...");
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [totalVideos, setTotalVideos] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!isUploading || !jobQueue) return;

        const processUploadQueue = async () => {
            const { files, metadata } = jobQueue;
            const successfulUploads = [];
            const failedFiles = [];

            setTotalVideos(files.length);
            setHasError(false);
            setIsMinimized(false); // Pop it open when a new job starts

            try {
                setStatusText("Connecting to secure vault...");
                const filePayload = files.map(f => ({ name: f.name, type: f.type }));
                const { data: urlData } = await api.post('/employee/media/generate-urls', {
                    files: filePayload, metadata
                });

                // Sequential XHR Upload Loop
                for (let i = 0; i < files.length; i++) {
                    setCurrentVideoIndex(i + 1);
                    setStatusText(`Uploading video ${i + 1} of ${files.length}...`);
                    setProgress(0);

                    const file = files[i];
                    const targetUrl = urlData.urls[i].uploadUrl;
                    const publicUrl = urlData.urls[i].publicUrl;

                    await new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open("PUT", targetUrl, true);
                        xhr.setRequestHeader("Content-Type", file.type);

                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                setProgress(percentComplete);
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                successfulUploads.push({ url: publicUrl, fileType: 'video' });
                                resolve();
                            } else {
                                reject(new Error("Upload rejected."));
                            }
                        };

                        xhr.onerror = () => reject(new Error("Network error."));
                        xhr.send(file);
                    }).catch((err) => {
                        console.error(`Failed: ${file.name}`, err);
                        failedFiles.push(file.name);
                    });
                }

                if (successfulUploads.length > 0) {
                    setStatusText("Finalizing database records...");
                    setProgress(100);
                    await api.post('/employee/media/save-log', {
                        ...metadata,
                        uploadedFiles: successfulUploads
                    });
                }

                if (failedFiles.length === 0) {
                    toast.success("All videos safely in the Vault!");
                    window.dispatchEvent(new Event('refreshMediaGallery'));
                    dispatch(clearUploadJob()); // Clears Redux & hides widget
                } else {
                    setHasError(true);
                    setStatusText(`Failed to upload ${failedFiles.length} videos.`);
                    toast.error("Some videos failed. Check network.");
                }

            } catch (error) {
                console.error("Upload Error:", error);
                setHasError(true);
                setStatusText("Upload connection crashed.");
            }
        };

        processUploadQueue();

    }, [isUploading, jobQueue, dispatch]);

    // If not uploading and no errors to show, render nothing
    if (!isUploading && !hasError) return null;

    return (
        <div className={`fixed z-100 transition-all duration-500 ease-in-out ${isMinimized
            ? 'bottom-4 right-4 w-auto rounded-full bg-primary shadow-xl cursor-pointer hover:scale-105'
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[90%] sm:w-80 bg-card dark:bg-[#181d29] border border-border dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden'
            }`}>
            {isMinimized ? (
                // Minimized "Pill" View
                <div
                    onClick={() => setIsMinimized(false)}
                    className="flex items-center gap-3 px-5 py-3"
                >
                    <UploadCloud className="w-5 h-5 text-primary-foreground animate-pulse" />
                    <span className="text-sm font-bold text-primary-foreground">
                        {Math.round(progress)}% • Video {currentVideoIndex}/{totalVideos}
                    </span>
                </div>
            ) : (
                // Maximized Panel View
                <div className="flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            {hasError ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <UploadCloud className="w-4 h-4 text-primary" />}
                            <span className="text-sm font-bold text-foreground">Background Upload</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {!hasError && (
                                <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors">
                                    <Minus className="w-4 h-4" />
                                </button>
                            )}
                            {hasError && (
                                <button onClick={() => dispatch(clearUploadJob())} className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                        <p className="text-[13px] font-medium text-foreground mb-3 truncate">{statusText}</p>

                        {!hasError && (
                            <div className="space-y-2">
                                {/* Progress Bar */}
                                <div className="h-2 w-full bg-muted dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span>{progress}%</span>
                                    <span>{currentVideoIndex} of {totalVideos}</span>
                                </div>
                            </div>
                        )}

                        {/* Network Warning */}
                        <div className="mt-4 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                                You can browse the app, but do not close this browser tab until finished.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingUploadManager;