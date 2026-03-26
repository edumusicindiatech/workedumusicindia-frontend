import { useState, useEffect } from "react";
import { useSelector } from "react-redux"; // <-- Imported useSelector
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, X, Globe, Mail, Loader2, ShieldAlert } from "lucide-react"; // <-- Added ShieldAlert icon
import CustomSelect from "../../components/ui/CustomSelect";
import toast from "react-hot-toast";
import api from "../../api/axios";

const AdminSettingsModal = ({ isOpen, onClose, currentPreferences, onSaveSuccess }) => {
    // 👇 Get the logged-in user's role to enforce SuperAdmin rules
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === 'SuperAdmin';

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
                // Map the incoming props to the state
                adminEmailNotifications: currentPreferences.globalAdminNotifications ?? true,
                employeeEmailNotifications: currentPreferences.globalEmployeeNotifications ?? true,
            });
        }
    }, [isOpen, currentPreferences]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 👇 1. Build the base payload that ALL admins are allowed to send
            const payload = {
                systemLanguage: settings.language,
                globalEmployeeNotifications: settings.employeeEmailNotifications
            };

            // 👇 2. Only attach the Admin switch if they are a SuperAdmin
            if (isSuperAdmin) {
                payload.globalAdminNotifications = settings.adminEmailNotifications;
            }

            // Send the smart payload
            const response = await api.put('/admin/settings/global', payload);

            if (response.data.success) {
                toast.success("Global preferences updated successfully!");
                if (onSaveSuccess) {
                    onSaveSuccess(response.data.data);
                }
                onClose();
            }
        } catch (error) {
            console.error("Save Settings Error:", error);
            toast.error(error.response?.data?.message || "Failed to save settings.");
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
                        <Settings className="w-5 h-5 text-primary" /> Global Settings
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
                            <Globe className="w-4 h-4 text-muted-foreground" /> System Language
                        </Label>
                        <CustomSelect
                            options={["English", "हिन्दी (Hindi)"]}
                            value={settings.language}
                            onChange={(selectedValue) => setSettings({ ...settings, language: selectedValue })}
                        />
                        <p className="text-xs text-muted-foreground font-medium mt-1">This changes the language of the admin dashboard interface.</p>
                    </div>

                    <div className="border-t border-border/60" />

                    {/* Admin Notifications (LOCKED FOR REGULAR ADMINS) */}
                    <div className="space-y-4">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            Admin Notifications
                            {!isSuperAdmin && <ShieldAlert className="w-4 h-4 text-destructive" />}
                        </Label>

                        <div className={`flex items-center justify-between p-4 rounded-xl border border-border transition-colors ${!isSuperAdmin ? 'bg-muted/50 opacity-70' : 'bg-muted/20 hover:bg-muted/40'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-foreground">Email Notifications</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        {isSuperAdmin ? "Receive daily summaries and critical alerts" : "Locked: Only SuperAdmins can toggle this."}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.adminEmailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, adminEmailNotifications: checked })}
                                disabled={!isSuperAdmin} // 👇 Disables the switch if they aren't SuperAdmin
                            />
                        </div>
                    </div>

                    {/* Employee Notifications (OPEN TO ALL ADMINS) */}
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">Employee Notifications</Label>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-foreground">Email Notifications</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Employees receive updates and assignments via email</p>
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
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="font-semibold">Cancel</Button>
                    <Button
                        className="gap-2 shadow-md shadow-primary/20 hover:shadow-primary/40 font-semibold w-36 transition-all"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsModal;