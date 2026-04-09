import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
    HelpCircle, ChevronDown, MapPin, CheckCircle2, 
    LogOut, UserX, CalendarX, CalendarPlus, ShieldAlert,
    Map, Navigation, Activity, History, Sparkles,
    ListTodo, Bell, Info, CheckCircle, XCircle,
    Film, FolderHeart, Share2, UploadCloud, HardDrive, Cloud, Trash2, 
    ClipboardList, BookOpen, PlayCircle, Download,
    Trophy, Target, Palette, LineChart, Zap, Crown,
    FileText, MessageSquare, Send, CheckSquare, BellRing, Mail,
    User, Camera, Lock, Globe, Moon, Search, LayoutGrid
} from "lucide-react";

// Helper component for the missing icon
function CalendarCheckIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/>
    </svg>
  )
}

// Map the icons and exact grouping structure
const rawCategories = [
    { id: "all", icon: <LayoutGrid className="w-4 h-4" />, items: [] }, 
    { id: "dashboard", icon: <HelpCircle className="w-4 h-4"/>, items: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { id: "assignments", icon: <Map className="w-4 h-4"/>, items: [10, 11, 12, 13, 14] },
    { id: "tasks", icon: <ListTodo className="w-4 h-4"/>, items: [15, 16, 17, 18, 19] },
    { id: "media", icon: <Film className="w-4 h-4"/>, items: [20, 21, 22, 23, 24, 25, 26, 27] },
    { id: "learning", icon: <BookOpen className="w-4 h-4"/>, items: [28, 29, 30, 31, 32, 33] },
    { id: "leaderboard", icon: <Trophy className="w-4 h-4"/>, items: [34, 35, 36, 37, 38, 39] },
    { id: "reports", icon: <FileText className="w-4 h-4"/>, items: [40, 41, 42, 43] },
    { id: "notifications", icon: <BellRing className="w-4 h-4"/>, items: [44, 45, 46, 47] },
    { id: "profile", icon: <User className="w-4 h-4"/>, items: [48, 49, 50, 51, 52, 53, 54] }
];

// Map the exact icon for each FAQ question ID
const iconMap = {
    1: <HelpCircle className="w-5 h-5 text-blue-500" />,
    2: <CalendarCheckIcon className="w-5 h-5 text-indigo-500" />,
    3: <MapPin className="w-5 h-5 text-emerald-500" />,
    4: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    5: <LogOut className="w-5 h-5 text-sky-500" />,
    6: <UserX className="w-5 h-5 text-orange-500" />,
    7: <CalendarX className="w-5 h-5 text-red-500" />,
    8: <CalendarPlus className="w-5 h-5 text-purple-500" />,
    9: <ShieldAlert className="w-5 h-5 text-red-600" />,
    10: <Map className="w-5 h-5 text-teal-500" />,
    11: <Navigation className="w-5 h-5 text-blue-400" />,
    12: <Activity className="w-5 h-5 text-rose-500" />,
    13: <History className="w-5 h-5 text-indigo-400" />,
    14: <Sparkles className="w-5 h-5 text-amber-500" />,
    15: <ListTodo className="w-5 h-5 text-sky-500" />,
    16: <Bell className="w-5 h-5 text-amber-500" />,
    17: <Info className="w-5 h-5 text-blue-500" />,
    18: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    19: <XCircle className="w-5 h-5 text-destructive" />,
    20: <Film className="w-5 h-5 text-blue-500" />,
    21: <FolderHeart className="w-5 h-5 text-rose-500" />,
    22: <ClipboardList className="w-5 h-5 text-indigo-500" />,
    23: <Share2 className="w-5 h-5 text-emerald-500" />,
    24: <UploadCloud className="w-5 h-5 text-sky-500" />,
    25: <HardDrive className="w-5 h-5 text-orange-500" />,
    26: <Cloud className="w-5 h-5 text-amber-500" />,
    27: <Trash2 className="w-5 h-5 text-destructive" />,
    28: <BookOpen className="w-5 h-5 text-indigo-500" />,
    29: <PlayCircle className="w-5 h-5 text-emerald-500" />,
    30: <Info className="w-5 h-5 text-blue-500" />,
    31: <Download className="w-5 h-5 text-sky-500" />,
    32: <Share2 className="w-5 h-5 text-green-500" />,
    33: <UploadCloud className="w-5 h-5 text-amber-500" />,
    34: <Trophy className="w-5 h-5 text-amber-500" />,
    35: <Target className="w-5 h-5 text-sky-500" />,
    36: <Palette className="w-5 h-5 text-purple-500" />,
    37: <LineChart className="w-5 h-5 text-indigo-500" />,
    38: <Zap className="w-5 h-5 text-yellow-500" />,
    39: <Crown className="w-5 h-5 text-amber-600" />,
    40: <FileText className="w-5 h-5 text-blue-500" />,
    41: <MessageSquare className="w-5 h-5 text-indigo-500" />,
    42: <CheckSquare className="w-5 h-5 text-amber-500" />,
    43: <Send className="w-5 h-5 text-emerald-500" />,
    44: <BellRing className="w-5 h-5 text-amber-500" />,
    45: <Mail className="w-5 h-5 text-sky-500" />,
    46: <Palette className="w-5 h-5 text-purple-500" />,
    47: <Trash2 className="w-5 h-5 text-destructive" />,
    48: <User className="w-5 h-5 text-blue-500" />,
    49: <Camera className="w-5 h-5 text-emerald-500" />,
    50: <Trash2 className="w-5 h-5 text-destructive" />,
    51: <Lock className="w-5 h-5 text-amber-500" />,
    52: <Globe className="w-5 h-5 text-indigo-500" />,
    53: <Mail className="w-5 h-5 text-rose-500" />,
    54: <Moon className="w-5 h-5 text-slate-400" />
};

const HelpFAQ = () => {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    
    // State & Ref for Mobile Category Dropdown
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // Construct the full array dynamically using translations
    const fullFaqList = useMemo(() => {
        const list = [];
        for (let i = 1; i <= 54; i++) {
            list.push({
                id: i,
                question: t(`help_faq.faqs.${i}.q`),
                answer: t(`help_faq.faqs.${i}.a`),
                icon: iconMap[i]
            });
        }
        return list;
    }, [t]);

    // Perform Magical Filtering
    const filteredFaqs = useMemo(() => {
        let results = fullFaqList;

        // 1. Filter by Category if not "all"
        if (activeCategory !== "all") {
            const categoryData = rawCategories.find(c => c.id === activeCategory);
            if (categoryData) {
                results = results.filter(faq => categoryData.items.includes(faq.id));
            }
        }

        // 2. Filter by Search Query
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            results = results.filter(faq => 
                faq.question.toLowerCase().includes(query) || 
                faq.answer.toLowerCase().includes(query)
            );
        }

        return results;
    }, [searchQuery, activeCategory, fullFaqList]);

    const currentCatObj = rawCategories.find(c => c.id === activeCategory) || rawCategories[0];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-24">
            
            {/* Header & Search */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                        <HelpCircle className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{t('help_faq.title')}</h1>
                        <p className="text-muted-foreground text-sm sm:text-base font-medium mt-1">{t('help_faq.subtitle')}</p>
                    </div>
                </div>

                <div className="relative w-full md:w-80 shrink-0 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setOpenIndex(null); // Close any open FAQ when searching
                        }}
                        placeholder={t('help_faq.search_placeholder')}
                        className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary shadow-sm transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-full transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categorization Logic (Hidden if searching heavily) */}
            {searchQuery === "" && (
                <>
                    {/* MOBILE VIEW: Elegant Dropdown */}
                    <div className="md:hidden relative mb-6 z-20" ref={dropdownRef}>
                        <button
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="w-full h-12 bg-card border border-border rounded-xl flex items-center justify-between px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-colors hover:border-primary/50"
                        >
                            <div className="flex items-center gap-3 text-foreground font-bold text-sm">
                                <span className="p-1.5 bg-muted/50 rounded-lg text-primary">
                                    {currentCatObj.icon}
                                </span>
                                {t(`help_faq.categories.${currentCatObj.id}`)}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <div className={`absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden transition-all duration-200 ease-in-out origin-top ${isCategoryDropdownOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
                            <div className="p-1.5 flex flex-col gap-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                {rawCategories.map(cat => {
                                    const isActive = activeCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setActiveCategory(cat.id);
                                                setOpenIndex(null);
                                                setIsCategoryDropdownOpen(false);
                                            }}
                                            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all text-left ${
                                                isActive
                                                ? 'bg-primary/10 text-primary font-bold'
                                                : 'text-foreground hover:bg-muted font-medium'
                                            }`}
                                        >
                                            <span className={`${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                                {cat.icon}
                                            </span>
                                            {t(`help_faq.categories.${cat.id}`)}
                                            {isActive && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* DESKTOP VIEW: Wrapped Pills */}
                    <div className="hidden md:flex flex-wrap items-center gap-2.5 pb-2 mb-8">
                        {rawCategories.map(cat => {
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shrink-0 ${
                                        isActive 
                                        ? 'bg-primary text-primary-foreground border border-primary scale-105' 
                                        : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {cat.icon}
                                    {t(`help_faq.categories.${cat.id}`)}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Search Results Summary */}
            {searchQuery !== "" && (
                <p className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Found {filteredFaqs.length} results
                </p>
            )}

            {/* FAQ List */}
            {filteredFaqs.length === 0 ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl shadow-sm">
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground">{t('help_faq.no_results')} "{searchQuery}"</h3>
                    <button 
                        onClick={() => { setSearchQuery(""); setActiveCategory("all"); }} 
                        className="mt-4 px-6 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors"
                    >
                        {t('help_faq.clear_search')}
                    </button>
                </div>
            ) : (
                <div className="space-y-3 z-0 relative">
                    {filteredFaqs.map((faq) => {
                        const isOpen = openIndex === faq.id;

                        return (
                            <div 
                                key={faq.id} 
                                className={`bg-card border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm ${isOpen ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border hover:border-primary/30 hover:shadow-md'}`}
                            >
                                <button
                                    onClick={() => toggleFAQ(faq.id)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none"
                                >
                                    <div className="flex items-center gap-4 pr-4">
                                        <div className="shrink-0 p-2.5 bg-muted/50 rounded-xl border border-border/50">
                                            {faq.icon}
                                        </div>
                                        <h3 className={`font-bold text-sm sm:text-base leading-snug transition-colors ${isOpen ? 'text-primary' : 'text-foreground'}`}>
                                            {faq.question}
                                        </h3>
                                    </div>
                                    <div className={`shrink-0 p-1.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-primary/10 text-primary rotate-180' : 'text-muted-foreground'}`}>
                                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                </button>

                                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="p-4 sm:p-5 pt-0 text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/50 ml-[3.5rem] sm:ml-[4.5rem]">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HelpFAQ;