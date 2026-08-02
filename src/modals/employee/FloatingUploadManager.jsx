import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../api/axios';
import { clearUploadJob } from '../../store/slices/uploadSlice';
import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';
import { registerPlugin } from '@capacitor/core';

// Initialize the native plugin
const NativeSettingsPlugin = registerPlugin('NativeSettingsPlugin');

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
        uppy.on('upload-error', (file, error) => {
            console.error('🔥 Uppy upload error:', file.name, error);
        });

        // Helper to get the target route for notifications
        const getRouteTarget = () => uploadType === 'learning-hub' ? 'admin/learning-hub' : 'employee/media';

        // Helper to get the first file name
        const getFirstFileName = () => {
            const currentFiles = uppy.getFiles();
            return currentFiles.length > 0 ? currentFiles[0].name : 'Media';
        };

        uppy.on('upload-started', () => {
            if ('wakeLock' in navigator) navigator.wakeLock.request('screen').catch(() => { });

            // 👉 NATIVE INTEGRATION: Start Foreground Service
            try {
                NativeSettingsPlugin.startUploadService({ fileName: getFirstFileName() });
            } catch (err) { /* Ignore on web */ }
        });

        uppy.on('upload-progress', (file, progressData) => {
            const percent = Math.round((progressData.bytesUploaded / progressData.bytesTotal) * 100);

            // 👉 NATIVE INTEGRATION: Update Notification Progress Bar
            try {
                NativeSettingsPlugin.updateUploadProgress({ fileName: file.name, progress: percent });
            } catch (err) { /* Ignore on web */ }

            if (uploadType === 'learning-hub') {
                window.dispatchEvent(new CustomEvent('learning-upload-progress', { detail: percent }));
            } else {
                window.dispatchEvent(new CustomEvent('vault-upload-progress', { detail: percent }));
            }
        });

        uppy.on('upload-success', (file, response) => {
            successfulUploadsRef.current.push({ url: response.uploadURL, fileType: 'video' });
        });

        uppy.on('complete', async (result) => {
            const fileName = getFirstFileName();
            const routeTarget = getRouteTarget();

            if (result.failed.length > 0) {
                const errorEvent = uploadType === 'learning-hub' ? 'learning-upload-error' : 'vault-upload-error';
                window.dispatchEvent(new CustomEvent(errorEvent, { detail: "Upload failed. Please check network." }));

                // 👉 NATIVE INTEGRATION: Stop service & notify failure
                try { NativeSettingsPlugin.stopUploadService({ title: 'Upload Failed', message: 'Please check your internet connection.', route: routeTarget, isError: true }); } catch (err) { }

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

                // 👉 NATIVE INTEGRATION: Stop service & play Ting sound on success!
                try { NativeSettingsPlugin.stopUploadService({ title: 'Upload Complete', message: `${fileName} has been successfully uploaded.`, route: routeTarget, isError: false }); } catch (err) { }

            } catch (err) {
                console.error("Database Save Error:", err);
                const errorEvent = uploadType === 'learning-hub' ? 'learning-upload-error' : 'vault-upload-error';
                window.dispatchEvent(new CustomEvent(errorEvent, { detail: "Uploaded, but failed to save to database." }));

                // 👉 NATIVE INTEGRATION: Stop service & notify failure
                try { NativeSettingsPlugin.stopUploadService({ title: 'Save Failed', message: 'Uploaded, but failed to save to database.', route: routeTarget, isError: true }); } catch (err) { }
            }

            setTimeout(() => {
                dispatch(clearUploadJob());
                if (uppyRef.current) {
                    uppyRef.current.destroy();
                    uppyRef.current = null;
                }
            }, 100);
        });

        // ==========================================
        // FIX: DUPLICATE FILE HANDLING
        // ==========================================
        let hasDuplicates = false;

        files.forEach(file => {
            try {
                uppy.addFile({ name: file.name, type: file.type, data: file });
            } catch (error) {
                // Uppy throws an error if it detects a duplicate file ID
                console.warn("Uppy skipped file:", error.message);
                hasDuplicates = true;
            }
        });

        if (hasDuplicates) {
            const errorEvent = uploadType === 'learning-hub' ? 'learning-upload-error' : 'vault-upload-error';
            window.dispatchEvent(new CustomEvent(errorEvent, { detail: "Duplicate files were skipped." }));
        }

        // Prevent getting stuck if ALL selected files were duplicates
        if (uppy.getFiles().length === 0) {
            dispatch(clearUploadJob());
            uppy.destroy();
            return;
        }

        uppyRef.current = uppy;

        const handleCancel = () => {
            if (uppyRef.current) {
                uppyRef.current.off('complete');
                uppyRef.current.cancelAll();
                uppyRef.current.destroy();
                uppyRef.current = null;
            }
            try {
                NativeSettingsPlugin.stopUploadService({
                    title: 'Upload Canceled',
                    message: 'The upload was safely aborted.',
                    route: getRouteTarget(),
                    isError: true
                });
            } catch (err) { }

            dispatch(clearUploadJob());
        };

        window.addEventListener('vault-upload-cancel', handleCancel);
        window.addEventListener('learning-upload-cancel', handleCancel);
        window.addEventListener('native_upload_cancel', handleCancel);

        return () => {
            window.removeEventListener('vault-upload-cancel', handleCancel);
            window.removeEventListener('learning-upload-cancel', handleCancel);
            window.removeEventListener('native_upload_cancel', handleCancel);
            if (uppyRef.current) {
                uppyRef.current.destroy();
                uppyRef.current = null;
            }
        };

    }, [isUploading, jobQueue, dispatch]);

    return null;
};

export default FloatingUploadManager;