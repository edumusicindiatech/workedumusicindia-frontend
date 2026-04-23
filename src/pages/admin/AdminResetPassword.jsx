import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldAlert, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next"; // <-- Added import

const AdminResetPassword = () => {
    const { t } = useTranslation(); // <-- Initialize hook
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const handleReset = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            const response = await api.post('/auth/reset-initial-password', { newPassword });

            toast.success(response.data?.message || t('admin_reset_password.success_default'));
            navigate('/admin/dashboard');
        } catch (error) {
            console.error("Reset Error:", error);
            const errorMessage = error.response?.data?.message || t('admin_reset_password.error_default');
            setErrorMsg(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">

            <div className="bg-card w-full max-w-md p-8 rounded-3xl shadow-xl border border-border animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
                    <ShieldAlert className="w-8 h-8 text-indigo-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">{t('admin_reset_password.title')}</h1>
                <p className="text-muted-foreground mb-6 text-sm">
                    {t('admin_reset_password.subtitle')}
                </p>

                {errorMsg && (
                    <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-start gap-3 animate-in fade-in">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="font-semibold text-sm leading-tight">{errorMsg}</p>
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('admin_reset_password.label_new_password')}</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('admin_reset_password.placeholder_new_password')}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="h-11 rounded-xl pr-10 focus-visible:ring-indigo-500"
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <ul className="text-xs text-muted-foreground mt-2 space-y-1 pl-1">
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-indigo-500/70" /> {t('admin_reset_password.requirement_min_chars')}</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-indigo-500/70" /> {t('admin_reset_password.requirement_case')}</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-indigo-500/70" /> {t('admin_reset_password.requirement_symbol')}</li>
                        </ul>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {isLoading ? t('admin_reset_password.btn_updating') : t('admin_reset_password.btn_submit')}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default AdminResetPassword;