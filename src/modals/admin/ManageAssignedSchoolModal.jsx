import { useState, useEffect } from "react";
import { 
    School, X, MapPin, Calendar, Clock, 
    Edit2, Trash2, ChevronDown, ChevronUp, Save, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ManageAssignedSchoolModal = ({ isOpen, onClose, school }) => {
    const [categories, setCategories] = useState([]);
    
    // UI States
    const [expandedCatId, setExpandedCatId] = useState(null);
    const [editingCatId, setEditingCatId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, categoryId: null, categoryName: "" });

    useEffect(() => {
        if (isOpen && school) {
            setCategories(school.categories || []);
            // Auto-expand the first category for better UX
            setExpandedCatId(school.categories?.[0]?.id || null);
            setEditingCatId(null);
            setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" });
        }
    }, [isOpen, school]);

    if (!isOpen || !school) return null;

    // --- HANDLERS ---
    const toggleExpand = (id) => {
        if (editingCatId === id) return; // Prevent collapse while editing
        setExpandedCatId(prev => prev === id ? null : id);
    };

    const format12Hour = (time24) => {
        if (!time24) return "";
        const [hour, min] = time24.split(":");
        const h = parseInt(hour);
        const ampm = h >= 12 ? "PM" : "AM";
        return `${h % 12 || 12}:${min} ${ampm}`;
    };

    const handleEditClick = (e, category) => {
        e.stopPropagation();
        setEditingCatId(category.id);
        setEditForm({ ...category }); 
        setExpandedCatId(category.id); // Keep it expanded
    };

    const handleCancelEdit = () => setEditingCatId(null);

    const handleSaveEdit = () => {
        setCategories(prev => prev.map(c => c.id === editingCatId ? { ...c, ...editForm } : c));
        setEditingCatId(null);
        console.log("Updated Category Data:", editForm);
    };

    const toggleEditDay = (day) => {
        setEditForm(prev => ({
            ...prev,
            days: prev.days?.includes(day) 
                ? prev.days.filter(d => d !== day) 
                : [...(prev.days || []), day]
        }));
    };

    // Delete Confirmation Handlers
    const openDeleteModal = (e, category) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, categoryId: category.id, categoryName: category.name });
    };

    const closeDeleteModal = () => setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" });

    const confirmDelete = () => {
        setCategories(prev => prev.filter(c => c.id !== deleteModal.categoryId));
        closeDeleteModal();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            
            {/* MAIN MODAL */}
            <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                    <div className="flex items-center gap-3 pr-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <School className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground line-clamp-1" title={school.name}>
                                {school.name}
                            </h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> {school.address}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* BODY (Added rounded-b-2xl and pb-6 here since the footer is gone) */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-muted/10 custom-scrollbar space-y-4 rounded-b-2xl pb-safe">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Assigned Categories</h3>

                    {categories.length === 0 ? (
                        <div className="text-center py-8 bg-background rounded-xl border border-dashed border-border">
                            <p className="text-muted-foreground font-medium">No categories assigned to this school.</p>
                        </div>
                    ) : (
                        categories.map((category) => {
                            const isExpanded = expandedCatId === category.id;
                            const isEditing = editingCatId === category.id;

                            return (
                                <div key={category.id} className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300">
                                    
                                    {/* Accordion Header */}
                                    <div 
                                        className={`p-4 sm:px-6 sm:py-5 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors ${isExpanded ? 'border-b border-border bg-muted/10' : ''}`} 
                                        onClick={() => toggleExpand(category.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-primary font-bold text-sm">{category.name.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground text-base">{category.name}</h4>
                                                {!isExpanded && <p className="text-xs text-muted-foreground font-medium mt-0.5">Assigned: {category.assignedDate}</p>}
                                            </div>
                                        </div>
                                        <div className="p-1">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                        </div>
                                    </div>

                                    {/* Accordion Body */}
                                    {isExpanded && (
                                        <div className="p-4 sm:p-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                            {!isEditing ? (
                                                
                                                /* READ-ONLY VIEW */
                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider"><Calendar className="w-3.5 h-3.5" /> Start Date</p>
                                                            <p className="text-sm font-bold text-foreground">{category.startDate || "Not set"}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider"><Calendar className="w-3.5 h-3.5" /> End Date</p>
                                                            <p className="text-sm font-bold text-foreground">{category.endDate || "Ongoing"}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-3.5 h-3.5" /> Timings</p>
                                                            <p className="text-sm font-bold text-foreground">
                                                                {format12Hour(category.timeFrom)} - {format12Hour(category.timeTo)}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">Scheduled Days</p>
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {category.days?.map(day => (
                                                                    <span key={day} className="px-2 py-0.5 bg-muted border border-border text-foreground text-[10px] font-bold rounded">
                                                                        {day}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ACTION BUTTONS */}
                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border">
                                                        <Button variant="outline" className="w-full sm:w-auto h-11 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={(e) => openDeleteModal(e, category)}>
                                                            <Trash2 className="w-4 h-4 mr-2" /> Revoke Assignment
                                                        </Button>
                                                        <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-sm" onClick={(e) => handleEditClick(e, category)}>
                                                            <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (

                                                /* INLINE EDIT FORM VIEW */
                                                <div className="space-y-5 bg-muted/20 border border-border rounded-xl p-5 animate-in slide-in-from-right-4 fade-in duration-200">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Start Date</Label>
                                                            <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({...editForm, startDate: e.target.value})} className="h-10 rounded-xl text-sm bg-background" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">End Date <span className="text-muted-foreground font-normal">(Opt)</span></Label>
                                                            <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} className="h-10 rounded-xl text-sm bg-background" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Start Time</Label>
                                                            <Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({...editForm, timeFrom: e.target.value})} className="h-10 rounded-xl text-sm bg-background" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">End Time</Label>
                                                            <Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({...editForm, timeTo: e.target.value})} className="h-10 rounded-xl text-sm bg-background" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Allowed Days</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                                <button 
                                                                    key={day} 
                                                                    type="button" 
                                                                    onClick={() => toggleEditDay(day)} 
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${editForm.days?.includes(day) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-border">
                                                        <Button variant="ghost" className="w-full sm:w-auto h-11 font-semibold" onClick={handleCancelEdit}>
                                                            Cancel Edit
                                                        </Button>
                                                        <Button className="w-full sm:w-auto h-11 px-8 font-bold shadow-glow bg-primary" onClick={handleSaveEdit}>
                                                            <Save className="w-4 h-4 mr-2" /> Save Changes
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* SUB-MODAL: DELETE CONFIRMATION                           */}
            {/* ======================================================== */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={closeDeleteModal}>
                    <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6 text-center animate-in zoom-in-95 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="font-bold text-xl mb-2 text-foreground">Revoke Assignment?</h3>
                        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                            Are you sure you want to remove <strong className="text-foreground">{deleteModal.categoryName}</strong> from this school? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold" onClick={closeDeleteModal}>Cancel</Button>
                            <Button variant="destructive" className="flex-1 h-11 rounded-xl font-bold shadow-sm" onClick={confirmDelete}>Yes, Revoke</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageAssignedSchoolModal;