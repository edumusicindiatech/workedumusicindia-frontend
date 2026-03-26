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

            try {
                // PHASE 1: Ask Render server for all pre-signed URLs at once (Very low RAM)
                // Sending 'name', 'type', and 'metadata' for smart filename generation!
                const filePayload = files.map(f => ({ name: f.name, type: f.type }));
                const { data: urlData } = await api.post('/employee/media/generate-urls', {
                    files: filePayload,
                    metadata: metadata
                });

                // PHASE 2: SEQUENTIAL Direct Binary Upload (Saves Browser RAM)
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const targetUrl = urlData.urls[i].uploadUrl;
                    const publicUrl = urlData.urls[i].publicUrl;

                    // Update toast to show progress
                    toast.loading(`Uploading video ${i + 1} of ${files.length}... ⚠️ Do not close tab.`, { id: 'global-upload-toast' });

                    try {
                        const response = await fetch(targetUrl, {
                            method: "PUT",
                            headers: { "Content-Type": file.type },
                            body: file
                        });

                        if (!response.ok) throw new Error("Cloudflare rejected upload");

                        // Success! Store the public URL
                        successfulUploads.push({ url: publicUrl, fileType: 'video' });
                    } catch (err) {
                        console.error(`Failed to upload ${file.name}`, err);
                        failedFiles.push(file.name);
                    }
                }

                // PHASE 3: Save Metadata to MongoDB (Only if we got at least 1 success)
                if (successfulUploads.length > 0) {
                    toast.loading("Saving records to database...", { id: 'global-upload-toast' });
                    await api.post('/employee/media/save-log', {
                        ...metadata,
                        uploadedFiles: successfulUploads
                    });
                }

                // PHASE 4: Final UI and Alerting
                if (failedFiles.length === 0) {
                    toast.success("All media successfully uploaded to Vault!", { id: 'global-upload-toast', duration: 5000 });
                } else {
                    const failMsg = `Uploaded ${successfulUploads.length}/${files.length}. Failed: ${failedFiles.join(', ')}`;
                    toast.error(failMsg, { id: 'global-upload-toast', duration: 10000 });

                    const failurePayload = {
                        failedFiles,
                        eventContext: metadata.eventName || "Regular Visit",
                        schoolId: metadata.schoolId
                    };

                    // Try to send email trigger
                    try {
                        await api.post('/employee/media/send-failure-email', failurePayload);
                    } catch (e) {
                        console.error("User is completely offline. Email trigger failed. Queuing for later.");

                        // Save the failed payload to LocalStorage
                        const existingQueue = JSON.parse(localStorage.getItem('offlineEmailQueue') || '[]');
                        existingQueue.push(failurePayload);
                        localStorage.setItem('offlineEmailQueue', JSON.stringify(existingQueue));
                    }
                }

            } catch (error) {
                console.error("Critical System Error:", error);
                toast.error("Upload process crashed. Please check your connection and try again.", { id: 'global-upload-toast', duration: 6000 });
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