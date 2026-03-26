import { useState } from "react";
// Removed useNavigate import since we don't need it here anymore
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/slices/authSlice";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield, Loader2, AlertCircle } from "lucide-react";

import api, { setAxiosToken } from "../api/axios";
import { Link } from "react-router-dom";

const Login = () => {
    const dispatch = useDispatch();

    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form States
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            const response = await api.post('/auth/login', { employeeId, password });
            const data = response.data;

            if (data.access_token) {
                setAxiosToken(data.access_token);

                const completeUser = data.user
                    ? { ...data.user, role: data.role, isFirstLogin: data.isFirstLogin }
                    : { role: data.role, isFirstLogin: data.isFirstLogin, name: "New User" };

                dispatch(setCredentials({
                    user: completeUser,
                    access_token: data.access_token
                }));
            }
        } catch (error) {
            console.error("Login Error:", error);

            // --- USER-FRIENDLY ERROR MAPPING ---
            let friendlyMessage = "Unable to sign in. Please try again.";

            if (!error.response) {
                // The request was made but no response was received (e.g., no internet, server is completely down)
                friendlyMessage = "Cannot connect to the server. Please check your internet connection.";
            } else {
                const status = error.response.status;
                const backendMsg = error.response.data?.message?.toLowerCase() || "";

                // Map specific status codes to friendly messages
                if (status === 400 || status === 401) {
                    friendlyMessage = "Incorrect Employee ID or password. Please try again.";

                    // Catch weird edge cases where a token error leaks through on login
                    if (backendMsg.includes("token") || backendMsg.includes("jwt")) {
                        friendlyMessage = "Authentication error. Please refresh the page and try again.";
                    }
                } else if (status === 403) {
                    friendlyMessage = "Your account has been restricted. Please contact your administrator.";
                } else if (status === 404) {
                    friendlyMessage = "Account not found. Please double-check your Employee ID.";
                } else if (status === 429) {
                    friendlyMessage = "Too many failed attempts. Please wait a few minutes and try again.";
                } else if (status >= 500) {
                    friendlyMessage = "We're experiencing technical difficulties on our end. Please try again later.";
                }
            }

            // Set the friendly message to your existing UI alert state
            setErrorMsg(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen bg-background font-sans">
            {/* Left Side: Modern Light/Brand Panel (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-primary/5 relative flex-col justify-center items-center p-12 overflow-hidden border-r border-border/40">
                {/* Subtle Abstract Background */}
                <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-5%] w-100 h-100 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-lg text-center animate-in fade-in slide-in-from-left-8 duration-700">
                    <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20">
                        <Shield className="w-10 h-10 text-primary-foreground" />
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-extrabold text-foreground tracking-tight mb-4 leading-tight">
                        WorkEduMusicIndia
                    </h1>

                    <p className="text-lg text-muted-foreground mb-10 font-medium">
                        Workforce Management & Compliance System
                    </p>

                    <div className="flex flex-wrap justify-center gap-3">
                        {["Attendance", "Compliance", "Reports"].map((label) => (
                            <span
                                key={label}
                                className="px-5 py-2.5 rounded-full text-sm font-bold text-foreground bg-background border border-border/60 shadow-sm"
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Clean Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">
                {/* Mobile ambient glow */}
                <div className="absolute top-0 right-0 w-75 h-75 bg-primary/10 rounded-full blur-[80px] pointer-events-none lg:hidden" />

                <div className="w-full max-w-100 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Mobile Branding */}
                    <div className="lg:hidden mb-10 text-center">
                        <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 shadow-sm">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">WorkForce Pro</h1>
                    </div>

                    {/* Form Header */}
                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Welcome back</h2>
                        <p className="text-muted-foreground font-medium">Please enter your credentials to sign in.</p>
                    </div>

                    {/* Error Display */}
                    {errorMsg && (
                        <div className="mb-8 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3.5 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 shadow-sm">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="font-bold text-sm leading-relaxed">{errorMsg}</p>
                        </div>
                    )}

                    {/* The Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="employeeId" className="text-sm font-bold text-foreground">Employee ID</Label>
                            <Input
                                id="employeeId"
                                type="text"
                                placeholder="e.g., EMP-2026"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                className="h-12 rounded-xl px-4 bg-muted/30 border-border/60 focus-visible:ring-primary/50 text-base font-medium shadow-sm transition-all"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-bold text-foreground">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
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
                            {isLoading ? "Authenticating..." : "Login"}
                        </Button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-border/40 text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                            Having trouble logging in? <br className="sm:hidden" />
                            <Link to="/contact-admin" className="text-primary font-bold hover:underline transition-colors ml-1">
                                Contact Administrator
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;