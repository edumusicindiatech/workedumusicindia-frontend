import React, { useState } from "react";
import { Bell, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";

// Mock data to demonstrate the flow
const regularAssignments = [
    { id: 1, name: "Lincoln Elementary", address: "123 Oak Street", date: "Today" },
    { id: 2, name: "Washington Middle", address: "456 Elm Ave", date: "Today" },
];

const newAdminAssignments = [
    { id: 101, name: "Jefferson High (Emergency)", address: "789 Pine Blvd", duration: "2 Hours" },
    { id: 102, name: "Riverside Academy", address: "321 River Rd", duration: "45 Minutes" },
];

const AssignmentsManager = () => {
    // Toggle for the new random assignments section
    const [showNewAssignments, setShowNewAssignments] = useState(false);

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-8">

            {/* SECTION 1: Notification / Newly Assigned Schools */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Notification Header (Clickable) */}
                <button
                    onClick={() => setShowNewAssignments(!showNewAssignments)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bell className="w-6 h-6 text-gray-700" />
                            {newAdminAssignments.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                                    {newAdminAssignments.length}
                                </span>
                            )}
                        </div>
                        <span className="font-semibold text-gray-900">New Admin Assignments</span>
                    </div>
                    {showNewAssignments ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>

                {/* Expanded View: Shows new schools and their durations */}
                {showNewAssignments && (
                    <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                        {newAdminAssignments.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No new assignments.</p>
                        ) : (
                            newAdminAssignments.map(task => (
                                <div key={task.id} className="border border-red-100 bg-red-50/30 rounded-lg p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{task.name}</h4>
                                        <p className="text-sm text-gray-500">{task.address}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-md w-fit">
                                        <Clock className="w-4 h-4" />
                                        Duration: {task.duration}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* SECTION 2: Standard Allotted Schools */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h2 className="text-xl font-bold text-gray-900">My Allotted Schools</h2>
                </div>

                <div className="space-y-4">
                    {regularAssignments.map(school => (
                        <div key={school.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
                                <p className="text-sm text-gray-500">{school.address}</p>
                            </div>
                            <button className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default AssignmentsManager;