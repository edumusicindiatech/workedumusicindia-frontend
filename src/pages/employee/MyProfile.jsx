import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    Mail, Phone, ShieldCheck, MapPin, School, Edit2,
    User, Camera, Loader2, Trash2, AlertCircle, Fingerprint, Download
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import ChangePasswordModal from "../../modals/admin/AdminChangePasswordModal";
import { useTranslation } from "react-i18next";
import { updateProfilePicture } from "../../store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// --- 1. SOCKET SETUP ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// --- 2. REFACTORED DELETE MODAL ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, loading }) => {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (loading) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button')) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };
    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) setDragOffset(delta);
    };
    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-200 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0' : 'opacity-100 backdrop-blur-sm animate-in fade-in'}`} onClick={handleClose}>
            <div
                className={`bg-card w-full max-w-sm rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40 z-20 rounded-t-[inherit]" />
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                <div className="p-6 md:p-8 text-center pt-6 md:pt-10">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-5 relative border border-destructive/20 shadow-inner">
                        <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping opacity-40" />
                        <Trash2 className="w-7 h-7 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-foreground mb-2 tracking-tight">{t('my_profile.delete_modal.title')}</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed px-2">
                        {t('my_profile.delete_modal.desc')}
                    </p>
                </div>

                <div className="bg-muted/10 p-5 border-t border-border/50 flex flex-col gap-2 rounded-b-3xl pb-safe">
                    <Button
                        onClick={onConfirm}
                        disabled={loading}
                        variant="destructive"
                        className="w-full h-12 text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-destructive/20 active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('my_profile.delete_modal.confirm')}
                    </Button>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="w-full h-12 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                    >
                        {t('my_profile.delete_modal.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MyProfile = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(true);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    const [localUser, setLocalUser] = useState(user || {});
    const [allottedLocation, setAllottedLocation] = useState(user?.zone || t('my_profile.unassigned_zone'));
    const [assignedSchools, setAssignedSchools] = useState(
        user?.assignments?.length > 0
            ? [...new Set(user.assignments.map(a => a.school?.schoolName || t('my_profile.unknown_school')))]
            : [t('my_profile.no_schools')]
    );

    const fetchFreshData = useCallback(async () => {
        try {
            const profileRes = await api.get('/employee/me/profile').catch(() => null);
            if (profileRes && profileRes.data.success) {
                const freshUser = profileRes.data.user;
                setLocalUser(freshUser);
                setAllottedLocation(freshUser.zone || t('my_profile.unassigned_zone'));
            }
            const schoolsRes = await api.get('/employee/assigned-schools');
            if (schoolsRes.data.success) {
                const schoolNames = [...new Set(schoolsRes.data.data.map(s => s.name))];
                setAssignedSchools(schoolNames.length > 0 ? schoolNames : [t('my_profile.no_schools')]);
            }
        } catch (error) {
            console.error("Failed to fetch fresh profile:", error);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchFreshData(); }, [fetchFreshData]);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);
        const handleRealTimeUpdate = () => fetchFreshData();
        socket.on("new_notification", handleRealTimeUpdate);
        return () => socket.off("new_notification", handleRealTimeUpdate);
    }, [user, fetchFreshData]);

    if (!user) return null;

    const handlePasswordChange = async (newPassword) => {
        setIsSubmitting(true);
        const toastId = toast.loading(t('my_profile.toasts.updating'));
        try {
            await api.put('/employee/profile/password', { newPassword });
            setIsPasswordModalOpen(false);
            toast.success(t('my_profile.toasts.success'), { id: toastId });
        } catch (error) {
            toast.error(error.response?.data?.message || t('my_profile.toasts.error'), { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error(t('my_profile.toasts.file_too_large'));

        setIsUploadingAvatar(true);
        const toastId = toast.loading(t('my_profile.toasts.uploading_avatar'));
        try {
            const extension = file.name.split('.').pop().toLowerCase();
            const presignRes = await api.post('/employee/profile-picture/presign', { fileType: file.type, extension });
            const { presignedUrl, publicUrl } = presignRes.data;
            await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            await api.put('/employee/profile-picture/confirm', { publicUrl });

            toast.success(t('my_profile.toasts.avatar_updated'), { id: toastId });
            dispatch(updateProfilePicture(publicUrl));
            fetchFreshData();
        } catch (error) {
            toast.error(t('my_profile.toasts.upload_failed'), { id: toastId });
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAvatar = async () => {
        setIsDeletingAvatar(true);
        const toastId = toast.loading(t('my_profile.toasts.removing_avatar'));
        try {
            const res = await api.delete('/employee/profile-picture');
            if (res.data.success) {
                toast.success(t('my_profile.toasts.avatar_removed'), { id: toastId });
                dispatch(updateProfilePicture(null));
                fetchFreshData();
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            toast.error(t('my_profile.toasts.remove_failed'), { id: toastId });
        } finally {
            setIsDeletingAvatar(false);
        }
    };

    // --- NEW: Handle Image Download with Cache-Busting ---
    const handleDownloadProfilePic = async (e) => {
        e.stopPropagation();
        const toastId = toast.loading(t('my_profile.toasts.downloading'));

        try {
            const ext = localUser.profilePicture.split('.').pop().split(/#|\?/)[0] || 'jpg';
            const safeName = localUser.name.replace(/\s+/g, '_');
            const fileName = `${safeName}_profile_pic.${ext}`;

            const noCacheUrl = `${localUser.profilePicture}?t=${new Date().getTime()}`;

            const response = await fetch(noCacheUrl, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(t('my_profile.toasts.download_success'), { id: toastId });
        } catch (err) {
            console.error("Failed to download image", err);
            toast.error(t('my_profile.toasts.download_failed'), { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-24 p-4">
                <div className="h-12 w-48 bg-muted rounded-2xl animate-pulse" />
                <div className="bg-card rounded-[2.5rem] h-96 animate-pulse border border-border/50" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24 p-4 sm:p-6 lg:p-8 mt-2 md:mt-0">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                    {t('my_profile.title')}
                </h1>
                <p className="text-muted-foreground font-medium text-sm sm:text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-primary/70" />
                    {t('my_profile.subtitle')}
                </p>
            </div>

            {/* Profile Card */}
            <div className="bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 p-6 md:p-10 relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000" />

                {/* Header Section: Avatar & Role */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 mb-10 pb-10 border-b border-border/50 relative z-10">
                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                        <div className="relative">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-4xl sm:text-5xl font-black shadow-2xl shadow-primary/30 border-4 border-background overflow-hidden relative group/avatar transition-transform hover:scale-[1.02]">
                                {localUser.profilePicture ? (
                                    <img
                                        src={localUser.profilePicture}
                                        alt={localUser.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span>{localUser.name?.charAt(0).toUpperCase() || "U"}</span>
                                )}
                                <div
                                    onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer text-white"
                                >
                                    {isUploadingAvatar ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
                                    <span className="text-[10px] font-bold uppercase mt-1 tracking-widest">{t('my_profile.change_pic')}</span>
                                </div>
                            </div>

                            {/* --- NEW: DOWNLOAD BUTTON (Top Left) --- */}
                            {localUser.profilePicture && (
                                <button
                                    onClick={handleDownloadProfilePic}
                                    className="absolute -top-2 -left-2 p-2 bg-primary text-primary-foreground rounded-2xl border-4 border-card shadow-lg hover:scale-110 active:scale-95 transition-all z-20"
                                    title={t('my_profile.download_pic')}
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            )}

                            {/* DELETE BUTTON (Top Right) */}
                            {localUser.profilePicture && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
                                    className="absolute -top-2 -right-2 p-2 bg-destructive text-white rounded-2xl border-4 border-card shadow-lg hover:scale-110 active:scale-95 transition-all z-20"
                                    title={t('my_profile.remove_pic')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}

                            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                        </div>

                        <div className="space-y-1.5">
                            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">{localUser.name}</h2>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                <span className="text-xs font-black bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest">
                                    {localUser.designation || t('my_profile.employee_fallback')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsPasswordModalOpen(true)}
                        variant="outline"
                        className="w-full sm:w-auto h-12 rounded-2xl gap-2 font-bold px-6 shadow-sm hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition-all"
                    >
                        <Edit2 className="w-4 h-4" />
                        <span>{t('my_profile.btn_edit_password')}</span>
                    </Button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-5">
                        <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <User className="w-4 h-4 text-primary/60" /> {t('my_profile.contact_info')}
                        </Label>
                        <div className="space-y-3">
                            <ProfileDetailItem icon={<Fingerprint className="text-indigo-500" />} label={t('my_profile.label_id')} value={localUser.employeeId} />
                            <ProfileDetailItem icon={<Mail className="text-blue-500" />} label={t('my_profile.label_email')} value={localUser.email} />
                            <ProfileDetailItem icon={<Phone className="text-emerald-500" />} label={t('my_profile.label_phone')} value={localUser.mobile || t('my_profile.not_provided')} />
                        </div>
                    </div>

                    <div className="space-y-5">
                        <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <MapPin className="w-4 h-4 text-primary/60" /> {t('my_profile.assignment_details')}
                        </Label>
                        <div className="space-y-3 h-full flex flex-col">
                            <ProfileDetailItem icon={<MapPin className="text-amber-500" />} label={t('my_profile.label_zone')} value={allottedLocation} />
                            <div className="flex items-start gap-4 p-5 rounded-3xl bg-muted/30 border border-border/50 transition-all hover:border-primary/20 flex-1 group/item">
                                <div className="p-3 bg-card rounded-2xl shrink-0 shadow-sm border border-border/50 group-hover/item:scale-110 transition-transform">
                                    <School className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mb-2.5">{t('my_profile.label_locations')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {assignedSchools.map((school, i) => (
                                            <span key={i} className="text-[11px] font-black bg-background text-foreground px-3 py-1.5 rounded-lg border border-border/60 shadow-sm uppercase tracking-wide truncate max-w-full">
                                                {school}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSubmit={handlePasswordChange}
                actionLoading={isSubmitting}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAvatar}
                loading={isDeletingAvatar}
            />
        </div>
    );
};

const ProfileDetailItem = ({ icon, label, value }) => (
    <div className="flex items-center gap-4 p-5 rounded-3xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all group/item">
        <div className="p-3 bg-card rounded-2xl shrink-0 shadow-sm border border-border/50 group-hover/item:scale-110 transition-transform">{icon}</div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm sm:text-base font-bold text-foreground truncate">{value}</p>
        </div>
    </div>
);

export default MyProfile;