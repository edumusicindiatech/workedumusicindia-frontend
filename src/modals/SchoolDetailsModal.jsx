import { useState, useEffect } from "react";
import { X, CheckCircle2, Clock, MapPin, UserX, PartyPopper, ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";

const SchoolDetailsModal = ({ isOpen, onClose, school }) => {
    // State to track which category the user clicked into
    const [activeCategory, setActiveCategory] = useState(null);

    // Reset back to the selection screen whenever the modal closes or opens a new school
    useEffect(() => {
        if (isOpen) setActiveCategory(null);
    }, [isOpen, school]);

    if (!isOpen || !school) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            {/* Changed: Removed mobile bottom-sheet classes. 
              Added: Uniform rounded-2xl, centered zoom-in animation, and transition-all for smooth height changes. 
            */}
            <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] transition-all duration-300 ease-out animate-in zoom-in-95 fade-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className="px-6 py-5 border-b border-border flex items-start justify-between bg-muted/30 shrink-0">
                    <div className="flex items-start gap-3">
                        {/* Show Back Button ONLY if a category is selected */}
                        {activeCategory && (
                            <button 
                                onClick={() => setActiveCategory(null)} 
                                className="mt-0.5 p-1.5 hover:bg-muted rounded-full transition-colors border border-transparent hover:border-border"
                            >
                                <ChevronLeft className="w-5 h-5 text-foreground" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                {school.name}
                            </h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5" /> {school.address}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors bg-background border border-border shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="p-6 overflow-y-auto flex-1">
                    
                    {/* VIEW 1: CATEGORY SELECTION */}
                    {!activeCategory ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" /> Select Assigned Category
                            </h3>
                            
                            <div className="grid gap-3">
                                {school.categories.map((category, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setActiveCategory(category)}
                                        className="group flex items-center justify-between p-4 rounded-xl bg-background border border-border hover:border-primary hover:shadow-md cursor-pointer transition-all duration-200"
                                    >
                                        <div>
                                            <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                                                {category.name}
                                            </span>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                View 30-day attendance record & events
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (

                    /* VIEW 2: 30-DAY CATEGORY RECORD */
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                    {activeCategory.name}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">Last 30 Days</span>
                            </div>

                            {/* High-Level Stats for this Category */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                                    <p className="text-2xl font-bold text-emerald-500 leading-none">{activeCategory.stats.present}</p>
                                    <p className="text-[10px] uppercase font-bold text-emerald-500/70 mt-1 tracking-wider">Present</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <Clock className="w-6 h-6 text-amber-500 mb-2" />
                                    <p className="text-2xl font-bold text-amber-500 leading-none">{activeCategory.stats.late}</p>
                                    <p className="text-[10px] uppercase font-bold text-amber-500/70 mt-1 tracking-wider">Late</p>
                                </div>
                                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <UserX className="w-6 h-6 text-destructive mb-2" />
                                    <p className="text-2xl font-bold text-destructive leading-none">{activeCategory.stats.absent}</p>
                                    <p className="text-[10px] uppercase font-bold text-destructive/70 mt-1 tracking-wider">Absent</p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <PartyPopper className="w-6 h-6 text-blue-500 mb-2" />
                                    <p className="text-2xl font-bold text-blue-500 leading-none">{activeCategory.stats.events}</p>
                                    <p className="text-[10px] uppercase font-bold text-blue-500/70 mt-1 tracking-wider">Events</p>
                                </div>
                            </div>

                            {/* Recent History Log for this Category */}
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Timeline</h3>
                                <div className="space-y-4">
                                    {activeCategory.history.length > 0 ? (
                                        activeCategory.history.map((log, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                {/* Timeline Dot */}
                                                <div className="flex flex-col items-center mt-1">
                                                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                                                        log.status === 'Present' ? 'bg-emerald-500' :
                                                        log.status === 'Late' ? 'bg-amber-500' :
                                                        log.status === 'Absent' ? 'bg-destructive' : 'bg-blue-500' // Event Color
                                                    }`} />
                                                    {idx !== activeCategory.history.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
                                                </div>
                                                
                                                {/* Log Content */}
                                                <div className="flex-1 pb-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                        <p className="font-bold text-sm text-foreground">{log.date}</p>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                                                            log.status === 'Present' ? 'text-emerald-500 bg-emerald-500/10' :
                                                            log.status === 'Late' ? 'text-amber-500 bg-amber-500/10' :
                                                            log.status === 'Absent' ? 'text-destructive bg-destructive/10' : 'text-blue-500 bg-blue-500/10'
                                                        }`}>
                                                            {log.status === 'Event' && <PartyPopper className="w-3 h-3" />}
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Display the note/event description if it exists */}
                                                    {log.note && (
                                                        <div className={`p-3 rounded-lg border mt-2 ${log.status === 'Event' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-muted/50 border-border/50'}`}>
                                                            <p className={`text-sm flex items-start gap-2 ${log.status === 'Event' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-muted-foreground italic'}`}>
                                                                {log.status === 'Event' ? <strong>Description:</strong> : null}
                                                                {log.note}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl border border-border border-dashed">
                                            No attendance records found for the last 30 days.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SchoolDetailsModal;