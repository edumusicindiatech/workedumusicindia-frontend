import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Mail, Phone, ShieldCheck, MapPin, School, Edit2, User, Camera, Loader2, Trash2, AlertCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import ChangePasswordModal from "../../modals/employee/ChangePasswordModal";
import { useTranslation } from "react-i18next";
import { updateProfilePicture } from "../../store/slices/authSlice";

// --- 1. SOCKET SETUP OUTSIDE COMPONENT ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

// --- 2. PRETTY DELETE MODAL COMPONENT ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, loading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card dark:bg-[#181d29] border border-border dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                        <AlertCircle className="w-7 h-7 text-destructive" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-foreground">Remove Picture?</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            This will delete your profile picture permanently and revert to your initials.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Remove"}
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

    // Modal & Action States
    const [loading, setLoading] = useState(true);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // 🔥 New Modal State
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Avatar Upload/Delete States
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    // Local Data States
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

    useEffect(() => {
        fetchFreshData();
    }, [fetchFreshData]);

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
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('my_profile.toasts.file_too_large'));
            return;
        }
        setIsUploadingAvatar(true);
        // 👇 UPDATED: Using translation key
        const toastId = toast.loading(t('my_profile.toasts.uploading_avatar'));
        try {
            const extension = file.name.split('.').pop().toLowerCase();
            const presignRes = await api.post('/employee/profile-picture/presign', {
                fileType: file.type,
                extension
            });
            const { presignedUrl, publicUrl } = presignRes.data;
            await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            await api.put('/employee/profile-picture/confirm', { publicUrl });

            // 👇 UPDATED: Using translation key
            toast.success(t('my_profile.toasts.avatar_updated'), { id: toastId });
            dispatch(updateProfilePicture(publicUrl));
            fetchFreshData();
        } catch (error) {
            // 👇 UPDATED: Added a translation key for errors
            toast.error(t('my_profile.toasts.upload_failed'), { id: toastId });
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAvatar = async () => {
        setIsDeletingAvatar(true);
        const toastId = toast.loading("Removing avatar...");
        try {
            const res = await api.delete('/employee/profile-picture');
            if (res.data.success) {
                toast.success("Avatar removed!", { id: toastId });
                dispatch(updateProfilePicture(null));
                fetchFreshData();
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            toast.error("Failed to remove avatar", { id: toastId });
        } finally {
            setIsDeletingAvatar(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-24 p-4">
                <div className="h-9 w-48 bg-muted rounded-lg animate-pulse" />
                <div className="bg-card rounded-3xl h-96 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 p-4 sm:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                    <User className="w-7 h-7 text-primary hidden sm:block" />
                    {t('my_profile.title')}
                </h1>
                <p className="text-muted-foreground mt-1.5 sm:ml-10 text-sm sm:text-base">{t('my_profile.subtitle')}</p>
            </div>

            <div className="bg-card rounded-3xl shadow-sm border border-border/60 p-6 md:p-8 relative overflow-hidden h-full group">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8 pb-8 relative z-10 border-b border-border/60">
                    <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                        <div className="relative group/avatar shrink-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-2xl sm:text-3xl font-extrabold shadow-lg shadow-primary/20 border-4 border-background overflow-hidden relative">
                                {localUser.profilePicture ? (
                                    <img src={localUser.profilePicture} alt={localUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{localUser.name?.charAt(0).toUpperCase() || "U"}</span>
                                )}
                                <div
                                    onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                                >
                                    {isUploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                                </div>
                            </div>

                            {localUser.profilePicture && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
                                    className="absolute -top-1 -right-1 p-1.5 bg-destructive text-destructive-foreground rounded-full border-2 border-background shadow-md hover:scale-110 transition-transform z-20"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}

                            <button
                                onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-md hover:scale-110 transition-transform z-10"
                            >
                                {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            </button>

                            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground truncate leading-tight">{localUser.name}</h2>
                            <p className="text-xs sm:text-sm font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full w-fit mt-2 uppercase tracking-wide">
                                {localUser.designation || t('my_profile.employee_fallback')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-background hover:bg-primary/5 text-foreground hover:text-primary border border-border hover:border-primary/30 rounded-xl transition-all font-bold text-sm shadow-sm active:scale-95"
                    >
                        <Edit2 className="w-4 h-4" />
                        <span>{t('my_profile.btn_edit_password')}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">
                    <div className="space-y-5">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary/70" /> {t('my_profile.contact_info')}
                        </h3>
                        <div className="space-y-3">
                            <ProfileDetailItem icon={<ShieldCheck className="text-primary/80" />} label={t('my_profile.label_id')} value={localUser.employeeId} />
                            <ProfileDetailItem icon={<Mail className="text-blue-500/80" />} label={t('my_profile.label_email')} value={localUser.email} />
                            <ProfileDetailItem icon={<Phone className="text-emerald-500/80" />} label={t('my_profile.label_phone')} value={localUser.mobile || t('my_profile.not_provided')} />
                        </div>
                    </div>

                    <div className="space-y-5">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary/70" /> {t('my_profile.assignment_details')}
                        </h3>
                        <div className="space-y-3 h-full flex flex-col">
                            <ProfileDetailItem icon={<MapPin className="text-amber-500/80" />} label={t('my_profile.label_zone')} value={allottedLocation} />
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 transition-colors flex-1">
                                <div className="p-2.5 bg-background rounded-xl shrink-0 shadow-sm border border-border/50 mt-1">
                                    <School className="w-5 h-5 text-indigo-500/80" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-2.5">{t('my_profile.label_locations')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {assignedSchools.map((school, i) => (
                                            <span key={i} className="text-xs font-bold bg-background text-foreground px-3 py-1.5 rounded-lg border border-border/60 shadow-sm transition-colors">{school}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSubmit={handlePasswordChange} actionLoading={isSubmitting} />

            {/* 🔥 Custom Beautiful Delete Dialog */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAvatar}
                loading={isDeletingAvatar}
            />
        </div>
    );
};

// Simple reusable sub-component for layout clean-up
const ProfileDetailItem = ({ icon, label, value }) => (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
        <div className="p-2.5 bg-background rounded-xl shrink-0 shadow-sm border border-border/50">{icon}</div>
        <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm sm:text-base font-bold text-foreground truncate">{value}</p>
        </div>
    </div>
);

export default MyProfile;