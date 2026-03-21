import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Film, FolderOpen, Image as ImageIcon, Download, Trash2, ExternalLink, ChevronRight, Users, FileText, Tag, CalendarDays, School } from "lucide-react";

// --- UPDATED MOCK DATA WITH SCHOOLS & CATEGORIES ---
const mockCollections = [
    {
        id: "m1",
        month: "March 2024",
        schools: [
            {
                id: "s1",
                name: "Lincoln High School",
                categories: [
                    {
                        id: "c1",
                        name: "Junior Band",
                        dates: [
                            {
                                id: "d1",
                                date: "Mar 15, 2024",
                                files: [
                                    { id: "f1", type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", title: "Morning Assembly & Warmup", size: "24.5 MB" },
                                    { id: "f2", type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", title: "Science Lab Practical", size: "112.8 MB" }
                                ]
                            },
                            {
                                id: "d2",
                                date: "Mar 10, 2024",
                                files: [
                                    { id: "f3", type: "image", url: "https://picsum.photos/seed/f3/800/450", title: "Classroom Setup Check", size: "2.1 MB" }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: "s2",
                name: "Washington Elementary",
                categories: [
                    {
                        id: "c2",
                        name: "Senior Band",
                        dates: [
                            {
                                id: "d3",
                                date: "Mar 12, 2024",
                                files: [
                                    { id: "f4", type: "image", url: "https://picsum.photos/seed/f4/800/450", title: "Band Practice Notes", size: "3.4 MB" }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
];

const MediaTab = ({ collections }) => {
    // Flow: Month -> School -> Category -> Date -> Media
    const [selectedMediaMonth, setSelectedMediaMonth] = useState(null);
    const [selectedMediaSchool, setSelectedMediaSchool] = useState(null);
    const [selectedMediaCategory, setSelectedMediaCategory] = useState(null);
    const [selectedMediaDate, setSelectedMediaDate] = useState(null);

    const handleDeleteMedia = (mediaId) => alert(`Media item ${mediaId} delete requested.`);

    // Handle Back Button Logic
    const handleBack = () => {
        if (selectedMediaDate) {
            setSelectedMediaDate(null);
        } else if (selectedMediaCategory) {
            setSelectedMediaCategory(null);
        } else if (selectedMediaSchool) {
            setSelectedMediaSchool(null);
        } else if (selectedMediaMonth) {
            setSelectedMediaMonth(null);
        }
    };

    // Ensure we have data to display (fallback to mock if empty or wrong format)
    const baseCollections = collections && collections.length > 0 && collections[0].schools ? collections : mockCollections;

    // FORCE INJECT DUMMY DATA FOR TESTING
    const displayCollections = baseCollections.map((month, mIndex) => ({
        ...month,
        schools: month.schools?.map((school, sIndex) => ({
            ...school,
            categories: school.categories?.map((cat, cIndex) => ({
                ...cat,
                dates: cat.dates?.map((date, dIndex) => ({
                    ...date,
                    files: date.files?.map((file, fIndex) => {
                        // Injecting test data into the very first file
                        if (mIndex === 0 && sIndex === 0 && cIndex === 0 && dIndex === 0 && fIndex === 0) {
                            return { ...file, studentsPresent: 45, description: "Students gathered for the morning assembly. Conducted basic physical warmup routines and stretching exercises." };
                        }
                        if (mIndex === 0 && sIndex === 0 && cIndex === 0 && dIndex === 0 && fIndex === 1) {
                            return { ...file, studentsPresent: 28, description: "Grade 10 students performing the titration experiment in the chemistry lab. All safety protocols were followed." };
                        }
                        return file;
                    })
                }))
            }))
        }))
    }));

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-300 pb-24 md:pb-8">
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-card border border-border min-h-100 sm:min-h-125 flex flex-col overflow-hidden">

                {/* --- HEADER --- */}
                <div className="p-4 sm:p-6 border-b border-border bg-muted/20 flex items-center gap-3 sm:gap-4">
                    {selectedMediaMonth ? (
                        <button onClick={handleBack} className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 hover:bg-muted rounded-full transition-colors active:scale-95 shrink-0">
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                        </button>
                    ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                            <Film className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                    )}

                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                            {selectedMediaDate ? `Media on ${selectedMediaDate.date}`
                                : selectedMediaCategory ? `${selectedMediaCategory.name} Uploads`
                                    : selectedMediaSchool ? `${selectedMediaSchool.name} Categories`
                                        : selectedMediaMonth ? `Schools in ${selectedMediaMonth.month}`
                                            : "Media Vault"}
                        </h3>
                        <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 truncate">
                            {selectedMediaDate ? `${selectedMediaDate.files.length} file(s) available`
                                : selectedMediaCategory ? `Select a date to view uploads`
                                    : selectedMediaSchool ? `Select a category to view dates`
                                        : selectedMediaMonth ? `Select a school to view categories`
                                            : "Select a month to browse teacher uploads."}
                        </p>
                    </div>
                </div>

                <div className="p-3 sm:p-4 md:p-6 flex-1 bg-muted/5">

                    {/* LEVEL 1: MONTHS */}
                    {!selectedMediaMonth && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-in slide-in-from-left-4 duration-300">
                            {displayCollections.map((m) => {
                                // Calculate total media across all schools, categories and dates
                                let totalMedia = 0;
                                m.schools?.forEach(s => {
                                    s.categories?.forEach(cat => {
                                        cat.dates?.forEach(d => {
                                            totalMedia += d.files?.length || 0;
                                        });
                                    });
                                });

                                return (
                                    <div
                                        key={m.id || m.month}
                                        onClick={() => setSelectedMediaMonth(m)}
                                        className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm hover:border-violet-500/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0 group-hover:scale-110 transition-transform">
                                                <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <h4 className="font-bold text-sm sm:text-lg text-foreground truncate">{m.month}</h4>
                                                    <span className="flex items-center justify-center bg-violet-500/10 text-violet-600 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold shrink-0">
                                                        {totalMedia} {totalMedia === 1 ? 'item' : 'items'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] sm:text-sm text-muted-foreground font-medium mt-0.5">Tap to view schools</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-violet-500 shrink-0 transition-colors" />
                                    </div>
                                );
                            })}
                            {displayCollections.length === 0 && (
                                <div className="col-span-full py-8 sm:py-10 text-center text-muted-foreground bg-card border border-dashed border-border rounded-xl text-xs sm:text-sm">
                                    No media collections found.
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 2: SCHOOLS */}
                    {selectedMediaMonth && !selectedMediaSchool && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-in slide-in-from-right-4 duration-300">
                            {selectedMediaMonth.schools?.map((school) => {
                                // Calculate total media across categories in this school
                                let totalSchoolMedia = 0;
                                school.categories?.forEach(cat => {
                                    cat.dates?.forEach(d => {
                                        totalSchoolMedia += d.files?.length || 0;
                                    });
                                });

                                return (
                                    <div
                                        key={school.id || school.name}
                                        onClick={() => setSelectedMediaSchool(school)}
                                        className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
                                                <School className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <h4 className="font-bold text-sm sm:text-lg text-foreground truncate">{school.name}</h4>
                                                    <span className="flex items-center justify-center bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold shrink-0">
                                                        {totalSchoolMedia} {totalSchoolMedia === 1 ? 'item' : 'items'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] sm:text-sm text-muted-foreground font-medium mt-0.5">Tap to view categories</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-emerald-500 shrink-0 transition-colors" />
                                    </div>
                                );
                            })}
                            {(!selectedMediaMonth.schools || selectedMediaMonth.schools.length === 0) && (
                                <div className="col-span-full py-8 sm:py-10 text-center text-muted-foreground bg-card border border-dashed border-border rounded-xl text-xs sm:text-sm">
                                    No schools found for this month.
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 3: CATEGORIES */}
                    {selectedMediaSchool && !selectedMediaCategory && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-in slide-in-from-right-4 duration-300">
                            {selectedMediaSchool.categories?.map((cat) => {
                                // Calculate total media across all dates in this category
                                const totalCatMedia = cat.dates?.reduce((acc, curr) => acc + (curr.files?.length || 0), 0) || 0;

                                return (
                                    <div
                                        key={cat.id || cat.name}
                                        onClick={() => setSelectedMediaCategory(cat)}
                                        className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                                                <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <h4 className="font-bold text-sm sm:text-lg text-foreground truncate">{cat.name}</h4>
                                                    <span className="flex items-center justify-center bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold shrink-0">
                                                        {totalCatMedia} {totalCatMedia === 1 ? 'item' : 'items'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] sm:text-sm text-muted-foreground font-medium mt-0.5">Tap to view dates</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 group-hover:text-blue-500 shrink-0 transition-colors" />
                                    </div>
                                );
                            })}
                            {(!selectedMediaSchool.categories || selectedMediaSchool.categories.length === 0) && (
                                <div className="col-span-full py-8 sm:py-10 text-center text-muted-foreground bg-card border border-dashed border-border rounded-xl text-xs sm:text-sm">
                                    No categories found for this school.
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 4: DATES */}
                    {selectedMediaCategory && !selectedMediaDate && (
                        <div className="space-y-2.5 sm:space-y-3 animate-in slide-in-from-right-4 duration-300">
                            {selectedMediaCategory.dates?.map((d) => (
                                <div
                                    key={d.id || d.date}
                                    onClick={() => setSelectedMediaDate(d)}
                                    className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg sm:rounded-xl bg-card hover:border-violet-500/50 transition-all cursor-pointer active:scale-[0.98] shadow-sm group"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className="p-2 sm:p-2.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-violet-500/10 group-hover:text-violet-500 transition-colors shrink-0">
                                            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <span className="font-bold w-24 sm:w-28 md:w-36 text-xs sm:text-base text-foreground shrink-0 truncate">{d.date}</span>
                                        <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/50 px-2 sm:px-3 py-1 rounded-full shrink-0">
                                            <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                                            <span className="text-[10px] sm:text-sm font-semibold text-muted-foreground">{d.files?.length || 0} <span className="hidden sm:inline">uploads</span></span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 shrink-0 group-hover:text-violet-500 transition-colors" />
                                </div>
                            ))}
                            {(!selectedMediaCategory.dates || selectedMediaCategory.dates.length === 0) && (
                                <div className="col-span-full py-8 sm:py-10 text-center text-muted-foreground bg-card border border-dashed border-border rounded-xl text-xs sm:text-sm">
                                    No dates found for this category.
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEVEL 5: MEDIA GRID */}
                    {selectedMediaDate && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-right-4 duration-300">
                            {selectedMediaDate.files?.map((file) => (
                                <div key={file.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col group">

                                    {/* Thumbnail / Video Section */}
                                    <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                                        {file.type === 'video' ? (
                                            <video src={file.url} controls className="w-full h-full object-cover" poster={`https://picsum.photos/seed/${file.id}/800/450`} />
                                        ) : (
                                            <img src={file.url} alt={file.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        )}
                                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-black/60 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md flex items-center gap-1 sm:gap-1.5 border border-white/10 z-10">
                                            {file.type === 'video' ? <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" /> : <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
                                            <span className="text-[9px] sm:text-xs font-medium text-white uppercase tracking-wider">{file.type}</span>
                                        </div>
                                    </div>

                                    {/* Details Section */}
                                    <div className="p-3 sm:p-4 flex flex-col flex-1 border-t border-border">
                                        <h4 className="font-semibold text-sm sm:text-base text-foreground truncate mb-0.5 sm:mb-1" title={file.title}>{file.title}</h4>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-3 sm:mb-4">{file.size} • Uploaded via Field App</p>

                                        {/* --- DYNAMIC STUDENTS & DESCRIPTION BLOCK --- */}
                                        {(file.studentsPresent != null || file.description) && (
                                            <div className="mb-3 sm:mb-4 bg-muted/40 rounded-lg p-3 space-y-2 border border-border/50">
                                                {file.studentsPresent != null && (
                                                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                                                        <Users className="w-4 h-4 text-violet-500" />
                                                        {file.studentsPresent} Students Present
                                                    </div>
                                                )}
                                                {file.description && (
                                                    <div className="flex items-start gap-2">
                                                        <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                        <p className="text-[11px] sm:text-xs text-muted-foreground italic leading-relaxed">
                                                            "{file.description}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                                            <div className="flex gap-2">
                                                <a href={file.url} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors" title="Open Link in New Tab">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <a href={file.url} download className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors" title="Download File">
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm text-destructive hover:text-destructive hover:bg-destructive/10 px-2.5" onClick={() => handleDeleteMedia(file.id)}>
                                                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!selectedMediaDate.files || selectedMediaDate.files.length === 0) && (
                                <div className="col-span-full py-8 sm:py-10 text-center text-muted-foreground bg-card border border-dashed border-border rounded-xl text-xs sm:text-sm">
                                    No media files uploaded for this date.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaTab;