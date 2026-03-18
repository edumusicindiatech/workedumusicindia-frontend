import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, X, Map, MapPin, ExternalLink } from "lucide-react";

const AssignTaskModal = ({ isOpen, onClose }) => {
    const [taskForm, setTaskForm] = useState({
        schoolName: "",
        location: "",
        latitude: "",
        longitude: "",
        timeFrom: "08:00",
        timeTo: "14:00",
        days: [],
        task: "",
        startDate: "",
        endDate: ""
    });

    if (!isOpen) return null;

    const toggleDay = (day) => {
        setTaskForm(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const openGoogleMaps = () => {
        const query = taskForm.location ? encodeURIComponent(taskForm.location) : "";
        const url = query
            ? `https://www.google.com/maps/search/?api=1&query=${query}`
            : "https://www.google.com/maps";

        window.open(url, "_blank");
    };

    const handleSave = () => {
        console.log("Saving Optional Task:", taskForm);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-border flex flex-col">

                <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary" /> Create Optional Task
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Primary Task */}
                    <div className="space-y-2">
                        <Label>Primary Task / Objective</Label>
                        <Input
                            placeholder="What is the employee supposed to do here?"
                            value={taskForm.task}
                            onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                        />
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-2">
                        <Label>Target School Name</Label>
                        <Input
                            placeholder="e.g. Lincoln High School"
                            value={taskForm.schoolName}
                            onChange={(e) => setTaskForm({ ...taskForm, schoolName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>School Address / Location</Label>
                        <Input
                            placeholder="e.g. 123 Education Blvd, Sultanpur"
                            value={taskForm.location}
                            onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
                        />
                    </div>

                    {/* Manual Map Coordinates */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <Label className="flex items-center gap-2"><Map className="w-4 h-4 text-primary" /> Geofence Coordinates</Label>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed hidden md:block">
                                    Required to enable GPS check-ins. Right-click the exact building on Google Maps to copy the coordinates.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={openGoogleMaps}
                                className="gap-2 text-xs h-8 bg-background shrink-0 shadow-sm"
                            >
                                <MapPin className="w-3 h-3 text-primary" />
                                Search on Maps
                                <ExternalLink className="w-3 h-3 text-muted-foreground ml-1" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Latitude</Label>
                                <Input
                                    placeholder="e.g. 26.2589"
                                    value={taskForm.latitude}
                                    onChange={(e) => setTaskForm({ ...taskForm, latitude: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Longitude</Label>
                                <Input
                                    placeholder="e.g. 82.0730"
                                    value={taskForm.longitude}
                                    onChange={(e) => setTaskForm({ ...taskForm, longitude: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Timings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                                type="time"
                                value={taskForm.timeFrom}
                                onChange={(e) => setTaskForm({ ...taskForm, timeFrom: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                                type="time"
                                value={taskForm.timeTo}
                                onChange={(e) => setTaskForm({ ...taskForm, timeTo: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Working Days */}
                    <div className="space-y-2">
                        <Label>Allowed Days</Label>
                        <div className="flex flex-wrap gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${taskForm.days.includes(day)
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={taskForm.startDate}
                                onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                            <Input
                                type="date"
                                value={taskForm.endDate}
                                onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-card p-6 border-t border-border flex justify-end gap-3 rounded-b-2xl">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button className="gap-2 shadow-glow" onClick={handleSave}>
                        <ClipboardList className="w-4 h-4" /> Send Request
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AssignTaskModal;