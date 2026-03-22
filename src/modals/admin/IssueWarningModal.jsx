import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, ChevronDown, Check, Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

// NOTE: Add employeeId and onSuccess props!
const IssueWarningModal = ({ isOpen, onClose, employeeId, onSuccess }) => {
    const [warningForm, setWarningForm] = useState({ type: "Verbal", reason: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setWarningForm({ type: "Verbal", reason: "" });
            setIsDropdownOpen(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!warningForm.reason.trim()) {
            toast.error("Please provide a reason for the warning.");
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading("Issuing warning...");

        try {
            // API Call mapping 'type' to backend 'level'
            await api.post(`/admin/employees/${employeeId}/warnings`, {
                level: warningForm.type,
                reason: warningForm.reason
            });

            toast.success("Warning issued successfully.", { id: loadingToast });
            if (onSuccess) onSuccess(); // Refresh data
            onClose();
        } catch (error) {
            console.error("Warning Error:", error);
            toast.error(error.response?.data?.message || "Failed to issue warning.", { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = warningForm.reason.trim().length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={!isSubmitting ? onClose : undefined}>
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-destructive/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Issue Warning</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Record a formal warning for this employee.</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

                    <div className="space-y-2" ref={dropdownRef}>
                        <Label className="text-sm font-semibold text-foreground">Warning Level</Label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-all hover:bg-muted/30"
                            >
                                <span className={`font-semibold ${warningForm.type === "Final" ? "text-destructive" : warningForm.type === "Written" ? "text-orange-500" : "text-amber-500"}`}>
                                    {warningForm.type} Warning
                                </span>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-1.5 flex flex-col gap-1">
                                        {["Verbal", "Written", "Final"].map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => {
                                                    setWarningForm({ ...warningForm, type: option });
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${warningForm.type === option ? "bg-muted font-bold text-foreground" : "text-foreground hover:bg-muted/50 font-medium"}`}
                                            >
                                                <span>{option} Warning</span>
                                                {warningForm.type === option && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">Reason / Description</Label>
                        <textarea
                            placeholder="Provide detailed context for this warning..."
                            value={warningForm.reason}
                            onChange={(e) => setWarningForm({ ...warningForm, reason: e.target.value })}
                            className="w-full min-h-30 rounded-xl border border-input bg-background p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-shadow custom-scrollbar"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl h-11 px-6 font-semibold">Cancel</Button>
                    <Button onClick={handleSave} disabled={!isFormValid || isSubmitting} className="rounded-xl h-11 px-8 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-glow">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Issue Warning</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default IssueWarningModal;