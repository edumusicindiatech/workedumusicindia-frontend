import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../store/slices/authSlice";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield, Loader2, AlertCircle } from "lucide-react";

import api, { setAxiosToken } from "../../api/axios";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

// --- 1. NEW HELPER: GENERATE & STORE DEVICE ID ---
// This creates a permanent, unique ID for this specific browser/app installation
const getDeviceId = () => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
        // Fallback for older browsers if crypto.randomUUID is missing
        id = crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', id);
    }
    return id;
};

const Login = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form States
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");

    // --- BULLETPROOF LOGOUT TOAST LISTENER ---
    useEffect(() => {
        if (sessionStorage.getItem('justLoggedOut') === 'true') {
            sessionStorage.removeItem('justLoggedOut'); // Clean up immediately
            toast.remove(); // Instantly kill any lingering DOM wrappers

            // Slight delay ensures the Login page is fully mounted before popping the toast
            setTimeout(() => {
                toast.success(t('login.logout_success', 'Logged out successfully!'), {
                    duration: 3000
                });
            }, 150);
        }
    }, [t]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            // --- 2. ADD DEVICE ID TO PAYLOAD ---
            const deviceId = getDeviceId();
            const response = await api.post('/auth/login', { employeeId, password, deviceId });
            const data = response.data;

            if (data.access_token) {
                setAxiosToken(data.access_token);

                const completeUser = data.user
                    ? { ...data.user, role: data.role, isFirstLogin: data.isFirstLogin }
                    : { role: data.role, isFirstLogin: data.isFirstLogin, name: "New User" };

                // 1. Update global state (this triggers the redirect to dashboard and theme changes)
                dispatch(setCredentials({
                    user: completeUser,
                    access_token: data.access_token
                }));

                // 2. INSTANTLY destroy any existing toasts/invisible wrappers so the Profile button is clickable
                toast.remove();

                // 3. Wait 150ms for the new layout and Dark/Light theme to fully render, then fire ONE toast.
                setTimeout(() => {
                    if (data.role === 'admin') {
                        toast.success(t('login.success_admin', 'Admin logged in successfully!'), { duration: 3000 });
                    } else {
                        toast.success(t('login.success_employee', 'Logged in successfully!'), { duration: 3000 });
                    }
                }, 150);
            }
        } catch (error) {
            console.error("Login Error:", error);

            let friendlyMessage = t('login.errors.default');

            if (!error.response) {
                friendlyMessage = t('login.errors.no_server');
            } else {
                const status = error.response.status;
                const backendMsg = error.response.data?.message?.toLowerCase() || "";
                const rawBackendMsg = error.response.data?.message; // Keep exact casing for display

                if (status === 400 || status === 401) {
                    friendlyMessage = t('login.errors.invalid_creds');
                    if (backendMsg.includes("token") || backendMsg.includes("jwt")) {
                        friendlyMessage = t('login.errors.auth_error');
                    }
                } else if (status === 403) {
                    // --- 3. SHOW EXACT DEVICE ERROR MESSAGE ---
                    // Check if the backend error mentions "device" to show the specific translation
                    if (backendMsg.includes("device")) {
                        friendlyMessage = t('login.errors.device_mismatch');
                    } else {
                        friendlyMessage = t('login.errors.restricted');
                    }
                } else if (status === 404) {
                    friendlyMessage = t('login.errors.not_found');
                } else if (status === 429) {
                    friendlyMessage = t('login.errors.too_many_attempts');
                } else if (status >= 500) {
                    friendlyMessage = t('login.errors.server_error');
                }
            }

            setErrorMsg(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen bg-background font-sans">
            <div className="hidden lg:flex lg:w-1/2 bg-primary/5 relative flex-col justify-center items-center p-12 overflow-hidden border-r border-border/40">
                <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-5%] w-100 h-100 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-lg text-center animate-in fade-in slide-in-from-left-8 duration-700">
                    <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20">
                        <Shield className="w-10 h-10 text-primary-foreground" />
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-extrabold text-foreground tracking-tight mb-4 leading-tight">
                        {t('login.brand_name')}
                    </h1>

                    <p className="text-lg text-muted-foreground mb-10 font-medium">
                        {t('login.brand_subtitle')}
                    </p>

                    <div className="flex flex-wrap justify-center gap-3">
                        {["attendance", "compliance", "reports"].map((key) => (
                            <span
                                key={key}
                                className="px-5 py-2.5 rounded-full text-sm font-bold text-foreground bg-background border border-border/60 shadow-sm"
                            >
                                {t(`login.feature_${key}`)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">
                <div className="absolute top-0 right-0 w-75 h-75 bg-primary/10 rounded-full blur-[80px] pointer-events-none lg:hidden" />

                <div className="w-full max-w-100 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:hidden mb-10 text-center">
                        <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 shadow-sm">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{t('login.mobile_brand_name')}</h1>
                    </div>

                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">{t('login.welcome_back')}</h2>
                        <p className="text-muted-foreground font-medium">{t('login.credentials_hint')}</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-8 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3.5 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 shadow-sm">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="font-bold text-sm leading-relaxed">{errorMsg}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="employeeId" className="text-sm font-bold text-foreground">{t('login.label_employee_id')}</Label>
                            <Input
                                id="employeeId"
                                type="text"
                                placeholder={t('login.placeholder_employee_id')}
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                className="h-12 rounded-xl px-4 bg-muted/30 border-border/60 focus-visible:ring-primary/50 text-base font-medium shadow-sm transition-all"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-bold text-foreground">{t('login.label_password')}</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t('login.placeholder_password')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 rounded-xl px-4 pr-12 bg-muted/30 border-border/60 focus-visible:ring-primary/50 text-base font-medium tracking-wide shadow-sm transition-all"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none p-1.5 rounded-md"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 mt-4 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            {isLoading ? t('login.btn_authenticating') : t('login.btn_login')}
                        </Button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-border/40 text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                            {t('login.footer_trouble')} <br className="sm:hidden" />
                            <Link to="/contact-admin" className="text-primary font-bold hover:underline transition-colors ml-1">
                                {t('login.footer_contact')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;