import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, X, Globe, Mail, Loader2, ShieldAlert, Save, BellRing } from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { setCredentials, updateUserPreferences } from "../../store/slices/authSlice";

const AdminSettingsModal = ({ isOpen, onClose, currentPreferences, onSaveSuccess }) => {
    const { t, i18n } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === 'SuperAdmin';
    const dispatch = useDispatch();

    const [settings, setSettings] = useState({
        language: "English",
        adminEmailNotifications: true,
        employeeEmailNotifications: true,
    });
    const [isSaving, setIsSaving] = useState(false);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen && currentPreferences) {
            setSettings({
                language: currentPreferences.systemLanguage || "English",
                adminEmailNotifications: currentPreferences.globalAdminNotifications ?? true,
                employeeEmailNotifications: currentPreferences.globalEmployeeNotifications ?? true,
            });
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen, currentPreferences]);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; setIsDragging(true); };
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

    // --- API HANDLER ---
    const handleSave = async () => {
        setIsSaving(true);
        const loadingToast = toast.loading(t('admin_settings_modal.saving', 'Saving Settings...'));
        
        try {
            const globalPayload = {
                globalEmployeeNotifications: settings.employeeEmailNotifications
            };

            const personalPayload = {
                systemLanguage: settings.language,
                employeeNotifications: settings.employeeEmailNotifications
            };

            if (isSuperAdmin) {
                globalPayload.globalAdminNotifications = settings.adminEmailNotifications;
                personalPayload.adminNotifications = settings.adminEmailNotifications;
            }

            const [globalResponse, personalResponse] = await Promise.all([
                api.put('/admin/settings/global', globalPayload),
                api.put('/employee/settings/preferences', personalPayload)
            ]);

            if (globalResponse.data.success && personalResponse.data.success) {
                dispatch(updateUserPreferences(personalResponse.data.preferences));
                toast.success(t('admin_settings_modal.success_msg', 'Settings applied successfully'), { id: loadingToast });

                const langCode = settings.language === "हिन्दी (Hindi)" ? "hi" : "en";
                i18n.changeLanguage(langCode);

                if (onSaveSuccess) {
                    onSaveSuccess(globalResponse.data.data);
                }

                handleClose();
            }
        } catch (error) {
            console.error("Save Settings Error:", error);
            toast.error(error.response?.data?.message || t('admin_settings_modal.error_msg', 'Failed to save settings'), { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={!isSaving ? handleClose : undefined}>
            <div 
                className={`bg-card w-full max-w-lg rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} 
                style={{ transform: `translateY(${dragOffset}px)` }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Top Border Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
                    </div>
                    
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <Settings className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground line-clamp-1 tracking-tight">
                                    {t('admin_settings_modal.title', 'System Settings')}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                    {t('admin_settings_modal.subtitle', 'Manage global and personal preferences')}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={isSaving} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar bg-card">

                    {/* Language Preference */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('admin_settings_modal.language_label', 'System Language')}</Label>
                        <CustomSelect
                            options={["English", "हिन्दी (Hindi)"]}
                            value={settings.language}
                            onChange={(selectedValue) => setSettings({ ...settings, language: selectedValue })}
                            icon={Globe}
                        />
                        <p className="text-xs text-muted-foreground font-medium italic ml-1">
                            {t('admin_settings_modal.language_help', 'Changes take effect immediately upon saving.')}
                        </p>
                    </div>

                    <div className="border-t border-border/60" />

                    {/* Admin Notifications (LOCKED FOR REGULAR ADMINS) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1 mb-1">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">{t('admin_settings_modal.admin_notif_section', 'Admin Alerts')}</Label>
                            {!isSuperAdmin && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">
                                    <ShieldAlert className="w-3 h-3" /> Locked
                                </span>
                            )}
                        </div>

                        <div className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${!isSuperAdmin ? 'bg-muted/30 border-border/40 opacity-80' : 'bg-card border-border/80 hover:border-primary/40 hover:shadow-md'}`}>
                            <div className="flex items-center gap-4 pr-4">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${!isSuperAdmin ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                                    <BellRing className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="font-extrabold text-sm sm:text-base text-foreground leading-tight">{t('admin_settings_modal.email_notif_label', 'Global Email Alerts')}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-1 leading-snug">
                                        {isSuperAdmin ? t('admin_settings_modal.admin_notif_help', 'Receive emails for critical system actions.') : t('admin_settings_modal.admin_notif_locked', 'Only SuperAdmins can modify global alerts.')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.adminEmailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, adminEmailNotifications: checked })}
                                disabled={!isSuperAdmin}
                            />
                        </div>
                    </div>

                    {/* Employee Notifications (OPEN TO ALL ADMINS) */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('admin_settings_modal.emp_notif_section', 'Employee Alerts')}</Label>

                        <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-4 pr-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="font-extrabold text-sm sm:text-base text-foreground leading-tight">{t('admin_settings_modal.email_notif_label', 'Global Email Alerts')}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-1 leading-snug">
                                        {t('admin_settings_modal.emp_notif_help', 'Send email notifications to employees for assignments and updates.')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.employeeEmailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, employeeEmailNotifications: checked })}
                            />
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-end gap-3 rounded-b-4xl pb-safe">
                    <Button 
                        variant="ghost" 
                        onClick={handleClose} 
                        disabled={isSaving} 
                        className="w-full sm:w-auto h-12 rounded-xl font-bold text-muted-foreground border-border/80 hover:bg-muted transition-colors flex-1 sm:flex-none"
                    >
                        {t('admin_settings_modal.cancel', 'Cancel')}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="w-full sm:w-auto h-12 sm:px-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] flex-2 sm:flex-none"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} 
                        {isSaving ? t('admin_settings_modal.saving', 'Saving...') : t('admin_settings_modal.save_changes', 'Save Changes')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsModal;