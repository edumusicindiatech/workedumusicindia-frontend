import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldAlert, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast"; // <-- Added react-hot-toast import
import api from "../../api/axios";

const AdminResetPassword = () => {
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

            // Show Success Toast
            toast.success(response.data?.message || "Password updated successfully!");

            // Always push to Admin Dashboard on success
            navigate('/admin/dashboard');
        } catch (error) {
            console.error("Reset Error:", error);

            // Extract error message
            const errorMessage = error.response?.data?.message || "Failed to reset password.";

            // Show Error Toast & Inline Error
            setErrorMsg(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            {/* Added Toaster to render the notifications */}
            <Toaster position="top-right" />

            <div className="bg-card w-full max-w-md p-8 rounded-3xl shadow-xl border border-border animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
                    <ShieldAlert className="w-8 h-8 text-indigo-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Secure Admin Portal</h1>
                <p className="text-muted-foreground mb-6 text-sm">
                    As an Administrator, you must change your temporary password to a secure one before accessing the system.
                </p>

                {errorMsg && (
                    <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-start gap-3 animate-in fade-in">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="font-semibold text-sm leading-tight">{errorMsg}</p>
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">New Secure Password</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
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
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-indigo-500/70" /> Min 8 characters</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-indigo-500/70" /> 1 Uppercase & 1 Lowercase</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-indigo-500/70" /> 1 Number & 1 Symbol (!@#$)</li>
                        </ul>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {isLoading ? "Updating..." : "Update Password & Enter"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default AdminResetPassword;