import { useState, useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        onSubmit(rejectReason);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card border border-border shadow-2xl w-full max-w-md rounded-2xl p-6 relative flex flex-col animate-in zoom-in-95 fade-in duration-300" onClick={(e) => e.stopPropagation()}>

                <div className="flex items-center gap-3 text-destructive mb-6 border-b border-border pb-4">
                    <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Reject Task</h2>
                        <p className="text-xs text-muted-foreground font-medium">Please provide a reason</p>
                    </div>
                </div>

                <p className="text-foreground text-sm mb-3 font-medium">
                    Why are you declining this optional assignment?
                </p>

                <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Schedule conflict, already assigned to another priority task..."
                    className="w-full min-h-30 rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-shadow mb-6"
                />

                <div className="flex items-center gap-3">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="flex-1 rounded-xl h-11 font-semibold"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!rejectReason.trim() || actionLoading}
                        className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-xl h-11 font-bold shadow-sm"
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Rejection"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RejectTaskModal;