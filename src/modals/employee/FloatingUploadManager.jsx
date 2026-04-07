import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../api/axios';
import { clearUploadJob } from '../../store/slices/uploadSlice';
import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';

const FloatingUploadManager = () => {
    const dispatch = useDispatch();
    const { isUploading, jobQueue } = useSelector((state) => state.upload);
    const uppyRef = useRef(null);
    const successfulUploadsRef = useRef([]);

    useEffect(() => {
        if (!isUploading || !jobQueue || uppyRef.current) return;

        const { files, metadata, uploadType = 'vault' } = jobQueue;
        successfulUploadsRef.current = [];

        const uppy = new Uppy({
            autoProceed: true,
            allowMultipleUploadBatches: false,
            retryDelays: [1000, 3000, 5000, 10000, 15000]
        });

        uppy.use(AwsS3, {
            limit: window.innerWidth <= 768 ? 1 : 3,
            timeout: 60 * 1000,
            shouldUseMultipart: true,
            createMultipartUpload: async (file) => {
                const { thumbnails, ...cleanMetadata } = metadata;

                // 2. Send the clean, lightweight metadata to initialize the upload
                const res = await api.post('/employee/media/multipart/create', {
                    filename: file.name,
                    type: file.type,
                    metadata: cleanMetadata
                });

                return { uploadId: res.data.uploadId, key: res.data.key };
            },
            signPart: async (file, partData) => {
                const res = await api.post('/employee/media/multipart/sign', { uploadId: partData.uploadId, key: partData.key, partNumber: partData.partNumber });
                return { url: res.data.url };
            },
            completeMultipartUpload: async (file, uploadData) => {
                const res = await api.post('/employee/media/multipart/complete', { uploadId: uploadData.uploadId, key: uploadData.key, parts: uploadData.parts });
                return { location: res.data.location };
            },
            abortMultipartUpload: async (file, uploadData) => {
                await api.post('/employee/media/multipart/abort', { uploadId: uploadData.uploadId, key: uploadData.key });
            }
        });

        uppy.on('upload-started', () => {
            if ('wakeLock' in navigator) navigator.wakeLock.request('screen').catch(() => { });
        });

        uppy.on('upload-progress', (file, progressData) => {
            const percent = Math.round((progressData.bytesUploaded / progressData.bytesTotal) * 100);
            if (uploadType === 'learning-hub') {
                window.dispatchEvent(new CustomEvent('learning-upload-progress', { detail: percent }));
            } else {
                window.dispatchEvent(new CustomEvent('vault-upload-progress', { detail: percent }));
            }
        });

        uppy.on('upload-success', (file, response) => {
            successfulUploadsRef.current.push({ url: response.uploadURL, fileType: 'video' });
        });

        // ==========================================
        // THE FIX IS IN THIS COMPLETE HANDLER
        // ==========================================
        uppy.on('complete', async (result) => {
            if (result.failed.length > 0) {
                const errorEvent = uploadType === 'learning-hub' ? 'learning-upload-error' : 'vault-upload-error';
                window.dispatchEvent(new CustomEvent(errorEvent, { detail: "Upload failed. Please check network." }));
                dispatch(clearUploadJob());
                return;
            }

            try {
                if (uploadType === 'learning-hub') {
                    const uploadedUrls = successfulUploadsRef.current.map(item => item.url);

                    let parsedThumbnails = [];
                    if (metadata.thumbnails) {
                        try {
                            parsedThumbnails = JSON.parse(metadata.thumbnails);
                        } catch (e) {
                            console.error("Failed to parse thumbnails payload:", e);
                        }
                    }

                    // We MUST await this so Redux doesn't clear the job before the DB saves
                    await api.post('/learning', {
                        title: metadata.title,
                        description: metadata.description,
                        fileUrls: uploadedUrls,
                        thumbnails: parsedThumbnails
                    });

                    window.dispatchEvent(new CustomEvent('learning-upload-success'));
                    setTimeout(() => window.dispatchEvent(new Event('refreshLearningHub')), 500);

                } else {
                    await api.post('/employee/media/save-log', {
                        ...metadata,
                        uploadedFiles: successfulUploadsRef.current
                    });
                    window.dispatchEvent(new CustomEvent('vault-upload-success'));
                    setTimeout(() => window.dispatchEvent(new Event('refreshMediaGallery')), 500);
                }

            } catch (err) {
                console.error("Database Save Error:", err);
                const errorEvent = uploadType === 'learning-hub' ? 'learning-upload-error' : 'vault-upload-error';
                window.dispatchEvent(new CustomEvent(errorEvent, { detail: "Uploaded, but failed to save to database." }));
            }

            // Wait a fraction of a second before nuking Redux so the UI success events have time to fire
            setTimeout(() => {
                dispatch(clearUploadJob());
                if (uppyRef.current) {
                    uppyRef.current.destroy();
                    uppyRef.current = null;
                }
            }, 100);
        });

        files.forEach(file => uppy.addFile({ name: file.name, type: file.type, data: file }));
        uppyRef.current = uppy;

        const handleCancel = () => {
            if (uppyRef.current) {
                uppyRef.current.cancelAll();
                uppyRef.current.destroy();
                uppyRef.current = null;
            }
            dispatch(clearUploadJob());
        };

        window.addEventListener('vault-upload-cancel', handleCancel);
        window.addEventListener('learning-upload-cancel', handleCancel);

        return () => {
            window.removeEventListener('vault-upload-cancel', handleCancel);
            window.removeEventListener('learning-upload-cancel', handleCancel);
            if (uppyRef.current) {
                uppyRef.current.destroy();
                uppyRef.current = null;
            }
        };

    }, [isUploading, jobQueue, dispatch]);

    return null;
};

export default FloatingUploadManager;