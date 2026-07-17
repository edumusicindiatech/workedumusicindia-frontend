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
    User, Camera, Lock, Globe, Moon, Search, LayoutGrid, Clock, AlertTriangle, RefreshCw, Cpu, Settings,
    Video, Users, Paperclip, Forward, ShieldCheck, Phone
} from "lucide-react";

// --- CUSTOM ICON ---
function CalendarCheckIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="m9 16 2 2 4-4" />
        </svg>
    )
}

// --- CATEGORY STRUCTURE ---
const rawCategories = [
    { id: "all", icon: <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [] },
    { id: "dashboard", icon: <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 55, 56] },
    { id: "assignments", icon: <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [10, 11, 12, 13, 14] },
    { id: "tasks", icon: <ListTodo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [15, 16, 17, 18, 19] },
    { id: "media", icon: <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [20, 21, 22, 23, 24, 25, 26, 27] },
    { id: "learning", icon: <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [28, 29, 30, 31, 32, 33] },
    { id: "leaderboard", icon: <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [34, 35, 36, 37, 38, 39] },
    { id: "reports", icon: <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [40, 41, 42, 43] },
    { id: "notifications", icon: <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [44, 45, 46, 47] },
    { id: "profile", icon: <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [48, 49, 50, 51, 52, 53, 54] },
    { id: "chat", icon: <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [62, 63, 64, 65, 66] },
    { id: "system", icon: <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />, items: [57, 58, 59, 60, 61] }
];

// --- ICONS MAP ---
const iconMap = {
    1: <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    2: <CalendarCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    3: <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
    4: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />,
    5: <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />,
    6: <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />,
    7: <CalendarX className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />,
    8: <CalendarPlus className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />,
    9: <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />,
    10: <Map className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />,
    11: <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />,
    12: <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />,
    13: <History className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />,
    14: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    15: <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />,
    16: <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    17: <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    18: <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
    19: <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />,
    20: <Film className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    21: <FolderHeart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />,
    22: <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    23: <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
    24: <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />,
    25: <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />,
    26: <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    27: <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />,
    28: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    29: <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
    30: <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    31: <Download className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />,
    32: <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />,
    33: <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    34: <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    35: <Target className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />,
    36: <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />,
    37: <LineChart className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    38: <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />,
    39: <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />,
    40: <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    41: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    42: <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    43: <Send className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
    44: <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    45: <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />,
    46: <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />,
    47: <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />,
    48: <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    49: <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
    50: <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />,
    51: <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    52: <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    53: <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />,
    54: <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />,
    55: <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />,
    56: <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    57: <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
    58: <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />,
    59: <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    60: <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />,
    61: <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />,
    62: <Video className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
    63: <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
    64: <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />,
    65: <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
    66: <Forward className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
};

