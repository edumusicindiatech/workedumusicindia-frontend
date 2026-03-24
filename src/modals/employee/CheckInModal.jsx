import { useState, useEffect } from "react";
import { MapPin, AlertCircle, PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CheckInModal = ({ isOpen, onClose, visit, isLate, onSubmit, actionLoading }) => {
    const [lateReason, setLateReason] = useState("");
    const [eventNote, setEventNote] = useState("");

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setLateReason("");
            setEventNote("");
        }
    }, [isOpen]);

    if (!isOpen || !visit) return null;

    const handleSubmit = () => {
        // Automatically capture the exact date/time if an event note is provided
        const eventDate = eventNote.trim() ? new Date().toISOString() : null;

        onSubmit(visit.id, {
            lateReason: lateReason.trim(),
            eventNote: eventNote.trim(),
            eventDate // <--- Attaching the auto-calculated date here
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 fade-in duration-300 p-6" onClick={(e) => e.stopPropagation()}>

                <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Check In</h2>
                        <p className="text-xs text-muted-foreground">{visit.schoolName} ({visit.category})</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Mandatory Late Reason if Late */}
                    {isLate && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-destructive flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" /> Why are you arriving late? <span className="text-xs font-normal opacity-80">(Required)</span>
                            </label>
                            <textarea
                                value={lateReason}
                                onChange={(e) => setLateReason(e.target.value)}
                                placeholder="Traffic, vehicle issue, previous stop delay..."
                                className="w-full p-3 rounded-xl border border-input bg-background text-sm min-h-20 focus:ring-2 focus:ring-destructive/50 outline-none resize-none"
                            />
                        </div>
                    )}

                    {/* Optional Event Note */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <PartyPopper className="w-4 h-4 text-primary shrink-0" /> Event Note <span className="text-xs font-normal opacity-60 text-muted-foreground">(Optional)</span>
                        </label>
                        <textarea
                            value={eventNote}
                            onChange={(e) => setEventNote(e.target.value)}
                            placeholder="Any special events happening at the school today?"
                            className="w-full p-3 rounded-xl border border-input bg-background text-sm min-h-20 focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="ghost" className="flex-1 h-11 rounded-xl" onClick={onClose}>Cancel</Button>
                        <Button
                            className="flex-1 h-11 rounded-xl shadow-glow"
                            onClick={handleSubmit}
                            disabled={actionLoading || (isLate && !lateReason.trim())}
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Check In"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckInModal;