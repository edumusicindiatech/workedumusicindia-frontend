import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Users, Bell, UserCheck, Search, CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner"; // Make sure <Toaster richColors /> is in your App.jsx!
import api from "../../api/axios";

const Communication = () => {
    // --- FORM STATES ---
    const [message, setMessage] = useState("");
    const [target, setTarget] = useState("All Employees");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [selectedCity, setSelectedCity] = useState("");

    // --- DATA STATES ---
    const [employees, setEmployees] = useState([]);
    const [recentBroadcasts, setRecentBroadcasts] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // --- FETCH INITIAL DATA ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [empRes, broadcastsRes] = await Promise.all([
                    api.get('/admin/communication/employees'),
                    api.get('/admin/communication/recent')
                ]);
                if (empRes.data.success) setEmployees(empRes.data.data);
                if (broadcastsRes.data.success) setRecentBroadcasts(broadcastsRes.data.data);
            } catch (error) {
                console.error("Fetch Error:", error);
                setErrorMsg("Failed to load communication hub data.");
                toast.error("Failed to load communication data.");
            } finally {
                setIsFetching(false);
            }
        };
        fetchInitialData();
    }, []);

    // --- SEND BROADCAST LOGIC ---
    const handleSendBroadcast = async () => {
        if (!message.trim()) {
            toast.error("Message context cannot be empty.");
            return;
        }
        if (target === "By Zone" && !selectedCity.trim()) {
            toast.error("Please enter at least one target city.");
            return;
        }
        if (target === "Specific People" && selectedEmployees.length === 0) {
            toast.error("Please select at least one employee.");
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
                toast.success(`Broadcast delivered to ${response.data.data.reachCount} users!`);

                // Add to recent list and reset form
                setRecentBroadcasts(prev => [response.data.data, ...prev].slice(0, 5));
                setMessage("");
                setSelectedCity("");
                setSelectedEmployees([]);
            }
        } catch (error) {
            const errMessage = error.response?.data?.message || "Failed to send broadcast.";
            toast.error(errMessage);
        } finally {
            setIsSending(false);
        }
    };

    // --- HELPERS ---
    const toggleEmployeeSelection = (employeeId) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
        );
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTimeAgo = (dateString) => {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} mins ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hrs ago`;
        return `${Math.floor(hours / 24)} days ago`;
    };

    // --- LOADING & ERROR UI ---
    if (isFetching) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground animate-fade-in">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="font-medium">Loading communication hub...</p>
            </div>
        );
    }

    if (errorMsg && employees.length === 0) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-destructive animate-fade-in p-6 text-center">
                <AlertCircle className="w-10 h-10 mb-4" />
                <p className="font-semibold text-lg">{errorMsg}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-24 md:pb-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-foreground tracking-tight">Communication</h1>
                <p className="text-muted-foreground text-sm sm:text-base">Broadcast announcements and alerts to your workforce.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

                {/* --- MAIN FORM AREA --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8 border border-border">
                        <h3 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6 flex items-center gap-2 text-foreground">
                            <Send className="w-5 h-5 text-primary" /> Broadcast Message
                        </h3>

                        <div className="space-y-6">
                            {/* Target Selection */}
                            <div>
                                <Label className="text-sm sm:text-base font-bold">Target Group</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-3">
                                    {[
                                        { id: "All Employees", icon: Users },
                                        { id: "By Zone", icon: Bell },
                                        { id: "Specific People", icon: UserCheck },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTarget(t.id)}
                                            className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-3 sm:py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${target === t.id
                                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                : "bg-muted/10 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                                                }`}
                                        >
                                            <t.icon className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{t.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditional: By Zone */}
                            {target === "By Zone" && (
                                <div className="bg-muted/20 border border-border rounded-xl p-4 sm:p-5 animate-in slide-in-from-top-2">
                                    <Label className="text-xs sm:text-sm font-bold">Target City / Location</Label>
                                    <Input
                                        placeholder="e.g. Sultanpur, Lucknow, Delhi (comma separated)..."
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="mt-2 h-10 sm:h-11 bg-background"
                                    />
                                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-2 leading-relaxed">
                                        Multiple cities can be separated by commas. Not case-sensitive.
                                    </p>
                                </div>
                            )}

                            {/* Conditional: Specific People */}
                            {target === "Specific People" && (
                                <div className="bg-muted/20 border border-border rounded-xl p-4 sm:p-5 animate-in slide-in-from-top-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                        <Label className="text-xs sm:text-sm font-bold">Select Recipients</Label>
                                        <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                                            {selectedEmployees.length} Selected
                                        </span>
                                    </div>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search employees by name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-10 bg-background text-sm"
                                        />
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 sm:pr-2 custom-scrollbar border border-border/50 bg-background rounded-lg p-1.5">
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map((emp) => {
                                                const isSelected = selectedEmployees.includes(emp._id);
                                                return (
                                                    <button
                                                        key={emp._id}
                                                        onClick={() => toggleEmployeeSelection(emp._id)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all border ${isSelected
                                                            ? "bg-primary/10 border-primary/30 shadow-sm"
                                                            : "bg-transparent border-transparent hover:bg-muted/50"
                                                            }`}
                                                    >
                                                        <div className="flex flex-col items-start min-w-0 text-left">
                                                            <span className={`font-bold text-sm truncate w-full ${isSelected ? "text-primary" : "text-foreground"}`}>
                                                                {emp.name}
                                                            </span>
                                                            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground mt-0.5 truncate w-full">
                                                                {emp.designation || "Employee"} • {emp.zone || "Unassigned"}
                                                            </span>
                                                        </div>
                                                        {isSelected ? (
                                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 ml-2" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0 ml-2" />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className="text-center text-xs sm:text-sm text-muted-foreground py-8">No employees found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Message Context */}
                            <div>
                                <Label className="text-sm sm:text-base font-bold">Message Context</Label>
                                <textarea
                                    className="w-full mt-2 sm:mt-3 min-h-30 sm:min-h-37.5 rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow leading-relaxed"
                                    placeholder="Type your official announcement here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <Button
                                onClick={handleSendBroadcast}
                                disabled={isSending}
                                className="w-full sm:w-auto gap-2 rounded-xl font-bold px-8 h-11 sm:h-12 text-sm sm:text-base"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                                {isSending ? "Broadcasting..." : "Send Broadcast"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- SIDEBAR: RECENT ACTIVITY --- */}
                <div className="bg-card rounded-2xl shadow-sm p-4 sm:p-6 border border-border h-fit flex flex-col max-h-125 lg:max-h-200">
                    <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 flex items-center gap-2 text-foreground shrink-0">
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Recent Broadcasts
                    </h3>

                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
                        {recentBroadcasts.length > 0 ? (
                            recentBroadcasts.map((b) => (
                                <div key={b._id} className="p-4 bg-muted/20 border border-border/50 rounded-xl hover:bg-muted/40 transition-colors flex flex-col">
                                    <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed line-clamp-3 mb-3">
                                        {b.message}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                                        <span className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            <Clock className="w-3 h-3" /> {getTimeAgo(b.createdAt)}
                                        </span>
                                        <span className="bg-background text-[9px] sm:text-[10px] font-black uppercase text-foreground px-2 py-1 rounded-md border border-border shadow-sm">
                                            Sent to {b.reachCount}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs font-medium text-muted-foreground py-10 bg-muted/10 rounded-xl border border-dashed border-border">
                                No recent broadcasts.
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Communication;