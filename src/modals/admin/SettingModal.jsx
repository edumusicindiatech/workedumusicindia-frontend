import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, X, Globe, Mail } from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";

const SettingsModal = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState({
        language: "English",
        adminEmailNotifications: true,
        employeeEmailNotifications: true,
    });

    if (!isOpen) return null;

    const handleSave = () => {
        console.log("Saving admin settings:", settings);
        // Add API call to save settings here
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-card flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <Settings className="w-5 h-5 text-primary" /> Account Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto">

                    {/* Language Preference */}
                    <div className="space-y-3">
                        <Label className="text-base flex items-center gap-2">
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
                        <p className="text-xs text-muted-foreground">This changes the language of the admin dashboard interface.</p>
                    </div>

                    <div className="border-t border-border" />

                    {/* Admin Notifications */}
                    <div className="space-y-4">
                        <Label className="text-base">Admin Notifications</Label>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-foreground">Email Notifications</p>
                                    <p className="text-xs text-muted-foreground">Receive daily summaries and critical alerts</p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.adminEmailNotifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, adminEmailNotifications: checked })}
                            />
                        </div>
                    </div>

                    {/* Employee Notifications */}
                    <div className="space-y-4">
                        <Label className="text-base">Employee Notifications</Label>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-foreground">Email Notifications</p>
                                    <p className="text-xs text-muted-foreground">Employees receive updates and assignments via email</p>
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
                <div className="bg-muted/20 p-6 border-t border-border flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button className="gap-2 shadow-glow" onClick={handleSave}>
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;