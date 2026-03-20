import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, User, Calendar } from "lucide-react";

// Import the new modal (adjust path if needed)
import IssueWarningModal from "../../../modals/admin/IssueWarningModal";

const WarningsTab = ({ warningsList }) => {
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

    const getWarningColor = (type) => {
        switch (type) {
            case "Final":
                return "bg-destructive/10 text-destructive border-destructive/20";
            case "Written":
                return "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400";
            default: // Verbal
                return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400";
        }
    };

    return (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">

            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-muted/10">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> Warning History
                </h3>
                <Button size="sm" variant="destructive" className="gap-2 shadow-glow rounded-lg" onClick={() => setIsIssueModalOpen(true)}>
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Issue Warning</span>
                    <span className="sm:hidden">Issue</span>
                </Button>
            </div>

            {/* Warnings List */}
            <div className="p-0">
                {warningsList.map((w) => (
                    <div
                        key={w.id}
                        className="flex flex-col sm:flex-row sm:items-start justify-between p-4 sm:p-6 border-b border-border last:border-0 hover:bg-muted/30 transition-colors group gap-4"
                    >
                        <div className="min-w-0 flex-1 space-y-2.5">
                            {/* Type & Date */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <h4 className="font-bold text-lg text-foreground leading-tight">
                                    {w.type} Warning
                                </h4>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getWarningColor(w.type)}`}>
                                    Level: {w.type}
                                </span>
                            </div>

                            {/* Reason */}
                            <p className="text-sm text-foreground/90 leading-relaxed">
                                {w.reason}
                            </p>

                            {/* Meta Info (Date & Issuer) */}
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground pt-1">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 opacity-70" /> {w.date}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 opacity-70" /> Issued by: {w.issuedBy}
                                </div>
                            </div>
                        </div>

                    </div>
                ))}

                {(!warningsList || warningsList.length === 0) && (
                    <div className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium">Clean record.</p>
                        <p className="text-sm mt-1 max-w-xs mx-auto">No warnings have been issued to this employee.</p>
                    </div>
                )}
            </div>

            {/* Modal rendered here */}
            <IssueWarningModal
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
            />
        </div>
    );
};

export default WarningsTab;