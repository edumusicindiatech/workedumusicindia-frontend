import { useState } from "react";
import { Button } from "@/components/ui/button";
import { School, MapPin, Plus } from "lucide-react";

// Import Modals (Adjust path if needed)
import AssignSchoolModal from "../../../modals/admin/AssignSchoolModals";
import ManageAssignedSchoolModal from "../../../modals/admin/ManageAssignedSchoolModal";

const AssignmentsTab = ({ schools }) => {
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [manageModalData, setManageModalData] = useState({ isOpen: false, school: null });

    return (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-muted/10">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <School className="w-5 h-5 text-primary shrink-0" /> Assigned Schools
                </h3>
                <Button size="sm" className="gap-2 shadow-glow rounded-lg" onClick={() => setIsAssignModalOpen(true)}>
                    <Plus className="w-4 h-4 shrink-0" /> 
                    <span className="hidden sm:inline">Assign School</span>
                    <span className="sm:hidden">Assign</span>
                </Button>
            </div>
            
            {/* Schools List */}
            <div className="p-0">
                {schools.map((school) => (
                    <div 
                        key={school.id} 
                        onClick={() => setManageModalData({ isOpen: true, school: school })}
                        className="flex flex-col sm:flex-row sm:items-start justify-between p-4 sm:p-6 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group gap-4"
                    >
                        <div className="min-w-0 flex-1 space-y-2.5">
                            {/* School Name */}
                            <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">
                                {school.name}
                            </h4>
                            
                            {/* Location */}
                            <div className="flex items-start sm:items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" /> 
                                <span className="leading-snug opacity-90 truncate">{school.address}</span>
                            </div>
                            
                            {/* Categories Badges */}
                            {school.categories && school.categories.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {school.categories.map(cat => (
                                        <span key={cat.id} className="px-2 py-0.5 bg-muted rounded border border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            {cat.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Mobile Status Badge */}
                            <div className="pt-2 sm:hidden">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit flex items-center border ${school.status === 'Visited Today' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                    {school.status}
                                </span>
                            </div>
                        </div>

                        {/* Desktop Status Badge */}
                        <div className="hidden sm:flex shrink-0 pt-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit flex items-center border ${school.status === 'Visited Today' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                {school.status}
                            </span>
                        </div>
                    </div>
                ))}

                {(!schools || schools.length === 0) && (
                    <div className="p-8 text-center text-muted-foreground">
                        No schools assigned to this employee yet.
                    </div>
                )}
            </div>

            {/* Modals rendered here */}
            <AssignSchoolModal 
                isOpen={isAssignModalOpen} 
                onClose={() => setIsAssignModalOpen(false)} 
            />
            <ManageAssignedSchoolModal 
                isOpen={manageModalData.isOpen} 
                onClose={() => setManageModalData({ isOpen: false, school: null })}
                school={manageModalData.school}
            />
        </div>
    );
};

export default AssignmentsTab;