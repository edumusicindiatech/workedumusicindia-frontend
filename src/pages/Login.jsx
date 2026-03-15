import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield } from "lucide-react";

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e) => {
        e.preventDefault();
        if (email.includes("admin")) {
            navigate("/admin");
        } else {
            navigate("/employee");
        }
    };

    return (
        <div className="flex min-h-screen">
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

            <div className="flex-1 flex items-center justify-center p-8 bg-card">
                <div className="w-full max-w-sm animate-fade-in">
                    <div className="lg:hidden mb-8 text-center">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">WorkForce Pro</h1>
                    </div>

                    <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
                    <p className="text-muted-foreground mb-8">Sign in to your account</p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 rounded-lg"
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

                        <Button type="submit" className="w-full h-11 rounded-lg text-base font-semibold shadow-glow">
                            Login
                        </Button>
                    </form>

                    <p className="text-xs text-muted-foreground text-center mt-8">
                        Hint: Use "admin@" for admin view, anything else for employee view
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
