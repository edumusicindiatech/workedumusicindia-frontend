import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, Loader2, X, AlertCircle, KeyRound, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

const AdminChangePasswordModal = ({ isOpen, onClose, onSubmit, actionLoading }) => {
    const { t } = useTranslation();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswords(false);
            setErrorMsg("");
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (actionLoading) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) setDragOffset(delta);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorMsg("");
        
        if (newPassword !== confirmPassword) {
            setErrorMsg(t('change_password_modal.error_mismatch', 'Passwords do not match'));
            return;
        }
        if (newPassword.length < 6) {
            setErrorMsg(t('change_password_modal.error_length', 'Password must be at least 6 characters'));
            return;
        }

        onSubmit(newPassword);
    };

    return (
        <div className={`fixed inset-0 z-250 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={handleClose}>
            <div 
                className={`bg-card w-full max-w-md rounded-t-[2.5rem] md:rounded-3xl shadow-2xl border-t md:border border-border/50 flex flex-col relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} 
                style={{ transform: `translateY(${dragOffset}px)` }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
                    </div>
                    
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <KeyRound className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-foreground tracking-tight line-clamp-1">
                                    {t('change_password_modal.title', 'Security Update')}
                                </h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                    {t('change_password_modal.subtitle', 'Change your password')}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={actionLoading} className="p-2 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    {errorMsg && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wide animate-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    <form id="change-password-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2.5">
                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1">
                                {t('change_password_modal.label_new', 'New Password')}
                            </Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground/70">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <Input
                                    type={showPasswords ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-12 rounded-2xl pl-11 pr-11 bg-muted/20 border-border/60 focus-visible:ring-primary/30"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1">
                                {t('change_password_modal.label_confirm', 'Confirm Password')}
                            </Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground/70">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <Input
                                    type={showPasswords ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-12 rounded-2xl pl-11 pr-11 bg-muted/20 border-border/60 focus-visible:ring-primary/30"
                                    required
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition-all"
                                >
                                    {showPasswords ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* FOOTER */}
                <div className="p-4 md:p-6 border-t border-border/50 bg-muted/10 flex flex-col gap-3 pb-safe">
                    <Button 
                        type="submit" 
                        form="change-password-form"
                        disabled={!newPassword || !confirmPassword || actionLoading}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                        {actionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5" />
                        )}
                        {actionLoading ? t('change_password_modal.updating', 'Updating...') : t('change_password_modal.update', 'Save New Password')}
                    </Button>
                    <button 
                        onClick={handleClose} 
                        disabled={actionLoading}
                        className="w-full h-10 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('change_password_modal.cancel', 'Cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminChangePasswordModal;