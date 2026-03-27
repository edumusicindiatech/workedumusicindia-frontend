import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { clearUploadJob } from '../store/slices/uploadSlice';

const GlobalUploadManager = () => {
    const dispatch = useDispatch();
    const { isUploading, jobQueue } = useSelector((state) => state.upload);

    useEffect(() => {
        if (!isUploading || !jobQueue) return;

        const processUploadQueue = async () => {
            const { files, metadata } = jobQueue;
            const successfulUploads = [];
            const failedFiles = [];

            // 🔥 FIX 1: Generate a dynamic Toast ID and save it to a variable
            const uploadToastId = toast.loading(`Preparing 0 of ${files.length} videos...`, {
                position: 'bottom-right'
            });

            try {
                // PHASE 1: Generate URLs
                const filePayload = files.map(f => ({ name: f.name, type: f.type }));
                const { data: urlData } = await api.post('/employee/media/generate-urls', {
                    files: filePayload,
                    metadata: metadata
                });

                // PHASE 2: SEQUENTIAL Direct Binary Upload
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const targetUrl = urlData.urls[i].uploadUrl;
                    const publicUrl = urlData.urls[i].publicUrl;

                    // Update the existing toast
                    toast.loading(`Uploading video ${i + 1} of ${files.length}... ⚠️ Do not close tab.`, { id: uploadToastId });

                    try {
                        const response = await fetch(targetUrl, {
                            method: "PUT",
                            headers: { "Content-Type": file.type },
                            body: file
                        });

                        if (!response.ok) throw new Error("Cloudflare rejected upload");
                        successfulUploads.push({ url: publicUrl, fileType: 'video' });
                    } catch (err) {
                        console.error(`Failed to upload ${file.name}`, err);
                        failedFiles.push(file.name);
                    }
                }

                // PHASE 3: Save Metadata to MongoDB
                if (successfulUploads.length > 0) {
                    // Update the existing toast
                    toast.loading("Saving records to database...", { id: uploadToastId });
                    await api.post('/employee/media/save-log', {
                        ...metadata,
                        uploadedFiles: successfulUploads
                    });
                }

                // 🔥 FIX 2: Explicitly kill the spinning toast
                toast.dismiss(uploadToastId);

                // PHASE 4: Final UI and Alerting
                if (failedFiles.length === 0) {
                    toast.success("All media successfully uploaded to Vault!", { duration: 5000 });
                } else {
                    const failMsg = `Uploaded ${successfulUploads.length}/${files.length}. Failed: ${failedFiles.join(', ')}`;
                    toast.error(failMsg, { duration: 10000 });

                    const failurePayload = {
                        failedFiles,
                        eventContext: metadata.eventName || "Regular Visit",
                        schoolId: metadata.schoolId
                    };

                    try {
                        await api.post('/employee/media/send-failure-email', failurePayload);
                    } catch (e) {
                        console.error("User offline. Queuing for later.");
                        const existingQueue = JSON.parse(localStorage.getItem('offlineEmailQueue') || '[]');
                        existingQueue.push(failurePayload);
                        localStorage.setItem('offlineEmailQueue', JSON.stringify(existingQueue));
                    }
                }

                // 🔥 FIX 3: Trigger the gallery refresh
                window.dispatchEvent(new Event('refreshMediaGallery'));

            } catch (error) {
                console.error("Critical System Error:", error);
                // Also kill the spinner if the app completely crashes
                toast.dismiss(uploadToastId);
                toast.error("Upload process crashed. Please check your connection and try again.", { duration: 6000 });
            } finally {
                // Wipe the queue
                dispatch(clearUploadJob());
            }
        };

        processUploadQueue();

    }, [isUploading, jobQueue, dispatch]);

    return null; // Renders nothing!
};

export default GlobalUploadManager;