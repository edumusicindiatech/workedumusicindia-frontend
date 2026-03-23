import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, X, Globe, Mail, Loader2 } from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";
import { toast } from "sonner";
import axios from "axios"; // or import api from "../../api/axios" if you use interceptors

const EmployeeSettingsModal = ({ isOpen, onClose }) => {
    const { user, token } = useSelector((state) => state.auth);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [settings, setSettings] = useState({
        language: "English",
        emailNotifications: true,
    });

    // Populate form with existing user data when modal opens
    useEffect(() => {
        if (isOpen && user?.preferences) {
            setSettings({
                language: user.preferences.systemLanguage || "English",
                // Fallback to true if undefined
                emailNotifications: user.preferences.employeeNotifications ?? true,
            });
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSubmitting(true);
        const toastId = toast.loading("Saving preferences...");

        try {
            await axios.put('/api/employee/settings/preferences', {
                systemLanguage: settings.language,
                employeeNotifications: settings.emailNotifications
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Preferences updated successfully!", { id: toastId });

            // Close modal after success
            onClose();

            // Note: If your app requires the UI to immediately reflect the new language/settings 
            // across all components, you might want to dispatch a Redux action here to update 
            // the user object in your store (e.g., dispatch(updateUserPreferences(response.data.preferences))).

        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error(error.response?.data?.message || "Failed to update preferences.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-card flex items-center justify-between p-6 border-b border-border shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <Settings className="w-5 h-5 text-primary" /> Account Settings
                    </h2>
                    <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border disabled:opacity-50">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar flex-1">

                    {/* Language Preference */}
                    <div className="space-y-3">
                        <Label className="text-base flex items-center gap-2 font-semibold">
                            <Globe className="w-4 h-4 text-muted-foreground" /> System Language
                        </Label>
                        <CustomSelect
                            options={[
                                "English",
                                "हिन्दी (Hindi)",
                                "Español (Spanish)",
                                "Français (French)"
                            ]}
                            value={settings.language}
                            onChange={(selectedValue) => setSettings({ ...settings, language: selectedValue })}
                        />
                        <p className="text-xs text-muted-foreground">This changes the language of your application interface.</p>
                    </div>

                    <div className="border-t border-border" />

                    {/* Notifications Preference */}
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">Notifications</Label>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-foreground">Email Notifications</p>
                                    <p className="text-xs text-muted-foreground">Receive updates, tasks, and assignments via email</p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.emailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-muted/10 p-6 border-t border-border flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl font-semibold flex-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="gap-2 shadow-glow rounded-xl font-bold flex-1"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSettingsModal;