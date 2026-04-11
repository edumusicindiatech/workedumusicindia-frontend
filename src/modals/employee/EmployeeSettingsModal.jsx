import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, X, Globe, Mail, Loader2, CheckCircle2 } from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { updateUserPreferences } from "../../store/slices/authSlice";

const EmployeeSettingsModal = ({ isOpen, onClose }) => {
    const { user } = useSelector((state) => state.auth);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();

    const [settings, setSettings] = useState({
        language: "English",
        emailNotifications: true,
    });

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen && user?.preferences) {
            setSettings({
                language: user.preferences.systemLanguage || "English",
                emailNotifications: user.preferences.employeeNotifications ?? true,
            });
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (isSubmitting) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('[role="switch"]') || e.target.closest('.overflow-y-auto')) return;
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

    const handleSave = async () => {
        setIsSubmitting(true);
        const toastId = toast.loading(t('employee_settings.saving_toast', 'Saving preferences...'));

        try {
            const response = await api.put('/employee/settings/preferences', {
                systemLanguage: settings.language,
                employeeNotifications: settings.emailNotifications
            });

            if (response.data.success) {
                dispatch(updateUserPreferences(response?.data?.preferences));

                const langCode = settings.language === "हिन्दी (Hindi)" ? "hi" : "en";
                i18n.changeLanguage(langCode);

                toast.success(t('employee_settings.success_toast', 'Settings updated!'), { id: toastId });
                handleClose();
            }

        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error(error.response?.data?.message || t('employee_settings.error_toast', 'Failed to save settings'), { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleClose}>
            <div 
                className={`bg-card w-full max-w-md rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative max-h-[90vh] md:max-h-[85vh] overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="px-5 sm:px-6 pb-4 sm:pb-5 pt-2 md:pt-5 flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 pr-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                                    {t('employee_settings.title', 'App Settings')}
                                </h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                    {t('employee_settings.subtitle', 'Configure your experience')}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={isSubmitting} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-5 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* Language Preference */}
                    <div className="space-y-3 sm:space-y-4">
                        <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-primary/70 ml-1 flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('employee_settings.language_label', 'Display Language')}
                        </Label>

                        <div className="bg-muted/20 border border-border/60 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-sm">
                            <CustomSelect
                                options={["English", "हिन्दी (Hindi)"]}
                                value={settings.language}
                                onChange={(selectedValue) => setSettings({ ...settings, language: selectedValue })}
                                icon={Globe}
                            />
                        </div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground ml-1.5 sm:ml-2 leading-relaxed opacity-70">
                            {t('employee_settings.language_help', 'Changes the interface language. Requires a refresh.')}
                        </p>
                    </div>

                    <div className="border-t border-dashed border-border/60" />

                    {/* Notifications Preference */}
                    <div className="space-y-3 sm:space-y-4">
                        <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-primary/70 ml-1 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('employee_settings.notifications_section', 'Notifications & Alerts')}
                        </Label>

                        <div className="flex items-center justify-between p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-border/60 bg-muted/20 hover:border-primary/30 transition-colors shadow-sm group">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-card border border-border/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                                </div>
                                <div className="min-w-0 pr-2 sm:pr-4">
                                    <p className="font-extrabold text-sm text-foreground tracking-tight truncate">
                                        {t('employee_settings.email_notifications', 'Email Alerts')}
                                    </p>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 sm:mt-1 truncate">
                                        {t('employee_settings.notifications_help', 'Receive important updates via email.')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.emailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                                className="data-[state=checked]:bg-primary shrink-0 scale-90 sm:scale-100"
                            />
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row gap-3 rounded-b-3xl pb-safe">
                    <Button 
                        variant="ghost" 
                        onClick={handleClose} 
                        disabled={isSubmitting} 
                        className="w-full sm:flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold text-muted-foreground hover:bg-muted transition-colors"
                    >
                        {t('employee_settings.cancel', 'Cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="w-full sm:flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg sm:shadow-xl shadow-primary/20 active:scale-[0.98] transition-all gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                        {isSubmitting ? t('employee_settings.saving_toast', 'Saving...') : t('employee_settings.save_changes', 'Save Changes')}
                    </Button>
                </div>
                
            </div>
        </div>
    );
};

export default EmployeeSettingsModal;