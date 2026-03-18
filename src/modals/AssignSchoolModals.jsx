import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, X, Map, MapPin, ExternalLink, Loader2 } from "lucide-react";

const AssignSchoolModal = ({ isOpen, onClose }) => {
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    const [schoolForm, setSchoolForm] = useState({
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
        setSchoolForm(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const handleAutoFetchLocation = async () => {
        if (!schoolForm.location) {
            alert("Please enter a School Address / Location first.");
            return;
        }

        setIsFetchingLocation(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSchoolForm(prev => ({
                ...prev,
                latitude: "26.2589",
                longitude: "82.0730"
            }));

        } catch (error) {
            console.error("Failed to fetch coordinates", error);
            alert("Failed to find coordinates for that address.");
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleSave = () => {
        console.log("Saving assignment:", schoolForm);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-border flex flex-col">

                <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <School className="w-5 h-5 text-primary" /> Assign New School
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-2">
                        <Label>School Name</Label>
                        <Input
                            placeholder="e.g. Lincoln High School"
                            value={schoolForm.schoolName}
                            onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>School Address / Location</Label>
                        <Input
                            placeholder="e.g. 123 Education Blvd, Sultanpur"
                            value={schoolForm.location}
                            onChange={(e) => setSchoolForm({ ...schoolForm, location: e.target.value })}
                        />
                    </div>

                    {/* Map Coordinates */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="flex items-center gap-2"><Map className="w-4 h-4 text-primary" /> Geofence Coordinates</Label>
                                <p className="text-xs text-muted-foreground mt-1">Required to enable GPS check-ins for the employee.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAutoFetchLocation}
                                disabled={isFetchingLocation}
                                className="gap-2 text-xs h-8 bg-background"
                            >
                                {isFetchingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3 text-primary" />}
                                {isFetchingLocation ? "Finding..." : "Auto-Fetch from Address"}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Latitude</Label>
                                <Input
                                    placeholder="e.g. 26.2589"
                                    value={schoolForm.latitude}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, latitude: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Longitude</Label>
                                <Input
                                    placeholder="e.g. 82.0730"
                                    value={schoolForm.longitude}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, longitude: e.target.value })}
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
                                value={schoolForm.timeFrom}
                                onChange={(e) => setSchoolForm({ ...schoolForm, timeFrom: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                                type="time"
                                value={schoolForm.timeTo}
                                onChange={(e) => setSchoolForm({ ...schoolForm, timeTo: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Working Days */}
                    <div className="space-y-2">
                        <Label>School Days</Label>
                        <div className="flex flex-wrap gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${schoolForm.days.includes(day)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-card text-muted-foreground border-border hover:bg-muted'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Task & Dates */}
                    <div className="space-y-2">
                        <Label>Primary Task / Objective</Label>
                        <Input
                            placeholder="What is the employee supposed to do here?"
                            value={schoolForm.task}
                            onChange={(e) => setSchoolForm({ ...schoolForm, task: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={schoolForm.startDate}
                                onChange={(e) => setSchoolForm({ ...schoolForm, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                            <Input
                                type="date"
                                value={schoolForm.endDate}
                                onChange={(e) => setSchoolForm({ ...schoolForm, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-card p-6 border-t border-border flex justify-end gap-3 rounded-b-2xl">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button className="gap-2 shadow-glow" onClick={handleSave}>
                        <School className="w-4 h-4" /> Save Assignment
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AssignSchoolModal;