import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Send, Users, Bell, UserCheck, Search, CheckCircle2, 
    Clock, Loader2, AlertCircle, Megaphone, Target, 
    MessageSquare, History, Sparkles, Globe, Info 
} from "lucide-react";
import { Toaster } from "sonner";
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
    const [errorMsg, setErrorMsg] = useState("");

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
            setErrorMsg("");
        } catch (error) {
            if (showLoader) {
                setErrorMsg(t('communication_hub.toasts.load_error'));
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
            <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-125 bg-card rounded-[2.5rem] border border-border/50" />
                    <div className="h-125 bg-card rounded-[2.5rem] border border-border/50" />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-700 pb-24 md:pb-12 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mt-2 md:mt-4">
            <Toaster richColors position="top-right" />

            {/* --- HEADER --- */}
            <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <Megaphone className="w-7 h-7 text-primary" />
                    </div>
                    <div className="space-y-1">
                        {/* NORMAL TEXT (Removed Italic) */}
                        <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">
                            {t('communication_hub.title', 'Communication Hub')}
                        </h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                           <Sparkles className="w-3.5 h-3.5 text-primary" /> {t('communication_hub.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
                
                {/* --- BROADCAST CREATOR (Left) --- */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border/60 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20" />
                        
                        <div className="p-6 sm:p-8 border-b border-border/50 bg-muted/10">
                            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase flex items-center gap-3">
                                <Send className="w-5 h-5 text-primary" /> {t('communication_hub.new_broadcast')}
                            </h3>
                        </div>

                        <div className="p-6 sm:p-10 space-y-10">
                            {/* Step 1: Target Selection (Narrowed Container) */}
                            <div className="space-y-5">
                                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1">
                                    {t('communication_hub.step_target', '1. Select Audience')}
                                </Label>
                                {/* Narrowed Grid: max-w-2xl keeps buttons from being too wide */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
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
                                                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-300 group
                                                    ${isSel ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                                                           : "bg-muted/30 text-muted-foreground border-border/60 hover:border-primary/40 hover:bg-muted/50"}`}
                                            >
                                                <opt.icon className={`w-4.5 h-4.5 shrink-0 ${isSel ? "text-primary-foreground" : "group-hover:text-primary transition-colors"}`} />
                                                <span className="font-bold text-xs uppercase tracking-wide truncate">{t(`communication_hub.targets.${opt.key}`)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Zone Input */}
                            {target === "By Zone" && (
                                <div className="p-6 bg-muted/20 border border-border/60 rounded-3xl animate-in slide-in-from-top-4 duration-500 max-w-2xl">
                                    <Label className="text-xs font-bold text-foreground uppercase tracking-widest ml-1 mb-3 block">{t('communication_hub.zone_label')}</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-primary/60" />
                                        <Input
                                            placeholder={t('communication_hub.zone_placeholder')}
                                            value={selectedCity}
                                            onChange={(e) => setSelectedCity(e.target.value)}
                                            className="pl-11 h-13 rounded-2xl bg-background border-border/60 focus-visible:ring-primary/30 text-base"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground mt-3 flex items-center gap-2 uppercase tracking-tight opacity-70">
                                        <Info className="w-3.5 h-3.5" /> {t('communication_hub.zone_help')}
                                    </p>
                                </div>
                            )}

                            {/* Specific People Selection */}
                            {target === "Specific People" && (
                                <div className="p-6 bg-muted/20 border border-border/60 rounded-4xl animate-in slide-in-from-top-4 duration-500 space-y-4 max-w-2xl">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-xs font-bold text-foreground uppercase tracking-widest">{t('communication_hub.recipients_label')}</Label>
                                        <span className="text-[10px] font-black bg-primary text-primary-foreground px-3 py-1 rounded-full uppercase tracking-tighter">
                                            {selectedEmployees.length} {t('communication_hub.selected', 'Selected')}
                                        </span>
                                    </div>

                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
                                        <Input
                                            placeholder={t('communication_hub.search_placeholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-11 h-12 rounded-2xl bg-background border-border/60 focus-visible:ring-primary/30"
                                        />
                                    </div>

                                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase())).map((emp) => {
                                            const isSelected = selectedEmployees.includes(emp._id);
                                            return (
                                                <div
                                                    key={emp._id}
                                                    onClick={() => toggleEmployeeSelection(emp._id)}
                                                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all duration-200
                                                        ${isSelected ? "bg-primary/10 border-primary/40 shadow-sm" : "bg-background border-transparent hover:border-border/80"}`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0
                                                            ${isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                                                            {emp.name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`font-bold text-sm truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{emp.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter truncate">{emp.zone || "Global"}</p>
                                                        </div>
                                                    </div>
                                                    {isSelected ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <div className="w-5 h-5 rounded-full border-2 border-muted" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Message Content */}
                            <div className="space-y-4">
                                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1">
                                    {t('communication_hub.step_message', '2. Compose Message')}
                                </Label>
                                <div className="relative group">
                                    <MessageSquare className="absolute left-6 top-6 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
                                    <Textarea
                                        className="w-full min-h-56 rounded-[2.5rem] border-border/60 bg-muted/20 pl-16 pr-8 py-6 text-base font-medium focus-visible:ring-primary/30 focus:bg-background transition-all leading-relaxed shadow-inner"
                                        placeholder={t('communication_hub.message_placeholder')}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 sm:p-10 bg-muted/10 border-t border-border/50">
                            <Button
                                onClick={handleSendBroadcast}
                                disabled={isSending || !message.trim()}
                                className="w-full sm:w-auto h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] gap-4"
                            >
                                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
                                {isSending ? t('communication_hub.btn_broadcasting') : t('communication_hub.btn_send')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- HISTORY SIDEBAR (Right) --- */}
                <div className="space-y-6">
                    <div className="bg-card rounded-[2.5rem] shadow-xl border border-border/60 h-fit flex flex-col relative overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                            <h3 className="font-black text-sm text-foreground uppercase tracking-widest flex items-center gap-2.5">
                                <History className="w-4.5 h-4.5 text-primary" /> {t('communication_hub.history')}
                            </h3>
                            <span className="text-[10px] font-black bg-muted border border-border/50 px-3 py-1 rounded-lg text-muted-foreground uppercase tracking-tighter">{t('communication_hub.history_limit')}</span>
                        </div>

                        <div className="p-6 space-y-5 max-h-200 overflow-y-auto custom-scrollbar">
                            {recentBroadcasts.length > 0 ? (
                                recentBroadcasts.map((b) => (
                                    <div key={b._id} className="p-5 bg-muted/20 border border-border/40 rounded-3xl hover:border-primary/30 transition-all group relative overflow-hidden hover:bg-muted/40 shadow-sm">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
                                        <p className="text-sm font-bold text-foreground/90 leading-relaxed mb-5 pl-1 line-clamp-4">"{b.message}"</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-border/40 pl-1">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{getTimeAgo(b.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/10">
                                                <Target className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[10px] font-black text-primary uppercase">{b.reachCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-24 flex flex-col items-center justify-center text-center opacity-40">
                                    <Bell className="w-12 h-12 mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">{t('communication_hub.no_history')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Communication;