import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Users, Bell, UserCheck, Search, CheckCircle2, Clock, Loader2, AlertCircle, Megaphone } from "lucide-react";
import { Toaster } from "sonner";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next"; // <-- Added import

import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");
const notificationSound = new Audio('/sounds/notification-ting.mp3');

const Communication = () => {
    const { t } = useTranslation(); // <-- Initialize hook
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

    useEffect(() => {
        const unlockAudio = () => {
            notificationSound.volume = 0;
            notificationSound.play().then(() => {
                notificationSound.pause();
                notificationSound.currentTime = 0;
                notificationSound.volume = 1;
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('touchstart', unlockAudio);
            }).catch(e => console.log("Still waiting for user interaction..."));
        };
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

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

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = (data) => {
            try {
                notificationSound.currentTime = 0;
                notificationSound.play().catch(err => console.warn("🔇 BROWSER BLOCKED AUDIO!", err));
            } catch (e) { console.error("Error playing sound:", e); }
            fetchData(false);
        };

        socket.on("new_notification", handleRealTimeUpdate);
        return () => { socket.off("new_notification", handleRealTimeUpdate); };
    }, [user, fetchData]);

    const handleSendBroadcast = async () => {
        if (!message.trim()) {
            toast.error(t('communication_hub.toasts.empty_message'));
            return;
        }
        if (target === "By Zone" && !selectedCity.trim()) {
            toast.error(t('communication_hub.toasts.empty_city'));
            return;
        }
        if (target === "Specific People" && selectedEmployees.length === 0) {
            toast.error(t('communication_hub.toasts.empty_selection'));
            return;
        }

        setIsSending(true);
        try {
            const payload = {
                targetGroup: target,
                message: message.trim(),
                targetZone: target === "By Zone" ? selectedCity : undefined,
                targetUsers: target === "Specific People" ? selectedEmployees : undefined
            };
            const response = await api.post('/admin/communication/send', payload);
            if (response.data.success) {
                toast.success(t('communication_hub.toasts.send_success', { count: response.data.data.reachCount }));
                setRecentBroadcasts(prev => [response.data.data, ...prev].slice(0, 3));
                setMessage("");
                setSelectedCity("");
                setSelectedEmployees([]);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('communication_hub.toasts.send_error'));
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
        return <div className="animate-pulse max-w-7xl mx-auto p-8 h-96 bg-muted/20 rounded-3xl" />;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Toaster richColors position="top-right" />

            <div className="mb-6 sm:mb-8 flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl hidden sm:flex items-center justify-center">
                    <Megaphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-foreground tracking-tight">{t('communication_hub.title')}</h1>
                    <p className="text-muted-foreground text-sm sm:text-base font-normal">{t('communication_hub.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-7 border border-border/60 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                        <h3 className="text-lg sm:text-xl font-semibold mb-6 flex items-center gap-2 text-foreground relative z-10">
                            <Send className="w-5 h-5 text-primary" /> {t('communication_hub.new_broadcast')}
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-foreground">{t('communication_hub.step_target')}</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {[
                                        { id: "All Employees", key: "all", icon: Users },
                                        { id: "By Zone", key: "zone", icon: Bell },
                                        { id: "Specific People", key: "specific", icon: UserCheck },
                                    ].map((targetOption) => {
                                        const isSelected = target === targetOption.id;
                                        return (
                                            <button
                                                key={targetOption.id}
                                                onClick={() => setTarget(targetOption.id)}
                                                className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${isSelected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:bg-primary/5"
                                                    }`}
                                            >
                                                <targetOption.icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                                                <span className="truncate">{t(`communication_hub.targets.${targetOption.key}`)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {target === "By Zone" && (
                                <div className="bg-muted/30 border border-border/50 rounded-xl p-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <Label className="text-sm font-semibold">{t('communication_hub.zone_label')}</Label>
                                    <Input
                                        placeholder={t('communication_hub.zone_placeholder')}
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="mt-2.5 h-11 bg-background border-border/50 focus-visible:ring-primary/40 rounded-lg text-sm"
                                    />
                                    <p className="text-xs font-normal text-muted-foreground mt-2 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5" /> {t('communication_hub.zone_help')}
                                    </p>
                                </div>
                            )}

                            {target === "Specific People" && (
                                <div className="bg-muted/30 border border-border/50 rounded-xl p-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <Label className="text-sm font-semibold">{t('communication_hub.recipients_label')}</Label>
                                        <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                                            {t('communication_hub.selected_count', { count: selectedEmployees.length })}
                                        </span>
                                    </div>

                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('communication_hub.search_placeholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-10 bg-background border-border/50 focus-visible:ring-primary/40 rounded-lg text-sm"
                                        />
                                    </div>

                                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1.5 custom-scrollbar border border-border/40 bg-background rounded-lg p-1.5">
                                        {employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                            employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase())).map((emp) => {
                                                const isSelected = selectedEmployees.includes(emp._id);
                                                return (
                                                    <button
                                                        key={emp._id}
                                                        onClick={() => toggleEmployeeSelection(emp._id)}
                                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-all border ${isSelected ? "bg-primary/5 border-primary/30" : "bg-transparent border-transparent hover:bg-muted/60"}`}
                                                    >
                                                        <div className="flex flex-col items-start min-w-0 text-left">
                                                            <span className={`font-medium text-sm truncate w-full ${isSelected ? "text-primary" : "text-foreground"}`}>{emp.name}</span>
                                                            <span className="text-xs font-normal text-muted-foreground mt-0.5 truncate w-full">{emp.designation || "Employee"} • {emp.zone || "Unassigned"}</span>
                                                        </div>
                                                        {isSelected ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" /> : <div className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0 ml-2" />}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                                <Users className="w-6 h-6 mb-2 opacity-30" />
                                                <p className="text-xs font-medium">{t('communication_hub.no_employees')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-foreground">{t('communication_hub.step_message')}</Label>
                                <textarea
                                    className="w-full min-h-35 rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-background transition-all leading-relaxed"
                                    placeholder={t('communication_hub.message_placeholder')}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <div className="pt-2">
                                <Button
                                    onClick={handleSendBroadcast}
                                    disabled={isSending}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg font-medium px-6 h-10 text-sm transition-all"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {isSending ? t('communication_hub.btn_broadcasting') : t('communication_hub.btn_send')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 border border-border/60 h-fit flex flex-col">
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/50 shrink-0">
                        <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Clock className="w-4 h-4 text-primary" /> {t('communication_hub.history')}
                        </h3>
                        <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded-md text-muted-foreground">{t('communication_hub.history_limit')}</span>
                    </div>

                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
                        {recentBroadcasts.length > 0 ? (
                            recentBroadcasts.slice(0, 3).map((b) => (
                                <div key={b._id} className="p-3.5 bg-background border border-border/60 rounded-xl hover:border-border transition-colors flex flex-col group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-0.75 h-full bg-primary/20 group-hover:bg-primary/60 transition-colors"></div>
                                    <p className="text-sm font-normal text-foreground/90 leading-relaxed line-clamp-3 mb-3 pl-2">"{b.message}"</p>
                                    <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border/40 pl-2">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{getTimeAgo(b.createdAt)}</span>
                                        <span className="bg-primary/10 text-[10px] font-medium uppercase text-primary px-2 py-0.5 rounded border border-primary/20">{t('communication_hub.sent_to', { count: b.reachCount })}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-muted/10 rounded-xl border border-dashed border-border">
                                <Bell className="w-6 h-6 text-muted-foreground/40 mb-2" />
                                <p className="text-xs font-medium text-muted-foreground">{t('communication_hub.no_history')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Communication;