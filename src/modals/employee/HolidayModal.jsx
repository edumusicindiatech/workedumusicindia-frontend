import { useState, useEffect } from "react";
import { CalendarX, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const HolidayModal = ({ isOpen, onClose, target, onSubmit, actionLoading }) => {
    const [holidayReason, setHolidayReason] = useState("");

    // Reset field when modal opens
    useEffect(() => {
        if (isOpen) setHolidayReason("");
    }, [isOpen]);

    if (!isOpen || !target) return null;

    const handleSubmit = () => {
        onSubmit(target, holidayReason);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 fade-in duration-300 p-6" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex items-center justify-between gap-3 mb-6 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                            <CalendarX className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-amber-500">Mark as Holiday</h2>
                            <p className="text-xs text-muted-foreground truncate max-w-50">
                                {target === 'ALL' ? "Entire Work Day" : `${target.schoolName}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            Reason for Holiday <span className="text-xs font-normal opacity-60 text-muted-foreground">(Required)</span>
                        </label>
                        <textarea 
                            value={holidayReason} 
                            onChange={(e) => setHolidayReason(e.target.value)} 
                            placeholder="e.g., Summer Break, National Holiday, School Closed..." 
                            className="w-full p-3 rounded-xl border border-input bg-background text-sm min-h-25 focus:ring-2 focus:ring-amber-500/50 outline-none resize-none custom-scrollbar" 
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border/50">
                        <Button variant="ghost" className="flex-1 h-11 rounded-xl" onClick={onClose}>Cancel</Button>
                        <Button 
                            className="flex-1 h-11 rounded-xl shadow-sm bg-amber-500 hover:bg-amber-600 text-white font-bold" 
                            onClick={handleSubmit}
                            disabled={actionLoading || !holidayReason.trim()}
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Holiday"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HolidayModal;