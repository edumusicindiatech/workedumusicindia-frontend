// FloatingUploadManager.jsx
import { useEffect, useRef, useState } from 'react';
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

        const { files, metadata } = jobQueue;
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
                const res = await api.post('/employee/media/multipart/create', { filename: file.name, type: file.type, metadata });
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
            window.dispatchEvent(new CustomEvent('vault-upload-progress', { detail: percent }));
        });

        uppy.on('upload-success', (file, response) => {
            successfulUploadsRef.current.push({ url: response.uploadURL, fileType: 'video' });
        });

        uppy.on('complete', async (result) => {
            if (result.failed.length > 0) {
                // Broadcast error
                window.dispatchEvent(new CustomEvent('vault-upload-error', { detail: "Upload failed. Please check network." }));
                dispatch(clearUploadJob());
                return;
            }

            try {
                await api.post('/employee/media/save-log', {
                    ...metadata,
                    uploadedFiles: successfulUploadsRef.current
                });

                // 🔥 Broadcast Success!
                window.dispatchEvent(new CustomEvent('vault-upload-success'));

            } catch (err) {
                // Broadcast Database Error
                window.dispatchEvent(new CustomEvent('vault-upload-error', { detail: "Uploaded, but failed to save to database." }));
            } finally {
                dispatch(clearUploadJob());
                window.dispatchEvent(new Event('refreshMediaGallery'));

                if (uppyRef.current) {
                    uppyRef.current.destroy();
                    uppyRef.current = null;
                }
            }
        });
        files.forEach(file => uppy.addFile({ name: file.name, type: file.type, data: file }));
        uppyRef.current = uppy;

        // 🔥 NEW: The Kill Switch Listener
        const handleCancel = () => {
            if (uppyRef.current) {
                uppyRef.current.cancelAll(); // This tells Cloudflare to delete the chunks!
                uppyRef.current.destroy();
                uppyRef.current = null;
            }
            dispatch(clearUploadJob()); // This removes the Ghost Card from the UI
        };
        window.addEventListener('vault-upload-cancel', handleCancel);

        return () => {
            window.removeEventListener('vault-upload-cancel', handleCancel);
            if (uppyRef.current) {
                uppyRef.current.destroy();
                uppyRef.current = null;
            }
        };

    }, [isUploading, jobQueue, dispatch]);

    // 🔥 NO UI. THIS COMPONENT IS NOW A GHOST.
    return null;
};

export default FloatingUploadManager;