import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, X, Map, MapPin, ExternalLink, Check, Loader2, Calendar, Clock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

const AssignSchoolModal = ({ isOpen, onClose, employeeId, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    
    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false); // Controls the fade-out
    const dragStartY = useRef(0);

    const [schoolForm, setSchoolForm] = useState({
        schoolName: "", location: "", category: "Junior Band",
        startDate: "", endDate: "", timeFrom: "08:00", timeTo: "14:00",
        days: [], latitude: "", longitude: ""
    });

    if (!isOpen) return null;

    // --- UNIFIED SMOOTH CLOSE LOGIC ---
    const handleClose = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight); // Push it completely off the bottom of the screen
        
        // Wait for the 300ms CSS transition to finish before actually unmounting
        setTimeout(() => {
            onClose();
            // Reset states invisibly so it's ready for the next time it opens
            setIsClosing(false); 
            setDragOffset(0);
        }, 300);
    };

    // --- DRAWER SWIPE LOGIC ---
    const handleTouchStart = (e) => {
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const delta = currentY - dragStartY.current;
        
        // Only allow dragging downwards
        if (delta > 0) {
            setDragOffset(delta);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        // If dragged down more than 120px, trigger the smooth close
        if (dragOffset > 120) {
            handleClose();
        } else {
            // Not dragged enough, snap back to top smoothly
            setDragOffset(0);
        }
    };

    const toggleDay = (day) => {
        setSchoolForm(prev => ({
            ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
        }));
    };

    const handleSave = async () => {
        if (!schoolForm.schoolName || !schoolForm.location || !schoolForm.startDate || !schoolForm.latitude || !schoolForm.longitude) {
            toast.error("Please fill in all required fields, including GPS coordinates.");
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading("Assigning school and sending notifications...");

        try {
            const payload = {
                schoolName: schoolForm.schoolName, schoolAddress: schoolForm.location,
                category: schoolForm.category, startDate: schoolForm.startDate,
                endDate: schoolForm.endDate, startTime: schoolForm.timeFrom,
                endTime: schoolForm.timeTo, allowedDays: schoolForm.days,
                latitude: schoolForm.latitude, longitude: schoolForm.longitude
            };

            await api.post(`/admin/employees/${employeeId}/assign-school`, payload);
            toast.success("School successfully assigned!", { id: loadingToast });

            if (onSuccess) onSuccess();
            handleClose(); // Use smooth close here too!

        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to assign school.", { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            // IMPROVEMENT: Added dynamic opacity to fade the backdrop smoothly when closing
            className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-sm animate-in fade-in'}`} 
            onClick={!isLoading ? handleClose : undefined}
        >
            <div 
                className={`bg-card w-full max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0' : ''}`}
                style={{ transform: `translateY(${dragOffset}px)` }}
                onClick={e => e.stopPropagation()}
            >

                {/* --- DRAGGABLE HEADER AREA --- */}
                <div 
                    className="sticky top-0 bg-card z-10 rounded-t-3xl md:rounded-t-2xl touch-none border-b border-border"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Mobile Pull Handle */}
                    <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
                    </div>

                    {/* Modal Title */}
                    <div className="flex items-center justify-between px-6 pb-4 pt-1 md:pt-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <School className="w-5 h-5 text-primary" /> Assign New School
                        </h2>
                        <button onClick={handleClose} disabled={isLoading} className="p-2 hover:bg-muted rounded-full transition-colors hidden md:block">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* --- SCROLLABLE FORM CONTENT --- */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>School Name</Label>
                            <Input placeholder="e.g. Lincoln High School" value={schoolForm.schoolName} onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })} className="h-11 rounded-xl" />
                        </div>

                        <div className="space-y-2">
                            <Label>School Address / Location</Label>
                            <Input placeholder="123 Education Blvd" value={schoolForm.location} onChange={(e) => setSchoolForm({ ...schoolForm, location: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="pt-2">
                        <Label className="text-foreground text-sm font-medium block mb-3">Assignment Category</Label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setSchoolForm({ ...schoolForm, category: "Junior Band" })}
                                className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-semibold text-sm transition-all ${schoolForm.category === "Junior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                            >
                                {schoolForm.category === "Junior Band" && <Check className="w-4 h-4" />} Junior Band
                            </button>
                            <button
                                type="button"
                                onClick={() => setSchoolForm({ ...schoolForm, category: "Senior Band" })}
                                className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-semibold text-sm transition-all ${schoolForm.category === "Senior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                            >
                                {schoolForm.category === "Senior Band" && <Check className="w-4 h-4" />} Senior Band
                            </button>
                        </div>
                    </div>

                    {/* Modern Date & Time Section */}
                    <div className="bg-muted/30 border border-border rounded-2xl p-4 md:p-5 space-y-5">
                        
                        {/* Dates */}
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">Timeline</Label>
                            <div className="flex flex-col md:flex-row items-center gap-3">
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <Input 
                                        type="date" 
                                        value={schoolForm.startDate} 
                                        onChange={(e) => setSchoolForm({ ...schoolForm, startDate: e.target.value })} 
                                        className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-60" 
                                    />
                                </div>
                                
                                <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block shrink-0" />
                                
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <Input 
                                        type="date" 
                                        value={schoolForm.endDate} 
                                        onChange={(e) => setSchoolForm({ ...schoolForm, endDate: e.target.value })} 
                                        className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-60" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Times */}
                        <div className="pt-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">Daily Shift</Label>
                            <div className="flex flex-col md:flex-row items-center gap-3">
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <Input 
                                        type="time" 
                                        value={schoolForm.timeFrom} 
                                        onChange={(e) => setSchoolForm({ ...schoolForm, timeFrom: e.target.value })} 
                                        className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-60" 
                                    />
                                </div>
                                
                                <span className="text-sm font-medium text-muted-foreground hidden md:block shrink-0">to</span>
                                
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <Input 
                                        type="time" 
                                        value={schoolForm.timeTo} 
                                        onChange={(e) => setSchoolForm({ ...schoolForm, timeTo: e.target.value })} 
                                        className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-60" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Days */}
                        <div className="pt-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">Working Days</Label>
                            <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button 
                                        key={day} type="button" onClick={() => toggleDay(day)} 
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${schoolForm.days.includes(day) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Geofence Section */}
                    <div className="p-5 bg-background border border-border rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
                            <div>
                                <Label className="flex items-center gap-2 text-base"><Map className="w-4 h-4 text-primary" /> Geofence Coordinates</Label>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-[250px]">
                                    Required for GPS check-ins. Copy the coordinates directly from Maps.
                                </p>
                            </div>
                            
                            <a 
                                href="http://googleusercontent.com/maps.google.com/" target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 text-sm font-medium h-10 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors shrink-0 border border-border w-full md:w-auto"
                            >
                                <MapPin className="w-4 h-4 text-primary" /> 
                                Open Google Maps 
                                <ExternalLink className="w-3 h-3 text-muted-foreground ml-1" />
                            </a>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 relative z-10">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latitude</Label>
                                <Input placeholder="26.2589" value={schoolForm.latitude} onChange={(e) => setSchoolForm({ ...schoolForm, latitude: e.target.value })} className="h-11 rounded-xl bg-background border-border" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Longitude</Label>
                                <Input placeholder="82.0730" value={schoolForm.longitude} onChange={(e) => setSchoolForm({ ...schoolForm, longitude: e.target.value })} className="h-11 rounded-xl bg-background border-border" />
                            </div>
                        </div>
                    </div>

                </div>

                {/* --- STICKY FOOTER --- */}
                <div className="sticky bottom-0 bg-card p-4 md:p-6 border-t border-border flex justify-end gap-3 rounded-b-3xl md:rounded-b-2xl pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <Button variant="ghost" onClick={handleClose} disabled={isLoading} className="rounded-xl font-medium">Cancel</Button>
                    <Button className="gap-2 shadow-glow rounded-xl font-semibold" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <School className="w-4 h-4" />}
                        {isLoading ? "Saving..." : "Save Assignment"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AssignSchoolModal;