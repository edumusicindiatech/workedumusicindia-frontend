import { useState } from "react";
import { Button } from "@/components/ui/button";
import { School, MapPin, Plus } from "lucide-react";
import AssignSchoolModal from "../../../modals/admin/AssignSchoolModals";

const AssignmentsTab = ({ schools }) => {
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    return (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <School className="w-5 h-5 text-primary" /> Assigned Schools
                </h3>
                <Button size="sm" className="gap-2" onClick={() => setIsAssignModalOpen(true)}>
                    <Plus className="w-4 h-4" /> Assign School
                </Button>
            </div>
            <div className="p-0">
                {schools.map((school) => (
                    <div key={school.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <div>
                            <p className="font-semibold text-foreground">{school.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5" /> {school.address}
                            </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${school.status === 'Visited Today' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-600'}`}>
                            {school.status}
                        </span>
                    </div>
                ))}
            </div>
            <AssignSchoolModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />
        </div>
    );
};

export default AssignmentsTab;