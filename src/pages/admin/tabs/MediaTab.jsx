import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Film, FolderOpen, Image as ImageIcon, Download, Trash2, ExternalLink, ChevronRight } from "lucide-react";

const MediaTab = ({ collections }) => {
    const [selectedMediaMonth, setSelectedMediaMonth] = useState(null);
    const [selectedMediaDate, setSelectedMediaDate] = useState(null);

    const handleDeleteMedia = (mediaId) => alert(`Media item ${mediaId} delete requested.`);

    return (
        <div className="bg-card rounded-xl shadow-card border border-border min-h-[400px] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-3">
                {selectedMediaDate ? (
                    <button onClick={() => setSelectedMediaDate(null)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors active:scale-95 shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                ) : selectedMediaMonth ? (
                    <button onClick={() => setSelectedMediaMonth(null)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors active:scale-95 shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                        <Film className="w-5 h-5" />
                    </div>
                )}

                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {selectedMediaDate ? `Media on ${selectedMediaDate.date}`
                            : selectedMediaMonth ? `Media in ${selectedMediaMonth.month}`
                                : "Media Vault"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedMediaDate ? `${selectedMediaDate.files.length} file(s) available`
                            : selectedMediaMonth ? `Select a date to view uploads`
                                : "Select a month to browse teacher uploads."}
                    </p>
                </div>
            </div>

            <div className="p-4 md:p-6 flex-1 bg-muted/5">
                {/* LEVEL 1: MONTHS */}
                {!selectedMediaMonth && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {collections.map((m) => {
                            const totalMedia = m.dates.reduce((acc, curr) => acc + curr.files.length, 0);
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedMediaMonth(m)}
                                    className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-violet-500/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
                                            <FolderOpen className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-lg text-foreground">{m.month}</h4>
                                                <span className="flex items-center justify-center bg-violet-500/10 text-violet-600 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                                    {totalMedia} {totalMedia === 1 ? 'item' : 'items'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium mt-0.5">Tap to view dates</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* LEVEL 2: DATES */}
                {selectedMediaMonth && !selectedMediaDate && (
                    <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                        {selectedMediaMonth.dates.map((d) => (
                            <div
                                key={d.id}
                                onClick={() => setSelectedMediaDate(d)}
                                className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:border-violet-500/50 transition-all cursor-pointer active:scale-[0.98] shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="font-bold w-28 md:w-36 text-base text-foreground">{d.date}</span>
                                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full">
                                        <Film className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-sm font-semibold text-muted-foreground">{d.files.length} uploads</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                            </div>
                        ))}
                    </div>
                )}

                {/* LEVEL 3: MEDIA GRID */}
                {selectedMediaDate && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                        {selectedMediaDate.files.map((file) => (
                            <div key={file.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col group">
                                <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                                    {file.type === 'video' ? (
                                        <video src={file.url} controls className="w-full h-full object-cover" poster={`https://picsum.photos/seed/${file.id}/800/450`} />
                                    ) : (
                                        <img src={file.url} alt={file.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    )}
                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-white/10 z-10">
                                        {file.type === 'video' ? <Film className="w-3.5 h-3.5 text-white" /> : <ImageIcon className="w-3.5 h-3.5 text-white" />}
                                        <span className="text-xs font-medium text-white uppercase tracking-wider">{file.type}</span>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-1 border-t border-border">
                                    <h4 className="font-semibold text-foreground truncate mb-1" title={file.title}>{file.title}</h4>
                                    <p className="text-xs text-muted-foreground font-medium mb-4">{file.size} • Uploaded via Field App</p>
                                    <div className="flex items-center justify-between mt-auto pt-2">
                                        <div className="flex gap-2">
                                            <a href={file.url} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors" title="Open Link in New Tab">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <a href={file.url} download className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors" title="Download File">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 px-2" onClick={() => handleDeleteMedia(file.id)}>
                                            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaTab;