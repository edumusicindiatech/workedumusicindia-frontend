import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import api from "../../api/axios";
import { School, MapPin, ChevronRight, Tags, Loader2 } from "lucide-react";
import SchoolDetailsModal from "../../modals/employee/SchoolDetailsModal";

const AssignedSchools = () => {
    const [assignedSchools, setAssignedSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState(null);

    const fetchSchools = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/employee/assigned-schools');

            if (response.data.success) {
                setAssignedSchools(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch assigned schools:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchools();
    }, [fetchSchools]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-medium">Loading your assignments & history...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in max-w-4xl mx-auto pb-20 p-4 sm:p-0">

            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Assigned Schools
                </h1>
                <p className="text-muted-foreground mt-1">
                    Select a school to view your 30-day attendance records.
                </p>
            </div>

            {/* Assignments List */}
            {assignedSchools.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center">
                    <School className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-bold">No Assigned Schools</h3>
                    <p className="text-muted-foreground text-sm">You currently do not have any schools permanently assigned to you.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
                    {assignedSchools.map((school) => (
                        <div
                            key={school.id}
                            onClick={() => setSelectedSchool(school)}
                            className="bg-card rounded-2xl border border-border p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 group flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                        <School className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        {school.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1.5 flex items-start gap-1.5">
                                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                        {school.address}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Summary of Assigned Categories */}
                            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                    <Tags className="w-4 h-4 text-muted-foreground" />
                                    {school.categories.map((cat, idx) => (
                                        <span key={idx} className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-semibold">
                                            {cat.name}
                                        </span>
                                    ))}
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detailed History Modal */}
            <SchoolDetailsModal
                isOpen={!!selectedSchool}
                onClose={() => setSelectedSchool(null)}
                school={selectedSchool}
                onRefresh={fetchSchools} // Pass refresh trigger
            />

        </div>
    );
};

export default AssignedSchools;