import { useState, useEffect } from "react";
import { ListChecks, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ActionItemsModal = ({ isOpen, onClose, onSubmit, actionLoading }) => {
    const [actionItems, setActionItems] = useState("");

    // Reset field when modal opens
    useEffect(() => {
        if (isOpen) setActionItems("");
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(actionItems);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card border border-border shadow-2xl w-full max-w-md rounded-2xl p-6 relative flex flex-col animate-in zoom-in-95 fade-in duration-300" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <ListChecks className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold">Final Steps</h2>
                        <p className="text-xs text-muted-foreground font-medium">Add any pending action items</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-2 mb-6">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Action Items & Follow-ups <span className="text-xs font-normal opacity-60 text-muted-foreground">(Optional)</span>
                    </label>
                    <textarea
                        value={actionItems}
                        onChange={(e) => setActionItems(e.target.value)}
                        placeholder="List any tasks or follow-ups required for tomorrow..."
                        className="w-full min-h-30 rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow custom-scrollbar"
                    />
                </div>

                {/* Actions */}
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
                        disabled={actionLoading}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 font-bold shadow-glow"
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                <Send className="w-4 h-4 mr-2" /> Submit Report
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ActionItemsModal;