// --- VISUAL UI EXAMPLES MAP ---
const visualMap = {
    4: (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-background border border-border rounded-xl flex flex-col gap-2 sm:gap-3 w-full sm:w-fit shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Example:</span>
            <button className="h-8 sm:h-10 px-4 sm:px-6 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-md"><MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Check-In</button>
        </div>
    ),
    9: (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-background border border-border rounded-xl flex flex-col items-center gap-2 sm:gap-3 w-full sm:w-fit shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Emergency Button:</span>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-red-600 border-2 sm:border-4 border-red-300 flex items-center justify-center text-white font-black text-xs sm:text-base tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse">SOS</div>
        </div>
    ),
    55: (
        <div className="mt-3 sm:mt-4 p-3 sm:p-5 bg-red-500/10 border border-red-500/20 rounded-3xl sm:rounded-4xl flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 w-full sm:w-fit shadow-sm">
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-[1.2rem] bg-zinc-800 border-2 sm:border-4 border-zinc-700 flex items-center justify-center text-red-500 shadow-inner"><AlertTriangle className="w-5 h-5 sm:w-7 sm:h-7" /></div>
                <span className="text-[8px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Not Working</span>
            </div>
            <div className="text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm font-bold text-center sm:text-left mt-1.5 sm:mt-0 leading-relaxed">
                <span className="hidden sm:inline text-red-500 mr-2">←</span> If it looks like this, <br className="hidden sm:block" /> Location is OFF
            </div>
        </div>
    ),
    56: (
        <div className="mt-3 sm:mt-4 p-4 sm:p-6 bg-slate-500/5 dark:bg-slate-900 border border-border/60 rounded-3xl sm:rounded-4xl space-y-3 sm:space-y-5 shadow-sm w-full max-w-sm">
            <p className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-border/60 pb-2 sm:pb-3">Step-by-Step for Chrome:</p>
            <div className="flex flex-col gap-2.5 sm:gap-4 text-[10px] sm:text-xs font-bold text-foreground/80">
                <div className="flex items-center gap-2 sm:gap-3"><div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/20 text-[9px] sm:text-xs">1</div> <span>Tap 3 dots (⋮)</span></div>
                <div className="flex items-center gap-2 sm:gap-3"><div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/20 text-[9px] sm:text-xs">2</div> <span>Settings → Site Settings</span></div>
                <div className="flex items-center gap-2 sm:gap-3"><div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/20 text-[9px] sm:text-xs">3</div> <span>Location → <span className="text-emerald-500 font-black uppercase tracking-wider">Allow</span></span></div>
                <div className="flex items-center gap-2 sm:gap-3"><div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/20 text-[9px] sm:text-xs">4</div> <button className="px-2 py-1 sm:px-3 sm:py-1.5 bg-primary hover:bg-primary/90 transition-colors text-primary-foreground rounded-md sm:rounded-lg flex items-center gap-1.5 sm:gap-2 shadow-sm text-[9px] sm:text-xs"><RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Refresh</button></div>
            </div>
        </div>
    ),
    58: (
        <div className="mt-3 sm:mt-4 p-3 sm:p-5 bg-card border border-border/60 rounded-3xl sm:rounded-4xl space-y-3 sm:space-y-4 w-full max-w-sm shadow-sm overflow-hidden">
            <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block ml-1">Shift Timeline:</span>
            <div className="flex items-center gap-1 sm:gap-1.5 w-full bg-muted/20 p-1 sm:p-1.5 rounded-full border border-border/50 shadow-inner">
                <div className="w-[45%] h-2 sm:h-3 bg-emerald-500 rounded-full" />
                <div className="w-[40%] h-2 sm:h-3 bg-amber-500 rounded-full" />
                <div className="w-[15%] h-2 sm:h-3 bg-destructive rounded-full" />
            </div>
            <div className="flex justify-between text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground px-1">
                <span>Start</span>
                <span className="text-center text-amber-500/80">1h 45m Late</span>
                <span className="text-right text-destructive/80">Absent</span>
            </div>
        </div>
    ),
    61: (
        <div className="mt-3 sm:mt-4 p-4 sm:p-6 bg-primary/5 border border-primary/20 rounded-3xl sm:rounded-4xl space-y-3 sm:space-y-4 w-full max-w-sm shadow-sm">
            <span className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em] block border-b border-primary/10 pb-2 sm:pb-3">Score Formula:</span>
            <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex justify-between items-center text-xs sm:text-sm font-extrabold gap-2 text-foreground/90"><span className="truncate">Attendance</span> <span className="text-emerald-500 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 sm:px-2 rounded-md border border-emerald-500/20 text-[10px] sm:text-xs">50 pts</span></div>
                <div className="flex justify-between items-center text-xs sm:text-sm font-extrabold gap-2 text-foreground/90"><span className="truncate">Video Quality</span> <span className="text-blue-500 shrink-0 bg-blue-500/10 px-1.5 py-0.5 sm:px-2 rounded-md border border-blue-500/20 text-[10px] sm:text-xs">50 pts</span></div>
                <div className="flex justify-between items-center text-xs sm:text-sm font-extrabold border-t border-primary/10 pt-2 sm:pt-3 text-destructive gap-2"><span className="truncate">Warnings</span> <span className="shrink-0 bg-destructive/10 px-1.5 py-0.5 sm:px-2 rounded-md border border-destructive/20 text-[10px] sm:text-xs">-10 pts each</span></div>
            </div>
        </div>
    ),
    62: (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-background border border-border rounded-xl flex gap-2 sm:gap-3 w-full sm:w-fit shadow-sm items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6B66FF] text-white rounded-lg text-xs font-bold shadow-sm">
                <Video className="w-3.5 h-3.5 fill-current" /> <ChevronDown className="w-3 h-3" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Call Menu Icon</span>
        </div>
    ),
    64: (
        <div className="mt-3 sm:mt-4 p-4 sm:p-5 bg-blue-500/5 border border-blue-500/20 rounded-3xl flex items-start gap-4 w-full max-w-sm shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-500">
                <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
                <p className="text-[11px] sm:text-xs font-black text-blue-500 uppercase tracking-widest">Admin Oversight</p>
                <p className="text-muted-foreground text-[10px] sm:text-xs font-bold leading-relaxed">Administrators can view sent messages for safety and project compliance.</p>
            </div>
        </div>
    )
};

