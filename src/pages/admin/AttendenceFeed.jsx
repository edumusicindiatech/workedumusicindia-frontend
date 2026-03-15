import { Radio } from "lucide-react";

const feedItems = [
    { name: "Sarah Johnson", time: "8:02 AM", type: "arrival", zone: "Zone A" },
    { name: "Mike Chen", time: "8:05 AM", type: "arrival", zone: "Zone B" },
    { name: "James Wilson", time: "8:30 AM", type: "no-show", zone: "Zone A" },
    { name: "Emily Davis", time: "8:15 AM", type: "late", zone: "Zone C" },
    { name: "Ana Garcia", time: "7:58 AM", type: "arrival", zone: "Zone B" },
    { name: "David Lee", time: "8:00 AM", type: "arrival", zone: "Zone D" },
    { name: "Lisa Brown", time: "—", type: "no-show", zone: "Zone A" },
    { name: "Tom Martinez", time: "8:45 AM", type: "late", zone: "Zone C" },
];

const typeStyles = {
    arrival: { badge: "bg-success/10 text-success", label: "Arrived" },
    "no-show": { badge: "bg-destructive/10 text-destructive", label: "No-Show" },
    late: { badge: "bg-warning/10 text-warning", label: "Late" },
};

const AttendanceFeed = () => {
    return (
        <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <h1 className="text-2xl font-bold">Live Attendance Feed</h1>
                <Radio className="w-5 h-5 text-primary" />
            </div>

            <div className="bg-card rounded-xl shadow-card divide-y divide-border">
                {feedItems.map((item, i) => {
                    const style = typeStyles[item.type];
                    return (
                        <div
                            key={i}
                            className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors duration-150"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                                    {item.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.zone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.badge}`}>
                                    {style.label}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">{item.time}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttendanceFeed;
