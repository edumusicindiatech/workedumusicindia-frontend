import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    School, MapPin, Plus, Clock, CalendarDays,
    Pencil, Trash2, CheckCircle2, Sparkles, Copy, Tags,
    ClipboardList
} from "lucide-react";
import { useTranslation } from "react-i18next";

import AssignSchoolModal from "../../../modals/admin/AssignSchoolModals";
import ManageAssignedSchoolModal from "../../../modals/admin/ManageAssignedSchoolModal";

// --- Helper function to convert 24h to 12h AM/PM format ---
const formatTime12Hour = (time) => {
    if (!time) return "";
    const [hourString, minute] = time.split(":");
    if (!hourString || !minute) return time;
    let hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 becomes 12
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    return `${formattedHour}:${minute} ${ampm}`;
};

const AssignmentsTab = ({ schools, employeeId, onSuccess }) => {
    const { t } = useTranslation();

    // States for Modals
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [manageModalData, setManageModalData] = useState({ isOpen: false, assignment: null });

    // State to hold the data of the assignment we want to clone
    const [cloneData, setCloneData] = useState(null);

    const openNewAssignmentModal = () => {
        setCloneData(null); // Ensure form is empty for a truly "new" assignment
        setIsAssignModalOpen(true);
    };

    const handleClone = (assignment) => {
        setCloneData(assignment); // Pass existing data to the modal
        setIsAssignModalOpen(true);
    };

    return (
        <div className="bg-card rounded-4xl shadow-sm border border-border overflow-hidden animate-in fade-in duration-500">

            {/* --- HEADER --- */}
            <div className="p-5 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/40 via-primary to-primary/40" />
                <h3 className="text-xl font-extrabold flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <School className="w-5 h-5 text-primary shrink-0" />
                    </div>
                    {t('assignments_tab.title', 'Permanent Assignments')}
                </h3>
                <Button
                    className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold h-11 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95"
                    onClick={openNewAssignmentModal}
                >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span className="hidden sm:inline">{t('assignments_tab.btn_assign_desktop', 'Assign School')}</span>
                    <span className="sm:hidden">{t('assignments_tab.btn_assign_mobile', 'Assign')}</span>
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
                        <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">{t('assignments_tab.empty_title', 'No Assignments')}</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm text-sm sm:text-base">
                            {t('assignments_tab.empty_msg', 'This employee has no permanently assigned schools yet.')}
                        </p>
                        <Button
                            variant="outline"
                            onClick={openNewAssignmentModal}
                            className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold"
                        >
                            <Sparkles className="w-4 h-4 mr-2" /> {t('assignments_tab.btn_assign_desktop', 'Assign School')}
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-2">
                        {schools.map((assignment) => (
                            <div
                                key={assignment._id}
                                className="group relative rounded-3xl border p-5 sm:p-6 lg:p-8 flex flex-col h-full transition-all duration-300 overflow-hidden bg-card border-primary/30 shadow-lg hover:shadow-xl hover:border-primary/60 lg:hover:-translate-y-1"
                            >
                                {/* Top Border Accent */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 sm:w-40 h-1.5 bg-primary rounded-b-full shadow-[0_0_15px_rgba(var(--primary),0.8)]" />

                                {/* Card Header */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pt-2">
                                    <div className="flex-1 min-w-0 flex items-start gap-4">
                                        <div className="p-3 sm:p-4 rounded-2xl shrink-0 mt-0.5 bg-primary/10 dark:bg-primary/20">
                                            <School className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl sm:text-2xl font-bold leading-tight pb-1 wrap-break-word text-foreground">
                                                {assignment.school?.schoolName || t('assignments_tab.unknown_school', 'Unknown School')}
                                            </h2>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <p className="flex items-center gap-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed truncate">
                                                    <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                                                    <span className="truncate">{assignment.school?.address || t('assignments_tab.no_address', 'No Address Provided')}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- UPDATED BADGES SECTION --- */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                        {assignment.isTask && (
                                            <span className="text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border shadow-sm bg-violet-500 text-white border-violet-600">
                                                <ClipboardList className="w-3 h-3" /> {t('tasks_tab.task_badge', 'Task')}
                                            </span>
                                        )}
                                        <span className="text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border shadow-sm bg-primary text-primary-foreground border-primary/20">
                                            <Tags className="w-3 h-3" /> {assignment.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Scheduling Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-muted/40 dark:bg-muted/20 p-4 sm:p-5 rounded-2xl border border-border/50">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                            <CalendarDays className="w-4 h-4 text-primary/70" /> {t('tasks.card.days', 'Days')}
                                        </div>
                                        <p className="text-sm sm:text-base font-bold text-foreground flex items-center flex-wrap gap-2">
                                            <span>{assignment.allowedDays?.join(", ") || "N/A"}</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border/60 sm:pl-4">
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                            <Clock className="w-4 h-4 text-amber-500" /> {t('tasks.card.timing', 'Timing')}
                                        </div>
                                        <p className="text-sm sm:text-base font-bold text-foreground">
                                            {formatTime12Hour(assignment.startTime)} - {formatTime12Hour(assignment.endTime)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1" /> {/* Pushes footer to bottom */}

                                {/* Actions Section */}
                                <div className="pt-5 border-t border-border/60 mt-auto flex flex-wrap sm:flex-nowrap gap-3">
                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-xl gap-2 font-bold text-muted-foreground hover:text-primary border-border/80 hover:border-primary/30 transition-all flex-1"
                                        onClick={() => handleClone(assignment)}
                                    >
                                        <Copy className="w-4 h-4" /> {t('assignments_tab.btn_clone', 'Clone')}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-xl gap-2 font-bold text-muted-foreground hover:text-primary border-border/80 hover:border-primary/30 transition-all flex-1"
                                        onClick={() => setManageModalData({ isOpen: true, assignment: assignment })}
                                    >
                                        <Pencil className="w-4 h-4" /> {t('assignments_tab.btn_edit', 'Edit')}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-xl gap-2 font-bold text-destructive hover:bg-destructive hover:text-white border-destructive/20 hover:border-destructive transition-all flex-1"
                                        onClick={() => setManageModalData({ isOpen: true, assignment: assignment })}
                                    >
                                        <Trash2 className="w-4 h-4" /> {t('assignments_tab.btn_delete', 'Delete')}
                                    </Button>
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
                initialData={cloneData} // Pass the clone data down to the modal
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