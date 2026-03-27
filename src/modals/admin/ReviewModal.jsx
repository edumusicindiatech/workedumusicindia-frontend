import {
    School, CheckCircle2, X, AlertTriangle, Plus, Minus, MessageSquare
} from "lucide-react";

const ReviewModal = ({ isOpen, onClose, activeReview, reviewMarks, setReviewMarks, reviewRemark, setReviewRemark, submitReview, isSubmitting, videoErrors, handleVideoError, selectedSchool }) => {
    if (!isOpen || !activeReview) return null;

    const incrementMarks = () => setReviewMarks(prev => Math.min(10, Number(prev) + 1));
    const decrementMarks = () => setReviewMarks(prev => Math.max(0, Number(prev) - 1));

    return (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card dark:bg-[#0d1117] border border-border rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col lg:flex-row shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="w-full lg:w-3/5 bg-slate-950 relative flex flex-col shrink-0 items-center justify-center min-h-[30vh] border-b lg:border-b-0 lg:border-r border-border">
                    {videoErrors[activeReview.fileId] || !activeReview.videoUrl ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-5">
                                <AlertTriangle className="w-10 h-10 opacity-40 text-destructive" />
                            </div>
                            <p className="font-black text-xl text-slate-300">Media Not Found</p>
                        </div>
                    ) : (
                        <video src={activeReview.videoUrl} controls autoPlay className="w-full h-full max-h-[40vh] lg:max-h-full object-contain" onError={() => handleVideoError(activeReview.fileId)} />
                    )}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg z-10">
                        <School className="w-4 h-4 text-white" />
                        <span className="text-sm font-bold text-white truncate max-w-50">{selectedSchool?.schoolName}</span>
                    </div>
                </div>

                <div className="w-full lg:w-2/5 flex flex-col p-6 sm:p-8 overflow-y-auto">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight">Grade Performance</h2>
                            <p className="text-sm font-semibold text-muted-foreground mt-1">{activeReview.eventName || 'Regular Class'} • {activeReview.eventDate}</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-muted hover:bg-destructive/10 hover:text-destructive rounded-full text-muted-foreground"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Score (1-10) <span className="text-destructive">*</span></label>
                            <div className="flex items-center justify-between bg-background border border-border p-2 rounded-2xl shadow-sm">
                                <button onClick={decrementMarks} className="w-14 h-14 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"><Minus className="w-6 h-6" /></button>
                                <div className="text-4xl font-black text-foreground w-20 text-center tabular-nums tracking-tighter">{reviewMarks}</div>
                                <button onClick={incrementMarks} className="w-14 h-14 rounded-xl bg-muted hover:bg-green-500/10 hover:text-green-500 flex items-center justify-center"><Plus className="w-6 h-6" /></button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" /> Administrator Feedback
                            </label>
                            <textarea rows="4" value={reviewRemark} onChange={(e) => setReviewRemark(e.target.value)} className="w-full p-4 bg-background border border-input rounded-2xl text-base font-medium focus:ring-2 focus:ring-primary/50 outline-none resize-none shadow-sm" placeholder="Add constructive feedback..." />
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-border flex gap-4">
                        <button onClick={onClose} className="px-6 py-4 rounded-2xl font-bold text-sm bg-muted text-foreground">Cancel</button>
                        <button onClick={submitReview} disabled={isSubmitting || videoErrors[activeReview.fileId]} className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex justify-center items-center gap-2 transition-all shadow-lg ${videoErrors[activeReview.fileId] ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-white hover:scale-[1.02]'}`}>
                            {isSubmitting ? 'Saving...' : <><CheckCircle2 className="w-5 h-5" /> Submit Grade</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal