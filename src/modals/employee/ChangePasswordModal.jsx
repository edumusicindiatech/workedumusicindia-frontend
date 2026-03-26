import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next"; // <-- Added import

const ChangePasswordModal = ({ isOpen, onClose, onSubmit, actionLoading }) => {
    const { t } = useTranslation(); // <-- Initialize hook
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswords(false);
            setErrorMsg("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        setErrorMsg("");
        if (newPassword !== confirmPassword) {
            setErrorMsg(t('change_password_modal.error_mismatch'));
            return;
        }
        if (newPassword.length < 6) {
            setErrorMsg(t('change_password_modal.error_length'));
            return;
        }

        onSubmit(newPassword);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card border border-border shadow-2xl w-full max-w-md rounded-2xl flex flex-col animate-in zoom-in-95 fade-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{t('change_password_modal.title')}</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">{t('change_password_modal.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 flex-1">
                    {errorMsg && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">{t('change_password_modal.label_new')}</label>
                            <input
                                type={showPasswords ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">{t('change_password_modal.label_confirm')}</label>
                            <input
                                type={showPasswords ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                            >
                                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {showPasswords ? t('change_password_modal.hide') : t('change_password_modal.show')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/10 shrink-0 flex gap-3">
                    <Button variant="ghost" className="flex-1 h-11 rounded-xl font-semibold" onClick={onClose}>
                        {t('change_password_modal.cancel')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!newPassword || !confirmPassword || actionLoading}
                        className="flex-1 h-11 rounded-xl font-bold shadow-glow"
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('change_password_modal.update')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;