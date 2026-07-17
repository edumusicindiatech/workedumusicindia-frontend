import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux"; // Added
import { setCredentials } from "../../store/slices/authSlice"; // Added

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck, Loader2, AlertCircle, CheckCircle2, LockKeyhole } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

const EmployeeResetPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch(); // Added
    const token = useSelector((state) => state.auth.token); // Added: Grab current token

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const handleReset = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            // 1. Update the password
            const response = await api.post('/auth/reset-initial-password', { newPassword });

            // 2. Fetch the fresh user profile now that they are fully authenticated
            const profileRes = await api.get('/employee/me/profile');

            // 3. Hydrate Redux with the user data before navigating
            if (profileRes.data.success) {
                dispatch(setCredentials({
                    user: profileRes.data.user,
                    access_token: token
                }));
            }

            toast.success(response.data?.message || t('employee_reset_password.toast_success', 'Password updated successfully!'));

            // 4. Navigate to dashboard safely (Redux is now populated!)
            navigate('/employee/dashboard');

        } catch (error) {
            console.error("Reset Error:", error);
            const errorMessage = error.response?.data?.message || t('employee_reset_password.error_default', 'An error occurred during password reset.');

            setErrorMsg(errorMessage);
            toast.error(errorMessage);

        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">

            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="bg-card w-full max-w-88 sm:max-w-105 rounded-4xl sm:rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-border/60 animate-in zoom-in-95 fade-in duration-500 relative overflow-hidden flex flex-col">

                <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40" />

                <div className="p-6 sm:p-8 md:p-10 flex flex-col items-center text-center pb-5 sm:pb-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 border border-primary/20 shadow-inner relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-2xl sm:rounded-3xl animate-ping opacity-40" />
                        <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-primary relative z-10" />
                    </div>

                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight mb-1.5 sm:mb-2 uppercase">
                        {t('employee_reset_password.title', 'Secure Account')}
                    </h1>
                    <p className="text-[10px] sm:text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-[16rem] sm:max-w-70 leading-relaxed">
                        {t('employee_reset_password.subtitle', 'Please set a new password to continue')}
                    </p>
                </div>

                <div className="p-6 sm:p-8 md:p-10 pt-0 flex-1">

                    {errorMsg && (
                        <div className="mb-4 sm:mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                            <p className="font-bold text-[10px] sm:text-xs md:text-sm leading-snug">{errorMsg}</p>
                        </div>
                    )}

                    <form onSubmit={handleReset} className="space-y-5 sm:space-y-8">
                        <div className="space-y-2.5 sm:space-y-3">
                            <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/70 ml-1">
                                {t('employee_reset_password.label_new_password', 'New Password')}
                            </Label>

                            <div className="relative group">
                                <LockKeyhole className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-4.5 sm:h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t('employee_reset_password.placeholder_new_password', 'Enter new password')}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-12 sm:h-14 pl-10 sm:pl-11 pr-10 sm:pr-12 rounded-xl sm:rounded-2xl bg-muted/20 border-border/60 focus-visible:ring-primary/30 text-xs sm:text-sm font-bold tracking-wide"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Eye className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                                </button>
                            </div>

                            <div className="bg-muted/30 border border-border/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 mt-3 sm:mt-4 shadow-sm">
                                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 sm:mb-2.5 ml-1">Password Requirements</p>
                                <ul className="text-[10px] sm:text-[11px] font-bold text-foreground/80 space-y-1.5 sm:space-y-2">
                                    <li className="flex items-center gap-2 sm:gap-2.5">
                                        <CheckCircle2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${newPassword.length >= 8 ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                                        {t('employee_reset_password.req_min_chars', 'At least 8 characters')}
                                    </li>
                                    <li className="flex items-center gap-2 sm:gap-2.5">
                                        <CheckCircle2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                                        {t('employee_reset_password.req_case', 'Uppercase & lowercase letters')}
                                    </li>
                                    <li className="flex items-center gap-2 sm:gap-2.5">
                                        <CheckCircle2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${/[\W_]/.test(newPassword) ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                                        {t('employee_reset_password.req_symbol', 'At least one special symbol')}
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || newPassword.length < 8}
                            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : null}
                            {isLoading ? t('employee_reset_password.btn_updating', 'Updating...') : t('employee_reset_password.btn_continue', 'Update Password')}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EmployeeResetPassword;