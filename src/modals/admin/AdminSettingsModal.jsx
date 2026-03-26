import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, X, Globe, Mail, Loader2, ShieldAlert } from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { setCredentials } from "../../store/slices/authSlice";

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

    useEffect(() => {
        if (isOpen && currentPreferences) {
            setSettings({
                language: currentPreferences.systemLanguage || "English",
                adminEmailNotifications: currentPreferences.globalAdminNotifications ?? true,
                employeeEmailNotifications: currentPreferences.globalEmployeeNotifications ?? true,
            });
        }
    }, [isOpen, currentPreferences]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const globalPayload = {
                globalEmployeeNotifications: settings.employeeEmailNotifications
            };

            if (isSuperAdmin) {
                globalPayload.globalAdminNotifications = settings.adminEmailNotifications;
            }

            const [globalResponse, personalResponse] = await Promise.all([
                api.put('/admin/settings/global', globalPayload),
                api.put('/employee/settings/preferences', { systemLanguage: settings.language })
            ]);

            if (globalResponse.data.success && personalResponse.data.success) {
                dispatch(setCredentials({
                    ...user,
                    preferences: personalResponse.data.preferences
                }));
                toast.success(t('admin_settings_modal.success_msg'));

                const langCode = settings.language === "हिन्दी (Hindi)" ? "hi" : "en";
                i18n.changeLanguage(langCode);

                if (onSaveSuccess) {
                    onSaveSuccess(globalResponse.data.data);
                }

                onClose();
            }
        } catch (error) {
            console.error("Save Settings Error:", error);
            toast.error(error.response?.data?.message || t('admin_settings_modal.error_msg'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-card flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <Settings className="w-5 h-5 text-primary" /> {t('admin_settings_modal.title')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* Language Preference */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" /> {t('admin_settings_modal.language_label')}
                        </Label>
                        <CustomSelect
                            options={["English", "हिन्दी (Hindi)"]}
                            value={settings.language}
                            onChange={(selectedValue) => setSettings({ ...settings, language: selectedValue })}
                        />
                        <p className="text-xs text-muted-foreground font-medium mt-1">{t('admin_settings_modal.language_help')}</p>
                    </div>

                    <div className="border-t border-border/60" />

                    {/* Admin Notifications (LOCKED FOR REGULAR ADMINS) */}
                    <div className="space-y-4">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            {t('admin_settings_modal.admin_notif_section')}
                            {!isSuperAdmin && <ShieldAlert className="w-4 h-4 text-destructive" />}
                        </Label>

                        <div className={`flex items-center justify-between p-4 rounded-xl border border-border transition-colors ${!isSuperAdmin ? 'bg-muted/50 opacity-70' : 'bg-muted/20 hover:bg-muted/40'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-foreground">{t('admin_settings_modal.email_notif_label')}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        {isSuperAdmin ? t('admin_settings_modal.admin_notif_help') : t('admin_settings_modal.admin_notif_locked')}
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
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">{t('admin_settings_modal.emp_notif_section')}</Label>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-foreground">{t('admin_settings_modal.email_notif_label')}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{t('admin_settings_modal.emp_notif_help')}</p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.employeeEmailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, employeeEmailNotifications: checked })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-muted/20 p-5 border-t border-border flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="font-semibold">{t('admin_settings_modal.cancel')}</Button>
                    <Button
                        className="gap-2 shadow-md shadow-primary/20 hover:shadow-primary/40 font-semibold w-36 transition-all"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin_settings_modal.save_changes')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsModal;