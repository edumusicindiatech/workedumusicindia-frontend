import { useState } from "react";
import {
    MapPin, Calendar as CalendarIcon,
    CheckCircle, PlaySquare, StopCircle, Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";

const initialAssignments = [
    { id: 1, name: "Lincoln Elementary", address: "123 Oak Street", scheduledTime: "09:00 AM", status: "pending", checkInTime: null, checkOutTime: null },
    { id: 2, name: "Washington Middle School", address: "456 Elm Ave", scheduledTime: "11:30 AM", status: "pending", checkInTime: null, checkOutTime: null },
    { id: 3, name: "Jefferson High School", address: "789 Pine Blvd", scheduledTime: "02:00 PM", status: "pending", checkInTime: null, checkOutTime: null },
];

const AssignedSchools = () => {
    const [assignments, setAssignments] = useState(initialAssignments);

    // Handle the check-in and check-out lifecycle
    const updateAssignmentStatus = (id, newStatus) => {
        setAssignments(prev => prev.map(task => {
            if (task.id === id) {
                const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return {
                    ...task,
                    status: newStatus,
                    checkInTime: newStatus === 'in-progress' ? currentTime : task.checkInTime,
                    checkOutTime: newStatus === 'completed' ? currentTime : task.checkOutTime,
                };
            }
            return task;
        }));
    };

    // Calculate progress
    const completedTasks = assignments.filter(a => a.status === 'completed').length;
    const progressPercentage = (completedTasks / assignments.length) * 100;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in max-w-4xl mx-auto">

            {/* Page Header & Progress */}
            <div className="bg-card rounded-2xl p-6 md:p-8 border border-border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <CalendarIcon className="w-6 h-6 text-primary" />
                            Today's Route
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            You have {assignments.length} schools assigned to your itinerary today.
                        </p>
                    </div>

                    <div className="w-full md:w-64">
                        <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-foreground">Daily Progress</span>
                            <span className="text-primary">{completedTasks} of {assignments.length}</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-in-out"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            <div className="space-y-5">
                {assignments.map((school, index) => (
                    <div
                        key={school.id}
                        className={`bg-card rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden
                            ${school.status === 'in-progress' ? 'border-primary shadow-glow ring-1 ring-primary/20' : 'border-border'}
                            ${school.status === 'completed' ? 'opacity-80 bg-muted/20' : ''}
                        `}
                    >
                        {/* Status Header Bar */}
                        {school.status === 'in-progress' && (
                            <div className="bg-primary/10 px-6 py-2 border-b border-primary/20 flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                </span>
                                <span className="text-sm font-semibold text-primary">Currently Visiting</span>
                            </div>
                        )}

                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                {/* School Info */}
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                            {index + 1}
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">{school.name}</h3>
                                    </div>
                                    <div className="pl-11 space-y-1">
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4" /> {school.address}
                                        </p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <CalendarIcon className="w-4 h-4" /> Scheduled: {school.scheduledTime}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pl-11 sm:pl-0 pt-2 sm:pt-0 min-w-[160px]">

                                    {school.status === "pending" && (
                                        <div className="space-y-2">
                                            <Button
                                                onClick={() => updateAssignmentStatus(school.id, "in-progress")}
                                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl gap-2 h-11"
                                            >
                                                <PlaySquare className="w-4 h-4" /> Mark Check-In
                                            </Button>
                                            <Button variant="outline" className="w-full text-muted-foreground rounded-xl gap-2 h-10 border-border bg-background">
                                                <Navigation className="w-4 h-4" /> Get Directions
                                            </Button>
                                        </div>
                                    )}

                                    {school.status === "in-progress" && (
                                        <div className="space-y-3">
                                            <div className="text-sm font-medium text-primary text-center bg-primary/5 py-1.5 rounded-lg border border-primary/10">
                                                In: {school.checkInTime}
                                            </div>
                                            <Button
                                                onClick={() => updateAssignmentStatus(school.id, "completed")}
                                                variant="outline"
                                                className="w-full border-warning text-warning hover:bg-warning/10 hover:text-warning rounded-xl gap-2 h-11 bg-background font-semibold"
                                            >
                                                <StopCircle className="w-5 h-5" /> Check Out
                                            </Button>
                                        </div>
                                    )}

                                    {school.status === "completed" && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-center gap-2 text-sm font-bold text-success bg-success/10 px-4 py-2 rounded-lg">
                                                <CheckCircle className="w-4 h-4" /> Completed
                                            </div>
                                            <div className="text-xs text-center font-medium text-muted-foreground">
                                                {school.checkInTime} — {school.checkOutTime}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {progressPercentage === 100 && (
                <div className="bg-success/10 border border-success/30 rounded-2xl p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-success">All Assigned Schools Completed!</h3>
                    <p className="text-success/80 text-sm mt-1">Great job! Don't forget to submit your daily report and media uploads.</p>
                </div>
            )}
        </div>
    );
};

export default AssignedSchools;