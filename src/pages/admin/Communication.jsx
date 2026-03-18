import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Users, Bell, UserCheck, Search, CheckCircle2, Clock } from "lucide-react";

// --- MOCK DATA ---
const allEmployees = [
    { id: 1, name: "Sarah Johnson", role: "Field Officer" },
    { id: 2, name: "Mike Chen", role: "Supervisor" },
    { id: 3, name: "Emily Davis", role: "Field Officer" },
    { id: 4, name: "James Wilson", role: "Team Lead" },
    { id: 5, name: "Ana Garcia", role: "Coordinator" },
];

const Communication = () => {
    const [message, setMessage] = useState("");
    const [target, setTarget] = useState("all");

    // States for Specific People Selection
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    // State for Zone / City Selection
    const [selectedCity, setSelectedCity] = useState("");

    const toggleEmployeeSelection = (employeeId) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const filteredEmployees = allEmployees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fade-in pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1 text-foreground">Communication</h1>
                <p className="text-muted-foreground">Broadcast messages to your workforce</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
                            <Send className="w-5 h-5 text-primary" /> Broadcast Message
                        </h3>

                        <div className="space-y-6">
                            {/* Target Selection */}
                            <div>
                                <Label className="text-base">Target Group</Label>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    {[
                                        { id: "all", icon: Users, label: "All Employees" },
                                        { id: "zone", icon: Bell, label: "By Zone" },
                                        { id: "specific", icon: UserCheck, label: "Specific People" },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTarget(t.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${target === t.id
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-card text-muted-foreground border-border hover:bg-muted/50"
                                                }`}
                                        >
                                            <t.icon className="w-4 h-4" /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditional Rendering: Zone / City Selection */}
                            {target === "zone" && (
                                <div className="bg-muted/20 border border-border rounded-xl p-5 animate-in slide-in-from-top-2">
                                    <Label className="text-sm font-medium">Target City / Location</Label>
                                    <Input
                                        placeholder="e.g. Sultanpur, Lucknow, Delhi..."
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="mt-2"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Only employees assigned to this city will receive the broadcast.
                                    </p>
                                </div>
                            )}

                            {/* Conditional Rendering: Specific People Selection List */}
                            {target === "specific" && (
                                <div className="bg-muted/20 border border-border rounded-xl p-5 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <Label className="text-sm font-medium">Select Recipients</Label>
                                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                                            {selectedEmployees.length} Selected
                                        </span>
                                    </div>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search employees by name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-9 text-sm"
                                        />
                                    </div>

                                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map((emp) => {
                                                const isSelected = selectedEmployees.includes(emp.id);
                                                return (
                                                    <button
                                                        key={emp.id}
                                                        onClick={() => toggleEmployeeSelection(emp.id)}
                                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors border ${isSelected
                                                                ? "bg-primary/5 border-primary/20"
                                                                : "bg-card border-transparent hover:bg-muted/50"
                                                            }`}
                                                    >
                                                        <div className="flex flex-col items-start">
                                                            <span className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                                                                {emp.name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">{emp.role}</span>
                                                        </div>
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className="text-center text-sm text-muted-foreground py-4">No employees found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Message Textarea */}
                            <div>
                                <Label className="text-base">Message Context</Label>
                                <textarea
                                    className="w-full mt-3 min-h-[120px] rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                    placeholder="Type your official announcement here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <Button className="w-full sm:w-auto gap-2 shadow-glow" size="lg">
                                <Send className="w-4 h-4" /> Send Broadcast
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Recent Broadcasts Sidebar */}
                <div className="bg-card rounded-xl shadow-card p-6 border border-border h-fit">
                    <h3 className="text-lg font-semibold mb-5 flex items-center gap-2 text-foreground">
                        <Bell className="w-5 h-5 text-primary" /> Recent Activity
                    </h3>
                    <div className="space-y-4">
                        {[
                            { msg: "Reminder: Submit weekly reports by Friday 5PM", time: "2 hours ago", sent: 124 },
                            { msg: "Zone A: Meeting location changed to Main Office", time: "Yesterday", sent: 32 },
                            { msg: "Urgent: System maintenance tonight 10PM-2AM", time: "2 days ago", sent: 124 },
                        ].map((b, i) => (
                            <div key={i} className="p-4 bg-muted/30 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors">
                                <p className="text-sm font-medium text-foreground">{b.msg}</p>
                                <div className="flex items-center justify-between mt-3 text-xs font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {b.time}</span>
                                    <span className="bg-background px-2 py-0.5 rounded border border-border">Sent to {b.sent}</span>
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