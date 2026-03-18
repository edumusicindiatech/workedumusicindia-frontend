import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, X, Map, MapPin, ExternalLink } from "lucide-react";

const AssignSchoolModal = ({ isOpen, onClose }) => {
    const [schoolForm, setSchoolForm] = useState({
        schoolName: "", location: "", startDate: "", endDate: "", timeFrom: "08:00", timeTo: "14:00", days: [], latitude: "", longitude: ""
    });

    if (!isOpen) return null;

    const toggleDay = (day) => {
        setSchoolForm(prev => ({
            ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
        }));
    };

    const openGoogleMaps = () => {
        const query = schoolForm.location ? encodeURIComponent(schoolForm.location) : "";
        const url = query ? `https://www.google.com/maps/search/?api=1&query=${query}` : "https://www.google.com/maps";
        window.open(url, "_blank");
    };

    const handleSave = () => {
        console.log("Saving School:", schoolForm);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-card w-full max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0" onClick={e => e.stopPropagation()}>

                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-12 h-1.5 bg-muted rounded-full"></div>
                </div>

                <div className="sticky top-0 bg-card z-10 flex items-center justify-between px-6 pb-4 pt-2 md:pt-6 border-b border-border rounded-t-3xl md:rounded-t-2xl">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <School className="w-5 h-5 text-primary" /> Assign New School
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors hidden md:block">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <Label>School Name</Label>
                        <Input placeholder="e.g. Lincoln High School" value={schoolForm.schoolName} onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })} className="h-11 rounded-xl" />
                    </div>

                    <div className="space-y-2">
                        <Label>School Address / Location</Label>
                        <Input placeholder="123 Education Blvd" value={schoolForm.location} onChange={(e) => setSchoolForm({ ...schoolForm, location: e.target.value })} className="h-11 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={schoolForm.startDate} onChange={(e) => setSchoolForm({ ...schoolForm, startDate: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                            <Input type="date" value={schoolForm.endDate} onChange={(e) => setSchoolForm({ ...schoolForm, endDate: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input type="time" value={schoolForm.timeFrom} onChange={(e) => setSchoolForm({ ...schoolForm, timeFrom: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input type="time" value={schoolForm.timeTo} onChange={(e) => setSchoolForm({ ...schoolForm, timeTo: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>School Days</Label>
                        <div className="flex flex-wrap gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${schoolForm.days.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <Label className="flex items-center gap-2"><Map className="w-4 h-4 text-primary" /> Geofence Coordinates</Label>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Required for GPS check-ins. Search maps to get coordinates.
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={openGoogleMaps} className="gap-2 text-xs h-9 bg-background shrink-0 shadow-sm rounded-lg w-full md:w-auto">
                                <MapPin className="w-3 h-3 text-primary" />
                                Search Maps
                                <ExternalLink className="w-3 h-3 text-muted-foreground ml-1" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Latitude</Label>
                                <Input placeholder="26.2589" value={schoolForm.latitude} onChange={(e) => setSchoolForm({ ...schoolForm, latitude: e.target.value })} className="h-10 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Longitude</Label>
                                <Input placeholder="82.0730" value={schoolForm.longitude} onChange={(e) => setSchoolForm({ ...schoolForm, longitude: e.target.value })} className="h-10 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-muted/10 p-4 md:p-6 border-t border-border flex justify-end gap-3 rounded-b-3xl md:rounded-b-2xl pb-safe">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
                    <Button className="gap-2 shadow-glow rounded-xl" onClick={handleSave}>
                        <School className="w-4 h-4" /> Save
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AssignSchoolModal;