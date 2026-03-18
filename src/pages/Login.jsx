import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/slices/authSlice";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield, Loader2, AlertCircle } from "lucide-react";

// Combine the default api import and the named setAxiosToken import
import api, { setAxiosToken } from "../api/axios";

const Login = () => {
    const navigate = useNavigate();
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
                // 1. Immediately inject token into Axios for subsequent requests
                setAxiosToken(data.access_token);

                // 2. Save directly to Redux memory ONLY (Zero localStorage involved!)
                dispatch(setCredentials({
                    user: data.user || null,
                    access_token: data.access_token
                }));

                // 3. Handle First Login Password Reset Routing
                if (data.isFirstLogin) {
                    navigate("/employee");
                    return;
                }

                // 4. Standard Role-Based Routing
                const adminRoles = ['Admin1', 'Admin2', 'Admin3', 'admin'];
                if (adminRoles.includes(data.role)) {
                    navigate("/admin");
                } else {
                    navigate("/employee");
                }
            }
        } catch (error) {
            console.error("Login Error:", error);
            setErrorMsg(error.response?.data?.message || "Invalid credentials. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Left Side: Hero / Branding */}
            <div className="hidden lg:flex lg:w-1/2 gradient-hero relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: `${200 + i * 100}px`,
                                height: `${200 + i * 100}px`,
                                top: `${10 + i * 15}%`,
                                left: `${10 + i * 10}%`,
                                background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)`,
                            }}
                        />
                    ))}
                </div>
                <div className="glass rounded-2xl p-10 max-w-md text-center z-10 animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold text-primary-foreground mb-3">WorkForce Pro</h1>
                    <p className="text-primary-foreground/80 text-lg">
                        Workforce Management & Compliance System
                    </p>
                    <div className="mt-8 flex gap-3 justify-center">
                        {["Attendance", "Compliance", "Reports"].map((label) => (
                            <span
                                key={label}
                                className="px-3 py-1.5 rounded-full text-xs font-medium glass"
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-card relative">
                <div className="w-full max-w-sm animate-fade-in">

                    {/* Mobile Branding */}
                    <div className="lg:hidden mb-8 text-center">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">WorkForce Pro</h1>
                    </div>

                    <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
                    <p className="text-muted-foreground mb-6">Sign in to your account to continue</p>

                    {/* Error Display */}
                    {errorMsg && (
                        <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="font-semibold text-sm">{errorMsg}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="employeeId" className="text-sm font-medium">Employee ID</Label>
                            <Input
                                id="employeeId"
                                type="text"
                                placeholder="e.g., EMP-2026"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                className="h-11 rounded-lg"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 rounded-lg pr-10"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 rounded-lg text-base font-semibold shadow-glow flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            {isLoading ? "Authenticating..." : "Login"}
                        </Button>
                    </form>

                    <p className="text-xs text-muted-foreground text-center mt-8">
                        Having trouble logging in? Contact your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;