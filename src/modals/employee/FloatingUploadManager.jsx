import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { UploadCloud, AlertTriangle, X, Minus } from 'lucide-react';
import api from '../../api/axios';
import { clearUploadJob } from '../../store/slices/uploadSlice';

import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';

const FloatingUploadManager = () => {
    const dispatch = useDispatch();
    const { isUploading, jobQueue } = useSelector((state) => state.upload);

    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing...");
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [totalVideos, setTotalVideos] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);
    const [hasError, setHasError] = useState(false);

    const uppyRef = useRef(null);
    const successfulUploadsRef = useRef([]);

    useEffect(() => {
        if (!isUploading || !jobQueue || uppyRef.current) return;

        const { files, metadata } = jobQueue;
        setTotalVideos(files.length);
        setHasError(false);
        setIsMinimized(false);
        successfulUploadsRef.current = [];

        // 1. Start Headless Uppy with Aggressive Mobile Retries
        const uppy = new Uppy({
            autoProceed: true,
            allowMultipleUploadBatches: false,
            retryDelays: [1000, 3000, 5000, 10000, 15000] // Waits and retries on network drop
        });

        // 2. Configure AWS S3 Multipart Plugin
        uppy.use(AwsS3, {
            limit: window.innerWidth <= 768 ? 1 : 3,
            timeout: 60 * 1000,
            // 🔥 CRITICAL FIX: Ensure this is exactly as written below
            shouldUseMultipart: true,

            // This function name must be EXACTLY 'createMultipartUpload'
            createMultipartUpload: async (file) => {
                const res = await api.post('/employee/media/multipart/create', {
                    filename: file.name,
                    type: file.type,
                    metadata
                });
                // Your backend returns { uploadId, key }. Uppy needs exactly those.
                return {
                    uploadId: res.data.uploadId,
                    key: res.data.key
                };
            },

            // This function name must be EXACTLY 'signPart'
            signPart: async (file, partData) => {
                const res = await api.post('/employee/media/multipart/sign', {
                    uploadId: partData.uploadId,
                    key: partData.key,
                    partNumber: partData.partNumber
                });
                return { url: res.data.url };
            },

            // This function name must be EXACTLY 'completeMultipartUpload'
            completeMultipartUpload: async (file, uploadData) => {
                const res = await api.post('/employee/media/multipart/complete', {
                    uploadId: uploadData.uploadId,
                    key: uploadData.key,
                    parts: uploadData.parts
                });
                return { location: res.data.location };
            },

            // This function name must be EXACTLY 'abortMultipartUpload'
            abortMultipartUpload: async (file, uploadData) => {
                await api.post('/employee/media/multipart/abort', {
                    uploadId: uploadData.uploadId,
                    key: uploadData.key
                });
            }
        });

        // 3. Link Uppy Events to React State
        uppy.on('upload-started', () => {
            setStatusText(`Uploading video 1 of ${files.length}...`);
            setCurrentVideoIndex(1);

            // Try to keep screen on (mobile)
            if ('wakeLock' in navigator) {
                navigator.wakeLock.request('screen').catch(() => { });
            }
        });

        uppy.on('upload-progress', (file, progressData) => {
            const percent = Math.round((progressData.bytesUploaded / progressData.bytesTotal) * 100);
            setProgress(percent);
        });

        uppy.on('upload-success', (file, response) => {
            successfulUploadsRef.current.push({ url: response.uploadURL, fileType: 'video' });

            if (currentVideoIndex < files.length) {
                setCurrentVideoIndex(prev => prev + 1);
                setStatusText(`Uploading video ${currentVideoIndex + 1} of ${files.length}...`);
            }
        });

        uppy.on('complete', async (result) => {
            if (result.failed.length > 0) {
                setHasError(true);
                setStatusText(`Failed to upload ${result.failed.length} videos.`);
                return; // Errors handled cleanly in UI now
            }

            // 4. Save to MongoDB via your existing route
            try {
                setStatusText("Finalizing database records...");
                setProgress(100);

                await api.post('/employee/media/save-log', {
                    ...metadata,
                    uploadedFiles: successfulUploadsRef.current
                });

                window.dispatchEvent(new Event('refreshMediaGallery'));
                dispatch(clearUploadJob());

                uppy.destroy();
                uppyRef.current = null;
            } catch (err) {
                setHasError(true);
                setStatusText("Failed to save records.");
            }
        });

        // 5. Inject files into Uppy
        files.forEach(file => uppy.addFile({
            name: file.name,
            type: file.type,
            data: file,
        }));

        uppyRef.current = uppy;

        return () => {
            if (uppyRef.current) {
                uppyRef.current.destroy();
                uppyRef.current = null;
            }
        };

    }, [isUploading, jobQueue, dispatch]);

    // --- UI RENDER ---
    if (!isUploading && !hasError) return null;

    return (
        <div className={`fixed z-100 transition-all duration-500 ease-in-out ${isMinimized
            ? 'bottom-4 right-4 w-auto rounded-full bg-primary shadow-xl cursor-pointer hover:scale-105'
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[90%] sm:w-80 bg-card dark:bg-[#181d29] border border-border dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden'
            }`}>
            {isMinimized ? (
                <div onClick={() => setIsMinimized(false)} className="flex items-center gap-3 px-5 py-3">
                    <UploadCloud className="w-5 h-5 text-primary-foreground animate-pulse" />
                    <span className="text-sm font-bold text-primary-foreground">
                        {Math.round(progress)}% • Video {currentVideoIndex}/{totalVideos}
                    </span>
                </div>
            ) : (
                <div className="flex flex-col">
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
                                <button onClick={() => {
                                    dispatch(clearUploadJob());
                                    if (uppyRef.current) uppyRef.current.destroy();
                                    uppyRef.current = null;
                                }} className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-5">
                        <p className="text-[13px] font-medium text-foreground mb-3 truncate">{statusText}</p>
                        {!hasError && (
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-muted dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span>{progress}%</span>
                                    <span>{currentVideoIndex} of {totalVideos}</span>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                                Network drops will auto-resume. Please do not close this browser tab.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingUploadManager;