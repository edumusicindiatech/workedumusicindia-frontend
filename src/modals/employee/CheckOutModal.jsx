import { useState, useEffect } from "react";
import { LogOut, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next"; // <-- Added import

const CheckOutModal = ({ isOpen, onClose, visit, overtimeMinutes, onSubmit, actionLoading }) => {
    const { t } = useTranslation(); // <-- Initialize hook
    const [overtimeReason, setOvertimeReason] = useState("");

    // Reset field when modal opens
    useEffect(() => {
        if (isOpen) {
            setOvertimeReason("");
        }
    }, [isOpen]);

    if (!isOpen || !visit) return null;

    const handleSubmit = () => {
        onSubmit(visit.id, { overtimeReason });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 fade-in duration-300 p-6" onClick={(e) => e.stopPropagation()}>

                <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                        <LogOut className="w-5 h-5 text-destructive ml-1" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">{t('check_out_modal.title')}</h2>
                        <p className="text-xs text-muted-foreground">{visit.schoolName} ({visit.category})</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Optional Overtime Reason */}
                    {overtimeMinutes > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-amber-500 flex items-center gap-2">
                                <Clock className="w-4 h-4 shrink-0" /> {t('check_out_modal.overtime_alert', { count: overtimeMinutes })}
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">{t('check_out_modal.overtime_reason_label')}</p>
                            <textarea
                                value={overtimeReason}
                                onChange={(e) => setOvertimeReason(e.target.value)}
                                placeholder={t('check_out_modal.overtime_placeholder')}
                                className="w-full p-3 rounded-xl border border-input bg-background text-sm min-h-20 focus:ring-2 focus:ring-amber-500/50 outline-none resize-none"
                            />
                        </div>
                    )}

                    {!overtimeMinutes && (
                        <p className="text-sm text-muted-foreground">{t('check_out_modal.confirm_msg')}</p>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button variant="ghost" className="flex-1 h-11 rounded-xl" onClick={onClose}>{t('check_out_modal.cancel')}</Button>
                        <Button
                            variant="destructive"
                            className="flex-1 h-11 rounded-xl shadow-glow"
                            onClick={handleSubmit}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('check_out_modal.confirm')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckOutModal;