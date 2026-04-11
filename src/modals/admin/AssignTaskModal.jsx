import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, X, Map, MapPin, ExternalLink, Loader2, Calendar, Clock, ArrowRight, Check } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

const AssignTaskModal = ({ isOpen, onClose, employeeId, initialData, onSuccess }) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    const [taskForm, setTaskForm] = useState({
        task: "", schoolName: "", location: "", category: "Junior Band",
        startDate: "", endDate: "", timeFrom: "08:00", timeTo: "14:00",
        days: [], latitude: "", longitude: ""
    });

    // --- NEW: Pre-fill the form when cloned data is passed ---
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Safely extract coordinates (Handles new GeoJSON or legacy format)
                let lat = "";
                let lng = "";
                if (initialData.school?.location?.coordinates) {
                    lng = initialData.school.location.coordinates[0];
                    lat = initialData.school.location.coordinates[1];
                } else if (initialData.school?.geofence) {
                    lat = initialData.school.geofence.latitude;
                    lng = initialData.school.geofence.longitude;
                }

                // Fallbacks for legacy schema (duration/timing) vs new schema
                let parsedStartDate = initialData.startDate ? initialData.startDate.split('T')[0] : "";
                let parsedEndDate = initialData.endDate ? initialData.endDate.split('T')[0] : "";
                if (!parsedStartDate && initialData.duration) {
                    const durationParts = initialData.duration.split(" to ");
                    parsedStartDate = durationParts[0] || "";
                    parsedEndDate = durationParts[1] || "";
                }

                let parsedTimeFrom = initialData.startTime || "";
                let parsedTimeTo = initialData.endTime || "";
                if (!parsedTimeFrom && initialData.timing) {
                    const timeParts = initialData.timing.split(" - ");
                    parsedTimeFrom = timeParts[0] || "";
                    parsedTimeTo = timeParts[1] || "";
                }

                setTaskForm({
                    task: initialData.taskDescription || "",
                    schoolName: initialData.school?.schoolName || initialData.schoolName || "",
                    location: initialData.school?.address || initialData.location || "",
                    category: initialData.category || "Junior Band",
                    startDate: parsedStartDate,
                    endDate: parsedEndDate,
                    timeFrom: parsedTimeFrom || "08:00",
                    timeTo: parsedTimeTo || "14:00",
                    days: initialData.daysAllotted || [],
                    latitude: lat,
                    longitude: lng
                });
            } else {
                setTaskForm({
                    task: "", schoolName: "", location: "", category: "Junior Band", startDate: "", endDate: "", timeFrom: "08:00", timeTo: "14:00", days: [], latitude: "", longitude: ""
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; setIsDragging(true); };
    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) setDragOffset(delta);
    };
    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    const toggleDay = (day) => {
        setTaskForm(prev => ({
            ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
        }));
    };

    const handleSave = async () => {
        if (!taskForm.task || !taskForm.schoolName || !taskForm.startDate || !taskForm.latitude || !taskForm.longitude) {
            toast.error(t('assign_task.error_fields', 'Please fill in all required fields including geofence.'));
            return;
        }

        if (taskForm.days.length === 0) {
            toast.error(t('assign_task.error_days', 'Please select at least one working day.'));
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading(t('assign_task.toast_loading'));

        try {
            const payload = {
                schoolName: taskForm.schoolName,
                schoolAddress: taskForm.location,
                latitude: taskForm.latitude,
                longitude: taskForm.longitude,
                taskDescription: taskForm.task,
                category: taskForm.category,
                daysAllotted: taskForm.days,
                startDate: taskForm.startDate,
                endDate: taskForm.endDate,
                startTime: taskForm.timeFrom,
                endTime: taskForm.timeTo
            };

            await api.post(`/admin/employees/${employeeId}/assign-task`, payload);

            toast.success(t('assign_task.toast_success'), { id: loadingToast });
            if (onSuccess) onSuccess();
            handleClose();

        } catch (error) {
            console.error("Assign Task Error:", error);
            toast.error(error.response?.data?.message || t('assign_task.toast_error'), { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-sm animate-in fade-in'}`} onClick={!isLoading ? handleClose : undefined}>
            <div className={`bg-card w-full max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0' : ''}`} style={{ transform: `translateY(${dragOffset}px)` }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="sticky top-0 bg-card z-10 rounded-t-3xl md:rounded-t-2xl touch-none border-b border-border" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden"><div className="w-12 h-1.5 bg-muted rounded-full"></div></div>
                    <div className="flex items-center justify-between px-6 pb-4 pt-2 md:pt-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-primary" />
                            {initialData ? t('assign_task.title_clone', 'Clone Task') : t('assign_task.title', 'Assign New Task')}
                        </h2>
                        <button onClick={handleClose} disabled={isLoading} className="p-2 hover:bg-muted rounded-full transition-colors hidden md:block">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('assign_task.school_name')}</Label>
                            <Input placeholder={t('assign_task.school_name_placeholder')} value={taskForm.schoolName} onChange={(e) => setTaskForm({ ...taskForm, schoolName: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('assign_task.address')}</Label>
                            <Input placeholder={t('assign_task.address_placeholder')} value={taskForm.location} onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('assign_task.objective')}</Label>
                            <Input placeholder={t('assign_task.objective_placeholder')} value={taskForm.task} onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="pt-2">
                        <Label className="text-foreground text-sm font-medium block mb-3">{t('assign_task.category')}</Label>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setTaskForm({ ...taskForm, category: "Junior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-semibold text-sm transition-all ${taskForm.category === "Junior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                                {taskForm.category === "Junior Band" && <Check className="w-4 h-4" />} {t('assign_task.junior_band')}
                            </button>
                            <button type="button" onClick={() => setTaskForm({ ...taskForm, category: "Senior Band" })} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-semibold text-sm transition-all ${taskForm.category === "Senior Band" ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                                {taskForm.category === "Senior Band" && <Check className="w-4 h-4" />} {t('assign_task.senior_band')}
                            </button>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-muted/30 border border-border rounded-2xl p-4 md:p-5 space-y-5">
                        <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">{t('assign_task.timeline')}</Label>
                            <div className="flex flex-col md:flex-row items-center gap-3">
                                <div className="relative w-full"><div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><Calendar className="w-4 h-4" /></div><Input type="date" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-60" /></div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block shrink-0" />
                                <div className="relative w-full"><div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><Calendar className="w-4 h-4" /></div><Input type="date" value={taskForm.endDate} onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })} className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-60" /></div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">{t('assign_task.shift')}</Label>
                            <div className="flex flex-col md:flex-row items-center gap-3">
                                <div className="relative w-full"><div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><Clock className="w-4 h-4" /></div><Input type="time" value={taskForm.timeFrom} onChange={(e) => setTaskForm({ ...taskForm, timeFrom: e.target.value })} className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-60" /></div>
                                <span className="text-sm font-medium text-muted-foreground hidden md:block shrink-0">{t('assign_task.to')}</span>
                                <div className="relative w-full"><div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><Clock className="w-4 h-4" /></div><Input type="time" value={taskForm.timeTo} onChange={(e) => setTaskForm({ ...taskForm, timeTo: e.target.value })} className="h-11 rounded-xl pl-10 bg-background border-border shadow-sm focus-visible:ring-primary scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-60" /></div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">{t('assign_task.working_days')}</Label>
                            <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${taskForm.days.includes(day) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>{t(`assign_task.days.${day}`, day)}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Geofence */}
                    <div className="p-5 bg-background border border-border rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
                            <div>
                                <Label className="flex items-center gap-2 text-base"><Map className="w-4 h-4 text-primary" /> {t('assign_task.geofence_title')}</Label>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-62.5">{t('assign_task.geofence_desc')}</p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => window.open(`http://googleusercontent.com/maps.google.com/6${taskForm.latitude || 0},${taskForm.longitude || 0}`, "_blank", "noopener,noreferrer")}
                                variant="outline"
                                className="gap-2 text-sm font-medium h-10 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors shrink-0 border border-border w-full md:w-auto"
                            >
                                <MapPin className="w-4 h-4 text-primary" />
                                {t('assign_task.open_maps')}
                                <ExternalLink className="w-3 h-3 text-muted-foreground ml-1" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 relative z-10">
                            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('assign_task.latitude')}</Label><Input placeholder="26.2589" value={taskForm.latitude} onChange={(e) => setTaskForm({ ...taskForm, latitude: e.target.value })} className="h-11 rounded-xl bg-background border-border" /></div>
                            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('assign_task.longitude')}</Label><Input placeholder="82.0730" value={taskForm.longitude} onChange={(e) => setTaskForm({ ...taskForm, longitude: e.target.value })} className="h-11 rounded-xl bg-background border-border" /></div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-card p-4 md:p-6 border-t border-border flex justify-end gap-3 rounded-b-3xl md:rounded-b-2xl pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <Button variant="ghost" onClick={handleClose} disabled={isLoading} className="rounded-xl font-medium">{t('assign_task.cancel')}</Button>
                    <Button className="gap-2 shadow-glow rounded-xl font-semibold" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                        {isLoading ? t('assign_task.assigning') : t('assign_task.save_task')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AssignTaskModal; 