import { Users, UserCheck, UserX, Clock } from "lucide-react";

const stats = [
    { label: "Total Employees", value: "124", icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Present Today", value: "98", icon: UserCheck, color: "bg-success/10 text-success" },
    { label: "No-Show", value: "8", icon: UserX, color: "bg-destructive/10 text-destructive" },
    { label: "Pending", value: "18", icon: Clock, color: "bg-warning/10 text-warning" },
];

const recentActivity = [
    { name: "Sarah Johnson", action: "Marked attendance", time: "2 min ago", status: "present" },
    { name: "Mike Chen", action: "No-show alert", time: "5 min ago", status: "absent" },
    { name: "Emily Davis", action: "Marked attendance", time: "8 min ago", status: "present" },
    { name: "James Wilson", action: "Late arrival", time: "12 min ago", status: "warning" },
    { name: "Ana Garcia", action: "Marked attendance", time: "15 min ago", status: "present" },
];

const statusBadge = (status) => {
    const styles = {
        present: "bg-success/10 text-success",
        absent: "bg-destructive/10 text-destructive",
        warning: "bg-warning/10 text-warning",
    };
    return styles[status] || "";
};

const AdminDashboard = () => {
    return (
        <div className="animate-fade-in">
            <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
            <p className="text-muted-foreground mb-8">Overview of today's workforce activity</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-card rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow duration-150">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-card rounded-xl shadow-card p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-0">
                    {recentActivity.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-4 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors duration-150"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                                    {item.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.action}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(item.status)}`}>
                                    {item.status}
                                </span>
                                <span className="text-xs text-muted-foreground">{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
