import { useState } from "react";
import {
    MapPin, Calendar, Clock, ClipboardList,
    CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const OptionalTasks = () => {
    // Mock Data for assigned optional schools
    const [tasks, setTasks] = useState([
        {
            id: "TASK-001",
            schoolName: "Washington Middle School",
            location: "456 Elm Ave, North District",
            daysAllotted: ["Monday", "Wednesday"],
            duration: "2 Days",
            timing: "08:00 AM - 01:00 PM",
            taskDescription: "Conduct mid-term inventory check for science lab equipment and verify attendance registers."
        },
        {
            id: "TASK-002",
            schoolName: "Jefferson High School",
            location: "789 Pine Blvd, East District",
            daysAllotted: ["Thursday", "Friday"],
            duration: "2 Days",
            timing: "09:00 AM - 03:00 PM",
            taskDescription: "Assist with standardizing the new digital check-in system for the teaching staff."
        }
    ]);

    // State for Rejection Modal
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    // State for Success Message
    const [successMessage, setSuccessMessage] = useState("");

    const handleAccept = (id) => {
        // Here you will eventually make your API call to update the DB
        // For now, we remove it from this list and show success
        setTasks(tasks.filter(task => task.id !== id));

        setSuccessMessage("School accepted successfully! Added to your Assigned Schools.");
        setTimeout(() => setSuccessMessage(""), 4000); // Hide after 4 seconds
    };

    const openRejectModal = (id) => {
        setSelectedTaskId(id);
        setIsRejectModalOpen(true);
    };

    const handleRejectSubmit = () => {
        if (!rejectReason.trim()) return;

        // Here you will make your API call to log the rejection and reason
        console.log(`Task ${selectedTaskId} rejected. Reason: ${rejectReason}`);

        setTasks(tasks.filter(task => task.id !== selectedTaskId));
        setIsRejectModalOpen(false);
        setRejectReason("");
        setSelectedTaskId(null);
    };

    const closeRejectModal = () => {
        setIsRejectModalOpen(false);
        setRejectReason("");
        setSelectedTaskId(null);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                    Optional Tasks
                    <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-semibold">
                        {tasks.length} New
                    </span>
                </h1>
                <p className="text-muted-foreground mt-1">Review and accept additional school assignments.</p>
            </div>

            {/* Success Toast / Message */}
            {successMessage && (
                <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle className="w-5 h-5" />
                    <p className="font-semibold">{successMessage}</p>
                </div>
            )}

            {/* Task Cards Grid */}
            {tasks.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-sm">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">All caught up!</h3>
                    <p className="text-muted-foreground">You have no pending optional tasks at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {tasks.map((task) => (
                        <div key={task.id} className="bg-card border border-border rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow duration-300">

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">{task.schoolName}</h2>
                                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1 text-sm">
                                        <MapPin className="w-4 h-4" />
                                        <span>{task.location}</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                                    {task.id}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-5 bg-muted/30 p-4 rounded-xl border border-border/50">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5" /> Days
                                    </div>
                                    <p className="text-sm font-medium text-foreground">
                                        {task.daysAllotted.join(", ")} ({task.duration})
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                        <Clock className="w-3.5 h-3.5" /> Timing
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{task.timing}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-center gap-1.5 text-foreground font-semibold mb-2">
                                    <ClipboardList className="w-4 h-4 text-primary" />
                                    Task Description
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {task.taskDescription}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 pt-4 border-t border-border">
                                <Button
                                    onClick={() => handleAccept(task.id)}
                                    className="flex-1 bg-success hover:bg-success/90 text-white font-bold h-11 rounded-xl"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" /> Accept Task
                                </Button>
                                <Button
                                    onClick={() => openRejectModal(task.id)}
                                    variant="outline"
                                    className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 font-bold h-11 rounded-xl"
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Reject
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rejection Dialog Overlay */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card border border-border shadow-elevated w-full max-w-md rounded-2xl p-6 relative animate-in zoom-in-95">

                        <div className="flex items-center gap-3 text-destructive mb-4">
                            <div className="p-2 bg-destructive/10 rounded-full">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Reject Task</h2>
                        </div>

                        <p className="text-muted-foreground text-sm mb-4">
                            Please provide a brief reason for rejecting this optional assignment. This will be visible to the admin.
                        </p>

                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="I am rejecting this because..."
                            className="w-full min-h-30 rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-shadow mb-6"
                        />

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={closeRejectModal}
                                variant="outline"
                                className="flex-1 rounded-xl h-11 font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRejectSubmit}
                                disabled={!rejectReason.trim()}
                                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-11 font-semibold"
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OptionalTasks;