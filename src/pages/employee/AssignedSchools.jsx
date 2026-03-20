import { useState } from "react";
import { School, MapPin, ChevronRight, Tags } from "lucide-react";
import SchoolDetailsModal from "../../modals/employee/SchoolDetailsModal";

// --- MOCK DATA: RESTRUCTURED FOR CATEGORY-SPECIFIC HISTORY ---
const initialAssignments = [
    { 
        id: 1, 
        name: "Lincoln High School", 
        address: "123 Main St, Springfield", 
        // A school with BOTH categories assigned
        categories: [
            { 
                name: "Junior Band", 
                stats: { present: 18, late: 2, absent: 0, events: 1 },
                history: [
                    { date: "Mar 19, 2026", status: "Present", note: null },
                    { date: "Mar 18, 2026", status: "Event", note: "Spring Musical Preparation - Full rehearsal in the auditorium." },
                    { date: "Mar 15, 2026", status: "Late", note: "Stuck in traffic on Route 9." },
                    { date: "Mar 12, 2026", status: "Present", note: null },
                ]
            },
            { 
                name: "Senior Band", 
                stats: { present: 20, late: 0, absent: 1, events: 0 },
                history: [
                    { date: "Mar 19, 2026", status: "Present", note: null },
                    { date: "Mar 14, 2026", status: "Absent", note: "Emergency personal leave." },
                    { date: "Mar 10, 2026", status: "Present", note: null },
                ]
            }
        ]
    },
    { 
        id: 2, 
        name: "Washington Middle School", 
        address: "456 Elm Ave, Springfield", 
        // A school with ONLY ONE category assigned by the admin
        categories: [
            { 
                name: "Senior Band", 
                stats: { present: 15, late: 0, absent: 0, events: 2 },
                history: [
                    { date: "Mar 20, 2026", status: "Event", note: "Instrument Maintenance Day. Assessed all brass instruments." },
                    { date: "Mar 17, 2026", status: "Present", note: null },
                    { date: "Mar 10, 2026", status: "Event", note: "Guest conductor visited the school." },
                ]
            }
        ]
    },
    { 
        id: 3, 
        name: "Roosevelt Elementary", 
        address: "789 Pine Blvd, Springfield", 
        categories: [
            { 
                name: "Junior Band", 
                stats: { present: 8, late: 1, absent: 0, events: 0 },
                history: [
                    { date: "Mar 19, 2026", status: "Present", note: null },
                    { date: "Mar 12, 2026", status: "Late", note: "Vehicle breakdown on the way." },
                ]
            }
        ]
    },
];

const AssignedSchools = () => {
    const [selectedSchool, setSelectedSchool] = useState(null);

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in max-w-4xl mx-auto pb-20">

            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    Assigned Schools
                </h1>
                <p className="text-muted-foreground mt-1">
                    Select a school to view your 30-day attendance records.
                </p>
            </div>

            {/* Assignments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
                {initialAssignments.map((school) => (
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
                                    <span key={idx} className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">
                                        {cat.name}
                                    </span>
                                ))}
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Detailed History Modal */}
            <SchoolDetailsModal 
                isOpen={!!selectedSchool} 
                onClose={() => setSelectedSchool(null)} 
                school={selectedSchool} 
            />

        </div>
    );
};

export default AssignedSchools;