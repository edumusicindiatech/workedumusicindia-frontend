import { useState, useEffect } from "react";
import { X, Calendar, Plus, Loader2, Edit2, Trash2, Save, Palmtree, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import api from "../../api/axios";

// Helper to format string safely into IST "YYYY-MM-DD"
const toISTDateString = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper for UI display
const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const EmployeeHolidayModal = ({ isOpen, onClose, schoolId, schoolName, category }) => {
    const [holidays, setHolidays] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ title: "", startDate: "", endDate: "" });

    // Animation States
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen && schoolId) {
            fetchHolidays();
            resetForm();
        }
    }, [isOpen, schoolId, category]);

    const fetchHolidays = async () => {
        setIsLoading(true);
        try {
            // Hit the EMPLOYEE endpoint
            const res = await api.get(`/employee/school-holidays?schoolId=${schoolId}&category=${category}`);
            setHolidays(res.data.data);
        } catch (error) {
            toast.error("Failed to load holidays");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    const resetForm = () => {
        setForm({ title: "", startDate: "", endDate: "" });
        setIsAddingNew(false);
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!form.title || !form.startDate || !form.endDate) {
            return toast.error("All fields are required");
        }
        if (new Date(form.endDate) < new Date(form.startDate)) {
            return toast.error("End date cannot be before Start date");
        }

        setIsSaving(true);
        const loadingToast = toast.loading(editingId ? "Updating holiday..." : "Scheduling holiday...");

        try {
            const payload = {
                title: form.title,
                startDate: form.startDate,
                endDate: form.endDate,
                affectedSchools: [schoolId],
                category: category
            };

            if (editingId) {
                await api.put(`/employee/school-holidays/${editingId}`, payload);
                toast.success("Holiday updated successfully", { id: loadingToast });
            } else {
                await api.post(`/employee/school-holidays`, payload);
                toast.success("Holiday scheduled successfully", { id: loadingToast });
            }

            fetchHolidays();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save holiday", { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const loadingToast = toast.loading("Cancelling holiday...");
        try {
            await api.delete(`/employee/school-holidays/${id}`);
            toast.success("Holiday cancelled", { id: loadingToast });
            fetchHolidays();
        } catch (error) {
            toast.error("Failed to cancel holiday", { id: loadingToast });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 ${isClosing ? 'animate-out fade-out' : 'animate-in fade-in'}`} onClick={handleClose}>
            <div className={`bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border/50 flex flex-col max-h-[85vh] relative overflow-hidden ${isClosing ? 'animate-out zoom-out-95 slide-out-to-bottom-10' : 'animate-in zoom-in-95 slide-in-from-bottom-10'}`} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-border/50 flex items-start justify-between bg-muted/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <Palmtree className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground">Manage Holidays</h2>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                                <MapPin className="w-3.5 h-3.5" /> {schoolName} • {category}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Form Section */}
                    {(isAddingNew || editingId) ? (
                        <div className="bg-muted/10 p-5 rounded-2xl border border-border/50 mb-6 space-y-4 animate-in slide-in-from-top-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider">Holiday Title</Label>
                                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Break" className="bg-card" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider">Start Date</Label>
                                    <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="bg-card" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider">End Date</Label>
                                    <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="bg-card" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
                                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" disabled={isSaving} onClick={handleSave}>
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={() => setIsAddingNew(true)} className="w-full mb-6 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-bold h-12 rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> Schedule New Holiday
                        </Button>
                    )}

                    {/* List Section */}
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    ) : holidays.length === 0 ? (
                        <div className="text-center p-8 bg-muted/10 border border-dashed border-border rounded-2xl">
                            <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm font-bold text-muted-foreground">No upcoming holidays scheduled</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {holidays.map(holiday => (
                                <div key={holiday._id} className="bg-card border border-border/60 rounded-xl p-4 flex items-center justify-between group hover:border-amber-500/30 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-sm text-foreground">{holiday.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-amber-500/70" />
                                            {formatDisplayDate(holiday.startDate)}
                                            {holiday.startDate !== holiday.endDate && ` — ${formatDisplayDate(holiday.endDate)}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                            setEditingId(holiday._id);
                                            setForm({
                                                title: holiday.title,
                                                startDate: toISTDateString(holiday.startDate),
                                                endDate: toISTDateString(holiday.endDate)
                                            });
                                        }} className="p-2 bg-muted hover:bg-primary hover:text-white rounded-lg transition-colors text-muted-foreground">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(holiday._id)} className="p-2 bg-muted hover:bg-destructive hover:text-white rounded-lg transition-colors text-muted-foreground">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeHolidayModal;