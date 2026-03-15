import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Users, Bell, AlertTriangle } from "lucide-react";

const Communication = () => {
    const [message, setMessage] = useState("");
    const [target, setTarget] = useState("all");

    return (
        <div className="animate-fade-in">
            <h1 className="text-2xl font-bold mb-1">Communication</h1>
            <p className="text-muted-foreground mb-8">Broadcast messages to your workforce</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary" /> Broadcast Message
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <Label>Target Group</Label>
                                <div className="flex gap-3 mt-2">
                                    {[
                                        { id: "all", icon: Users, label: "All Employees" },
                                        { id: "zone", icon: Bell, label: "By Zone" },
                                        { id: "urgent", icon: AlertTriangle, label: "Urgent Only" },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTarget(t.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${target === t.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted hover:bg-muted/80"
                                                }`}
                                        >
                                            <t.icon className="w-4 h-4" /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>Message</Label>
                                <textarea
                                    className="w-full mt-1 min-h-30 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Type your message here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>
                            <Button className="gap-2 shadow-glow">
                                <Send className="w-4 h-4" /> Send Broadcast
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-card p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Broadcasts</h3>
                    <div className="space-y-4">
                        {[
                            { msg: "Reminder: Submit weekly reports by Friday 5PM", time: "2 hours ago", sent: 124 },
                            { msg: "Zone A: Meeting location changed to Main Office", time: "Yesterday", sent: 32 },
                            { msg: "Urgent: System maintenance tonight 10PM-2AM", time: "2 days ago", sent: 124 },
                        ].map((b, i) => (
                            <div key={i} className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium">{b.msg}</p>
                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                    <span>{b.time}</span>
                                    <span>Sent to {b.sent} people</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Communication;
