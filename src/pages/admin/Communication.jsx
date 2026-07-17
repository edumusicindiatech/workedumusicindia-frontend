import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Send, Users, Bell, UserCheck, Search, CheckCircle2, 
    Clock, Loader2, Megaphone, Target, 
    MessageSquare, History, Sparkles, Globe, Info 
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");
const notificationSound = new Audio('/sounds/notification-ting.mp3');

const Communication = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);

    const [message, setMessage] = useState("");
    const [target, setTarget] = useState("All Employees");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [selectedCity, setSelectedCity] = useState("");

    const [employees, setEmployees] = useState([]);
    const [recentBroadcasts, setRecentBroadcasts] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // --- DATA FETCHING ---
    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsFetching(true);
        try {
            const [empRes, broadcastsRes] = await Promise.all([
                api.get('/admin/communication/employees'),
                api.get('/admin/communication/recent')
            ]);
            if (empRes.data.success) setEmployees(empRes.data.data);
            if (broadcastsRes.data.success) setRecentBroadcasts(broadcastsRes.data.data);
        } catch (error) {
            if (showLoader) {
                toast.error(t('communication_hub.toasts.load_error'));
            }
        } finally {
            if (showLoader) setIsFetching(false);
        }
    }, [t]);

    useEffect(() => { fetchData(true); }, [fetchData]);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = () => {
            try {
                notificationSound.currentTime = 0;
                notificationSound.play().catch(() => {});
            } catch (e) {}
            fetchData(false);
        };

        socket.on("new_notification", handleRealTimeUpdate);
        return () => { socket.off("new_notification", handleRealTimeUpdate); };
    }, [user, fetchData]);

    // --- HANDLERS ---
    const handleSendBroadcast = async () => {
        if (!message.trim()) return toast.error(t('communication_hub.toasts.empty_message'));
        if (target === "By Zone" && !selectedCity.trim()) return toast.error(t('communication_hub.toasts.empty_city'));
        if (target === "Specific People" && selectedEmployees.length === 0) return toast.error(t('communication_hub.toasts.empty_selection'));

        setIsSending(true);
        const loadingToast = toast.loading(t('communication_hub.btn_broadcasting', 'Transmitting...'));
        try {
            const payload = {
                targetGroup: target,
                message: message.trim(),
                targetZone: target === "By Zone" ? selectedCity : undefined,
                targetUsers: target === "Specific People" ? selectedEmployees : undefined
            };
            const response = await api.post('/admin/communication/send', payload);
            if (response.data.success) {
                toast.success(t('communication_hub.toasts.send_success', { count: response.data.data.reachCount }), { id: loadingToast });
                setRecentBroadcasts(prev => [response.data.data, ...prev].slice(0, 10));
                setMessage("");
                setSelectedCity("");
                setSelectedEmployees([]);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('communication_hub.toasts.send_error'), { id: loadingToast });
        } finally {
            setIsSending(false);
        }
    };

    const toggleEmployeeSelection = (employeeId) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
        );
    };

    const getTimeAgo = (dateString) => {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return t('communication_hub.time.just_now');
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return t('communication_hub.time.mins_ago', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('communication_hub.time.hrs_ago', { count: hours });
        return t('communication_hub.time.days_ago', { count: Math.floor(hours / 24) });
    };

    if (isFetching) {
        return (
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse">
                <div className="h-10 w-48 bg-muted rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-card rounded-4xl border border-border/50" />
                    <div className="h-96 bg-card rounded-4xl border border-border/50" />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-700 pb-20 md:pb-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

            {/* --- HEADER --- */}
            <header className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                        <Megaphone className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase">
                            {t('communication_hub.title', 'Communication Hub')}
                        </h1>
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                           <Sparkles className="w-3 h-3 text-primary shrink-0" /> {t('communication_hub.subtitle')}
                        </p>
                    </div>
                </div>
            </header>

            {/* MAIN LAYOUT: Stacks on mobile/tablet, 3 columns on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
                
                {/* --- BROADCAST CREATOR (Left / Top) --- */}
                <main className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-border/60 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/40 via-primary to-primary/40" />
                        
                        <div className="p-4 sm:p-6 md:p-8 border-b border-border/50 bg-muted/5">
                            <h3 className="text-sm sm:text-base md:text-lg font-black text-foreground uppercase flex items-center gap-3">
                                <Send className="w-4 h-4 text-primary" /> {t('communication_hub.new_broadcast')}
                            </h3>
                        </div>

                        <div className="p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
                            {/* Step 1: Target Selection */}
                            <div className="space-y-3 sm:space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1">
                                    {t('communication_hub.step_target', '1. Select Audience')}
                                </Label>
                                {/* Stacks fully on very small phones, 3-cols on slightly larger phones/tablets */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                    {[
                                        { id: "All Employees", key: "all", icon: Users },
                                        { id: "By Zone", key: "zone", icon: Globe },
                                        { id: "Specific People", key: "specific", icon: UserCheck },
                                    ].map((opt) => {
                                        const isSel = target === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => setTarget(opt.id)}
                                                className={`flex items-center justify-start sm:justify-center gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 group min-h-14
                                                    ${isSel ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]" 
                                                           : "bg-muted/20 text-muted-foreground border-border/50 hover:border-primary/30"}`}
                                            >
                                                <opt.icon className={`w-4 h-4 shrink-0 ${isSel ? "text-primary-foreground" : "group-hover:text-primary"}`} />
                                                <span className="font-bold text-xs uppercase tracking-wide truncate">{t(`communication_hub.targets.${opt.key}`)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Conditional Inputs (Zone/Specific) */}
                            {target === "By Zone" && (
                                <div className="p-4 sm:p-6 bg-muted/20 border border-border/50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label className="text-[10px] font-bold text-foreground uppercase tracking-widest ml-1 mb-2 sm:mb-3 block">{t('communication_hub.zone_label')}</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                                        <Input
                                            placeholder={t('communication_hub.zone_placeholder')}
                                            value={selectedCity}
                                            onChange={(e) => setSelectedCity(e.target.value)}
                                            className="pl-10 h-12 rounded-xl bg-background border-border/50 focus-visible:ring-primary/20 text-sm sm:text-base"
                                        />
                                    </div>
                                </div>
                            )}

                            {target === "Specific People" && (
                                <div className="p-4 sm:p-6 bg-muted/20 border border-border/50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label className="text-[10px] font-bold text-foreground uppercase tracking-widest truncate">{t('communication_hub.recipients_label')}</Label>
                                        <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                                            {selectedEmployees.length} {t('communication_hub.selected')}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                        <Input
                                            placeholder={t('communication_hub.search_placeholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 h-11 rounded-xl bg-background border-border/50 text-sm"
                                        />
                                    </div>
                                    <div className="max-h-50 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase())).map((emp) => {
                                            const isSelected = selectedEmployees.includes(emp._id);
                                            return (
                                                <div
                                                    key={emp._id}
                                                    onClick={() => toggleEmployeeSelection(emp._id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                                                        ${isSelected ? "bg-primary/5 border-primary/30" : "bg-background border-transparent hover:bg-muted/30"}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0
                                                            ${isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                                                            {emp.name.charAt(0)}
                                                        </div>
                                                        <span className={`font-bold text-xs ${isSelected ? "text-primary" : "text-foreground"} truncate`}>{emp.name}</span>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Message Content */}
                            <div className="space-y-3 sm:space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1">
                                    {t('communication_hub.step_message', '2. Compose Message')}
                                </Label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-4 sm:left-5 top-5 w-4 h-4 text-muted-foreground/30" />
                                    <Textarea
                                        className="w-full min-h-35 sm:min-h-45 rounded-2xl sm:rounded-3xl border-border/50 bg-muted/10 pl-11 sm:pl-12 pr-4 py-4 sm:py-5 text-sm sm:text-base font-medium focus:bg-background transition-all"
                                        placeholder={t('communication_hub.message_placeholder')}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 md:p-8 bg-muted/5 border-t border-border/50">
                            <Button
                                onClick={handleSendBroadcast}
                                disabled={isSending || !message.trim()}
                                className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm shadow-lg shadow-primary/20 active:scale-95 gap-3 transition-transform"
                            >
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isSending ? t('communication_hub.btn_broadcasting') : t('communication_hub.btn_send')}
                            </Button>
                        </div>
                    </div>
                </main>

                {/* --- HISTORY SIDEBAR (Right / Bottom) --- */}
                <aside className="space-y-6 lg:sticky lg:top-8 w-full">
                    <div className="bg-card rounded-3xl sm:rounded-4xl shadow-lg border border-border/60 overflow-hidden flex flex-col h-full">
                        <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                            <h3 className="font-black text-[10px] sm:text-[11px] text-foreground uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4 text-primary" /> {t('communication_hub.history')}
                            </h3>
                            <span className="text-[9px] font-black bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase">{t('communication_hub.history_limit')}</span>
                        </div>

                        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-87.5 lg:max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                            {recentBroadcasts.length > 0 ? (
                                recentBroadcasts.map((b) => (
                                    <div key={b._id} className="p-3 sm:p-4 bg-muted/10 border border-border/30 rounded-xl sm:rounded-2xl hover:border-primary/20 transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-colors" />
                                        <p className="text-[11px] sm:text-xs font-bold text-foreground/80 leading-relaxed mb-3 sm:mb-4 line-clamp-3">"{b.message}"</p>
                                        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/30">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[8px] sm:text-[9px] font-black uppercase">{getTimeAgo(b.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-primary/5 px-1.5 sm:px-2 py-0.5 rounded-md border border-primary/10">
                                                <Target className="w-3 h-3 text-primary shrink-0" />
                                                <span className="text-[8px] sm:text-[9px] font-black text-primary">{b.reachCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 sm:py-12 flex flex-col items-center justify-center text-center opacity-30">
                                    <Bell className="w-8 h-8 sm:w-10 sm:h-10 mb-2" />
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{t('communication_hub.no_history')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    );
};

export default Communication;