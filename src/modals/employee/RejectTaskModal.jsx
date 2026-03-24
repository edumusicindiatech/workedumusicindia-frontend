import { useState, useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast"; // <-- Added react-hot-toast import

const RejectTaskModal = ({ isOpen, onClose, onSubmit, actionLoading }) => {
    const [rejectReason, setRejectReason] = useState("");

    // Reset the reason field every time the modal opens
    useEffect(() => {
        if (isOpen) {
            setRejectReason("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        // Validation check for consistency
        if (!rejectReason.trim()) {
            toast.error("Please provide a reason for rejection.");
            return;
        }
        onSubmit(rejectReason);
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>

            {/* Modal Container */}
            <div
                className="bg-card w-full max-w-md rounded-4xl shadow-2xl border border-border/50 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative Top Gradient Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40" />

                {/* --- Header Section --- */}
                <div className="pt-8 px-6 sm:px-8 text-center flex flex-col items-center">
                    {/* Glowing Icon Container */}
                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5 border border-destructive/20 shadow-inner relative">
                        <div className="absolute inset-0 bg-destructive/20 rounded-2xl animate-ping opacity-20" />
                        <AlertCircle className="w-8 h-8 text-destructive relative z-10 drop-shadow-sm" />
                    </div>

                    <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">
                        Reject Task
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground">
                        Why are you declining this optional assignment?
                    </p>
                </div>

                {/* --- Body / Form Section --- */}
                <div className="p-6 sm:p-8 space-y-6 mt-2">
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g., Schedule conflict, already assigned to another priority task..."
                        disabled={actionLoading}
                        className="w-full min-h-30 p-4 rounded-2xl border border-border/60 bg-muted/20 text-sm sm:text-base focus:bg-card focus:border-destructive/50 focus:ring-4 focus:ring-destructive/10 outline-none resize-none transition-all duration-300 custom-scrollbar placeholder:text-muted-foreground/50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    {/* --- Action Buttons --- */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 h-14 rounded-2xl font-bold text-base border-border/80 hover:bg-muted hover:text-foreground transition-all disabled:opacity-50"
                            onClick={onClose}
                            disabled={actionLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1 h-14 rounded-2xl font-bold text-base shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] hover:bg-destructive transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                            onClick={handleSubmit}
                            disabled={!rejectReason.trim() || actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Rejection"}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RejectTaskModal;