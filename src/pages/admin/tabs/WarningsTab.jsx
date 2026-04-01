import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, User, Calendar, ShieldAlert } from "lucide-react";
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
                    {t('warnings_tab.title')}
                </h3>
                <Button
                    variant="destructive"
                    className="w-full sm:w-auto gap-2 shadow-lg shadow-destructive/20 rounded-xl font-bold h-11 hover:bg-destructive/90 transition-all active:scale-95"
                    onClick={() => setIsIssueModalOpen(true)}
                >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span className="hidden sm:inline">{t('warnings_tab.btn_issue')}</span>
                    <span className="sm:hidden">{t('warnings_tab.btn_issue_short')}</span>
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
                            <AlertTriangle className="w-4 h-4 mr-2" /> Issue First Warning
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {warningsList.map((w) => {
                            const level = w.level || w.type;
                            return (
                                <div
                                    key={w._id || w.id}
                                    className="relative group flex flex-col p-5 sm:p-6 rounded-2xl border transition-all duration-300 bg-muted/10 border-border hover:bg-muted/30"
                                >
                                    <div className="min-w-0 flex-1 space-y-3">

                                        {/* Type & Badge */}
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center border ${getWarningColor(level)}`}>
                                                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                                                {t('warnings_tab.level_label')}: {level}
                                            </span>
                                        </div>

                                        <h4 className="font-extrabold text-lg sm:text-xl text-foreground leading-tight">
                                            {level} {t('warnings_tab.warning_suffix')}
                                        </h4>

                                        {/* Reason */}
                                        <p className="text-sm text-foreground/90 leading-relaxed font-medium bg-background p-3 rounded-lg border border-border/50">
                                            "{w.reason}"
                                        </p>

                                        {/* Meta Info (Date & Issuer) */}
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground pt-2">
                                            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md border border-border/50">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(w.dateIssued || w.date || w.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md border border-border/50">
                                                <User className="w-3.5 h-3.5" />
                                                {t('warnings_tab.issued_by')}: {w.issuedBy?.name || t('warnings_tab.admin_default')}
                                            </div>
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