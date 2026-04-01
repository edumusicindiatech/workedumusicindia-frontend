import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    School, MapPin, Plus, Clock, CalendarDays,
    Pencil, Trash2, CheckCircle2, Sparkles
} from "lucide-react";
import { useTranslation } from "react-i18next";

import AssignSchoolModal from "../../../modals/admin/AssignSchoolModals";
import ManageAssignedSchoolModal from "../../../modals/admin/ManageAssignedSchoolModal";

const AssignmentsTab = ({ schools, employeeId, onSuccess }) => {
    const { t } = useTranslation();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [manageModalData, setManageModalData] = useState({ isOpen: false, assignment: null });

    return (
        <div className="bg-card rounded-4xl shadow-sm border border-border overflow-hidden animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="p-5 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/40 via-primary to-primary/40" />
                <h3 className="text-xl font-extrabold flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <School className="w-5 h-5 text-primary shrink-0" />
                    </div>
                    {t('assignments_tab.title')}
                </h3>
                <Button
                    className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold h-11 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95"
                    onClick={() => setIsAssignModalOpen(true)}
                >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span className="hidden sm:inline">{t('assignments_tab.btn_assign_desktop')}</span>
                    <span className="sm:hidden">{t('assignments_tab.btn_assign_mobile')}</span>
                </Button>
            </div>

            {/* --- ASSIGNMENTS LIST --- */}
            <div className="p-4 sm:p-6">
                {(!schools || schools.length === 0) ? (
                    /* --- EMPTY STATE --- */
                    <div className="border border-dashed border-border/60 rounded-4xl p-10 sm:p-14 text-center flex flex-col items-center relative overflow-hidden group hover:bg-muted/5 transition-colors">
                        <div className="w-20 h-20 mb-5 relative">
                            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" />
                            <div className="relative w-full h-full bg-muted rounded-full flex items-center justify-center border-4 border-card shadow-sm z-10">
                                <School className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">No Assignments</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm text-sm sm:text-base">
                            {t('assignments_tab.empty_msg')}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => setIsAssignModalOpen(true)}
                            className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold"
                        >
                            <Sparkles className="w-4 h-4 mr-2" /> Assign School
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {schools.map((assignment) => (
                            <div
                                key={assignment._id}
                                className="relative group flex flex-col p-5 sm:p-6 rounded-2xl border transition-all duration-300 bg-muted/10 border-border hover:bg-muted/30"
                            >
                                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">

                                    {/* Details Section */}
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                {t('assignments_tab.status_active', 'Active Assignment')}
                                            </span>
                                        </div>

                                        <h4 className="font-extrabold text-lg sm:text-xl text-foreground leading-tight">
                                            {assignment.school?.schoolName || t('assignments_tab.unknown_school')}
                                        </h4>

                                        <div className="flex items-start sm:items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                                            <span className="leading-snug opacity-90 truncate">
                                                {assignment.school?.address || t('assignments_tab.no_address')}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2.5 pt-2">
                                            <span className="px-3 py-1 bg-primary/10 rounded-lg border border-primary/10 text-xs font-bold text-primary flex items-center gap-1.5">
                                                {assignment.category}
                                            </span>
                                            <span className="px-3 py-1 bg-muted rounded-lg border border-border/50 text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-amber-500" /> {assignment.startTime} - {assignment.endTime}
                                            </span>
                                            {assignment.allowedDays && assignment.allowedDays.length > 0 && (
                                                <span className="px-3 py-1 bg-muted rounded-lg border border-border/50 text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <CalendarDays className="w-3.5 h-3.5 text-blue-500" /> {assignment.allowedDays.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="flex flex-row xl:flex-col items-center xl:items-end justify-start xl:justify-start gap-2.5 shrink-0 pt-4 xl:pt-0 border-t border-border/50 xl:border-transparent mt-2 xl:mt-0">
                                        <Button
                                            variant="outline"
                                            className="h-10 rounded-xl gap-2 font-bold text-muted-foreground hover:text-primary border-border/80 hover:border-primary/30 transition-all flex-1 xl:flex-none"
                                            onClick={() => setManageModalData({ isOpen: true, assignment: assignment })}
                                        >
                                            <Pencil className="w-4 h-4" /> {t('assignments_tab.btn_edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-10 rounded-xl gap-2 font-bold text-destructive hover:bg-destructive hover:text-white border-destructive/20 hover:border-destructive transition-all flex-1 xl:flex-none"
                                            onClick={() => setManageModalData({ isOpen: true, assignment: assignment })}
                                        >
                                            <Trash2 className="w-4 h-4" /> {t('assignments_tab.btn_delete', 'Delete')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <AssignSchoolModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                employeeId={employeeId}
                onSuccess={() => {
                    setIsAssignModalOpen(false);
                    if (onSuccess) onSuccess();
                }}
            />

            <ManageAssignedSchoolModal
                isOpen={manageModalData.isOpen}
                onClose={() => setManageModalData({ isOpen: false, assignment: null })}
                assignment={manageModalData.assignment}
                employeeId={employeeId}
                onSuccess={() => {
                    setManageModalData({ isOpen: false, assignment: null });
                    if (onSuccess) onSuccess();
                }}
            />
        </div>
    );
};

export default AssignmentsTab;