const HelpFAQ = () => {
    const { t, i18n } = useTranslation();

    const [openIndex, setOpenIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleFAQ = (id) => {
        setOpenIndex((prevIndex) => (prevIndex === id ? null : id));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsCategoryDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fullFaqList = useMemo(() => {
        const list = [];
        // Updated loop to 66 to include new Chat FAQs
        for (let i = 1; i <= 66; i++) {
            list.push({
                id: i,
                question: t(`help_faq.faqs.${i}.q`),
                answer: t(`help_faq.faqs.${i}.a`),
                icon: iconMap[i],
                visual: visualMap[i] || null
            });
        }
        return list;
    }, [t, i18n.language]);

    const filteredFaqs = useMemo(() => {
        let results = fullFaqList;
        if (activeCategory !== "all") {
            const categoryData = rawCategories.find(c => c.id === activeCategory);
            if (categoryData) results = results.filter(faq => categoryData.items.includes(faq.id));
        }
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            results = results.filter(faq => faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query));
        }
        return results;
    }, [searchQuery, activeCategory, fullFaqList]);

    const currentCatObj = rawCategories.find(c => c.id === activeCategory) || rawCategories[0];

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-24 overflow-x-hidden mt-2 md:mt-0">

            {/* Header */}
            <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 pb-6 sm:pb-8 border-b border-border/50 relative z-20">
                <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-primary/20">
                        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight uppercase">
                            {t('help_faq.title', 'Help & FAQs')}
                        </h1>
                        <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            {t('help_faq.subtitle', 'Find answers quickly')}
                        </p>
                    </div>
                </div>

                <div className="relative w-full md:w-87.5 shrink-0 group">
                    <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-4.5 sm:h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text" value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null); }}
                        placeholder={t('help_faq.search_placeholder', 'Search questions...')}
                        className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-10 text-xs sm:text-sm font-bold bg-muted/20 border border-border/60 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors">
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categorization */}
            {searchQuery === "" && (
                <>
                    {/* Mobile Category Dropdown */}
                    <div className="md:hidden relative mb-6 sm:mb-8 z-30 w-full" ref={dropdownRef}>
                        <button onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="w-full h-11 sm:h-13 bg-muted/20 hover:bg-muted/40 border border-border/60 rounded-xl sm:rounded-2xl flex items-center justify-between px-4 sm:px-5 shadow-sm transition-colors">
                            <div className="flex items-center gap-2.5 sm:gap-3 text-foreground font-black text-xs sm:text-sm uppercase tracking-widest truncate">
                                <span className="p-1 sm:p-1.5 bg-background rounded-md sm:rounded-lg text-primary shrink-0 border border-border/50 shadow-sm">{currentCatObj.icon}</span>
                                <span className="truncate">{t(`help_faq.categories.${currentCatObj.id}`)}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                        </button>
                        <div className={`absolute top-full left-0 w-full mt-1.5 sm:mt-2 bg-card border border-border/60 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 origin-top ${isCategoryDropdownOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
                            <div className="p-1.5 sm:p-2 flex flex-col gap-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                {rawCategories.map(cat => (
                                    <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); setIsCategoryDropdownOpen(false); }} className={`flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs uppercase font-black tracking-widest transition-all text-left ${activeCategory === cat.id ? 'bg-primary/10 text-primary shadow-sm' : 'text-foreground hover:bg-muted/50'}`}>
                                        <span className={activeCategory === cat.id ? 'text-primary shrink-0' : 'text-muted-foreground shrink-0'}>{cat.icon}</span>
                                        <span className="truncate">{t(`help_faq.categories.${cat.id}`)}</span>
                                        {activeCategory === cat.id && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-auto shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Category Pills */}
                    <div className="hidden md:flex flex-wrap items-center gap-3 mb-10 pb-2">
                        {rawCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                                className={`flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all shrink-0 
                                    ${activeCategory === cat.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-muted/20 text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground'}`}
                            >
                                {cat.icon} {t(`help_faq.categories.${cat.id}`)}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* List */}
            {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 sm:py-16 md:py-24 bg-card border-2 border-dashed border-border/60 rounded-3xl sm:rounded-[3rem] px-4 flex flex-col items-center justify-center">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-muted-foreground/30 mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl md:text-2xl font-black text-foreground uppercase tracking-tight mb-1.5 sm:mb-2">
                        {t('help_faq.no_results', 'No Results')} "{searchQuery}"
                    </h3>
                    <p className="text-[10px] sm:text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 sm:mb-6">Try a different search term</p>
                    <button
                        onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                        className="h-10 sm:h-12 px-6 sm:px-8 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-black uppercase tracking-widest rounded-lg sm:rounded-xl text-[10px] sm:text-xs"
                    >
                        {t('help_faq.clear_search', 'Clear Search')}
                    </button>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {filteredFaqs.map((faq) => (
                        <div key={faq.id} className={`bg-card rounded-2xl sm:rounded-3xl transition-all duration-300 shadow-sm overflow-hidden ${openIndex === faq.id ? 'border-2 border-primary/40 ring-2 sm:ring-4 ring-primary/10' : 'border border-border/60 hover:border-primary/30 hover:shadow-md'}`}>

                            <button onClick={() => toggleFAQ(faq.id)} className={`w-full flex items-center justify-between p-3 sm:p-4 md:p-6 text-left focus:outline-none transition-colors ${openIndex === faq.id ? 'bg-primary/5' : 'bg-transparent'}`}>
                                <div className="flex items-center gap-3 sm:gap-4 md:gap-5 pr-3 sm:pr-4 overflow-hidden">
                                    <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-sm transition-colors ${openIndex === faq.id ? 'bg-background border-primary/20' : 'bg-muted/30 border-border/50'}`}>
                                        {faq.icon}
                                    </div>
                                    <h3 className={`font-extrabold text-xs sm:text-sm md:text-base leading-snug transition-colors ${openIndex === faq.id ? 'text-primary' : 'text-foreground'}`}>
                                        {faq.question}
                                    </h3>
                                </div>
                                <div className={`shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openIndex === faq.id ? 'bg-primary text-primary-foreground rotate-180 shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}>
                                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                                </div>
                            </button>

                            <div className={`grid transition-all duration-300 ease-in-out ${openIndex === faq.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className={`p-3 sm:p-4 md:p-6 pt-0 text-xs sm:text-sm md:text-base text-muted-foreground font-medium leading-relaxed whitespace-pre-line border-t border-border/50 ml-3 sm:ml-16 md:ml-18 mr-3 sm:mr-4 md:mr-6 mb-3 sm:mb-4 md:mb-6 mt-3 sm:mt-4 ${openIndex === faq.id ? '' : 'hidden'}`}>
                                        {faq.answer}
                                        {faq.visual && (
                                            <div className="animate-in fade-in zoom-in-95 duration-500 delay-150 w-full overflow-hidden mt-3 sm:mt-4">
                                                {faq.visual}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HelpFAQ;