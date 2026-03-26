import { useState } from "react";
import { Button } from "@/components/ui/button";
import { School, MapPin, Plus, Clock, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next"; // <-- Added import

import AssignSchoolModal from "../../../modals/admin/AssignSchoolModals";
import ManageAssignedSchoolModal from "../../../modals/admin/ManageAssignedSchoolModal";

const AssignmentsTab = ({ schools, employeeId, onSuccess }) => {
    const { t } = useTranslation(); // <-- Initialize hook
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [manageModalData, setManageModalData] = useState({ isOpen: false, assignment: null });

    return (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">

            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-muted/10">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <School className="w-5 h-5 text-primary shrink-0" /> {t('assignments_tab.title')}
                </h3>
                <Button size="sm" className="gap-2 shadow-glow rounded-lg" onClick={() => setIsAssignModalOpen(true)}>
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{t('assignments_tab.btn_assign_desktop')}</span>
                    <span className="sm:hidden">{t('assignments_tab.btn_assign_mobile')}</span>
                </Button>
            </div>

            {/* Schools List */}
            <div className="p-0">
                {schools.map((assignment) => (
                    <div
                        key={assignment._id}
                        className="flex flex-col sm:flex-row sm:items-start justify-between p-4 sm:p-6 border-b border-border last:border-0 hover:bg-muted/10 transition-colors gap-4"
                    >
                        {/* Details Section */}
                        <div className="min-w-0 flex-1 space-y-2.5">
                            <h4 className="font-bold text-lg text-foreground leading-tight">
                                {assignment.school?.schoolName || t('assignments_tab.unknown_school')}
                            </h4>

                            <div className="flex items-start sm:items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                                <span className="leading-snug opacity-90 truncate">
                                    {assignment.school?.address || t('assignments_tab.no_address')}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-1">
                                <span className="px-2.5 py-1 bg-primary/10 rounded-md border border-primary/20 text-xs font-bold text-primary flex items-center gap-1.5">
                                    {assignment.category}
                                </span>
                                <span className="px-2.5 py-1 bg-muted rounded-md border border-border/50 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {assignment.startTime} - {assignment.endTime}
                                </span>
                                {assignment.allowedDays && assignment.allowedDays.length > 0 && (
                                    <span className="px-2.5 py-1 bg-muted rounded-md border border-border/50 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                        <CalendarDays className="w-3.5 h-3.5" />
                                        {assignment.allowedDays.join(', ')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions & Status Section */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 sm:border-transparent mt-2 sm:mt-0">
                            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                {t('assignments_tab.status_active')}
                            </span>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-2 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={() => setManageModalData({ isOpen: true, assignment: assignment })}
                                >
                                    <Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline text-xs">{t('assignments_tab.btn_edit')}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                                    onClick={() => setManageModalData({ isOpen: true, assignment: assignment })}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {(!schools || schools.length === 0) && (
                    <div className="p-8 text-center text-muted-foreground">
                        {t('assignments_tab.empty_msg')}
                    </div>
                )}
            </div>

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