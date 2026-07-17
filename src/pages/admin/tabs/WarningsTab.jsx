import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, User, Calendar, ShieldAlert, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import IssueWarningModal from '../../../modals/admin/IssueWarningModal'

const WarningsTab = ({ warningsList, employeeId, onSuccess }) => {
    const { t } = useTranslation();
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
        <div className="bg-card rounded-4xl shadow-sm border border-border overflow-hidden animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="p-5 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40" />
                <h3 className="text-xl font-extrabold flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-destructive/10 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    </div>
                    {t('warnings_tab.title', 'Warnings & Infractions')}
                </h3>
                <Button
                    variant="destructive"
                    className="w-full sm:w-auto gap-2 shadow-lg shadow-destructive/20 rounded-xl font-bold h-11 hover:bg-destructive/90 transition-all active:scale-95"
                    onClick={() => setIsIssueModalOpen(true)}
                >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span className="hidden sm:inline">{t('warnings_tab.btn_issue', 'Issue Warning')}</span>
                    <span className="sm:hidden">{t('warnings_tab.btn_issue_short', 'Issue')}</span>
                </Button>
            </div>

            {/* --- WARNINGS LIST --- */}
            <div className="p-4 sm:p-6">
                {(!warningsList || warningsList.length === 0) ? (
                    /* --- EMPTY STATE --- */
                    <div className="border border-dashed border-border/60 rounded-4xl p-10 sm:p-14 text-center flex flex-col items-center relative overflow-hidden group hover:bg-muted/5 transition-colors">
                        <div className="w-20 h-20 mb-5 relative">
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping opacity-50" />
                            <div className="relative w-full h-full bg-muted rounded-full flex items-center justify-center border-4 border-card shadow-sm z-10">
                                <ShieldAlert className="w-8 h-8 text-emerald-500/70" />
                            </div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">
                            {t('warnings_tab.empty_title', 'Clean Record')}
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-sm text-sm sm:text-base">
                            {t('warnings_tab.empty_desc', 'This employee currently has no warnings on file.')}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => setIsIssueModalOpen(true)}
                            className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 font-bold"
                        >
                            <Sparkles className="w-4 h-4 mr-2" /> {t('warnings_tab.btn_issue', 'Issue Warning')}
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-2">
                        {warningsList.map((w) => {
                            const level = w.level || w.type;
                            return (
                                <div
                                    key={w._id || w.id}
                                    className="group relative rounded-3xl border p-5 sm:p-6 lg:p-8 flex flex-col h-full transition-all duration-300 overflow-hidden bg-card border-border/60 hover:shadow-lg hover:border-border lg:hover:-translate-y-1"
                                >
                                    {/* Top Border Accent */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 sm:w-40 h-1.5 bg-destructive rounded-b-full shadow-[0_0_15px_rgba(var(--destructive),0.8)] opacity-60" />

                                    {/* Card Header */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pt-2">
                                        <div className="flex-1 min-w-0 flex items-start gap-4">
                                            <div className="p-3 sm:p-4 rounded-2xl shrink-0 mt-0.5 bg-destructive/10">
                                                <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-destructive" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-xl sm:text-2xl font-bold leading-tight pb-1 wrap-break-word text-foreground">
                                                    {level} {t('warnings_tab.warning_suffix', 'Warning')}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <p className="flex items-center gap-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed truncate">
                                                        {t('warnings_tab.issued_by', 'Issued By')}: {w.issuedBy?.name || t('warnings_tab.admin_default', 'Admin')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <span className={`self-start sm:self-auto text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1.5 border shadow-sm ${getWarningColor(level)}`}>
                                            <ShieldAlert className="w-3 h-3" /> {level}
                                        </span>
                                    </div>

                                    {/* Reason Box */}
                                    <div className="mb-6 flex-1">
                                        <div className="flex items-center gap-2 text-foreground font-bold mb-2.5">
                                            <AlertTriangle className="w-4 h-4 text-destructive/70" />
                                            {t('warnings_tab.reason_label', 'Reason for Warning')}
                                        </div>
                                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed bg-muted/40 dark:bg-muted/20 border border-border/50 p-4 sm:p-5 rounded-xl font-medium">
                                            "{w.reason}"
                                        </p>
                                    </div>

                                    <div className="flex-1" />

                                    {/* Meta Info (Date & Issuer) */}
                                    <div className="pt-5 border-t border-border/60 mt-auto flex flex-wrap items-center gap-3 text-xs font-bold text-muted-foreground">
                                        <div className="flex items-center gap-1.5 bg-card px-3 py-2 rounded-lg border border-border/50 shadow-sm flex-1 sm:flex-none justify-center sm:justify-start">
                                            <Calendar className="w-4 h-4 text-primary/70" />
                                            {new Date(w.dateIssued || w.date || w.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-card px-3 py-2 rounded-lg border border-border/50 shadow-sm flex-1 sm:flex-none justify-center sm:justify-start">
                                            <User className="w-4 h-4 text-primary/70" />
                                            <span className="truncate max-w-30">{w.issuedBy?.name || t('warnings_tab.admin_default')}</span>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <IssueWarningModal
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
                employeeId={employeeId}
                onSuccess={() => {
                    setIsIssueModalOpen(false);
                    if (onSuccess) onSuccess();
                }}
            />
        </div>
    );
};

export default WarningsTab;