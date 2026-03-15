import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, AlertTriangle, DollarSign, Bell, Mail, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const employeeData = {
    id: 1,
    name: "Sarah Johnson",
    role: "Field Officer",
    zone: "Zone A",
    email: "sarah.j@workforce.com",
    phone: "+1 (555) 123-4567",
    joinDate: "Jan 15, 2023",
    status: "active",
};

const deductions = [
    { id: 1, date: "Mar 1, 2024", amount: 150, reason: "Late arrivals (3x)", status: "applied" },
    { id: 2, date: "Feb 15, 2024", amount: 75, reason: "Uniform violation", status: "applied" },
    { id: 3, date: "Jan 20, 2024", amount: 200, reason: "Missed training", status: "disputed" },
];

const warnings = [
    { id: 1, date: "Feb 10, 2024", type: "Verbal", reason: "Tardiness", issuedBy: "Manager A" },
    { id: 2, date: "Jan 5, 2024", type: "Written", reason: "Policy violation", issuedBy: "HR Department" },
];

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [newDeduction, setNewDeduction] = useState({ amount: "", reason: "" });
    const [newWarning, setNewWarning] = useState({ type: "Verbal", reason: "" });

    return (
        <div className="animate-fade-in">
            <button
                onClick={() => navigate("/admin/employees")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Roster
            </button>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {employeeData.name.charAt(0)}
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{employeeData.name}</h1>
                    <p className="text-muted-foreground">{employeeData.role} · {employeeData.zone}</p>
                </div>
                <span className="ml-auto px-3 py-1 rounded-full text-sm font-medium bg-success/10 text-success">
                    {employeeData.status}
                </span>
            </div>

            <Tabs defaultValue="payroll" className="space-y-6">
                <TabsList className="bg-card">
                    <TabsTrigger value="payroll" className="gap-2">
                        <DollarSign className="w-4 h-4" /> Payroll & Deductions
                    </TabsTrigger>
                    <TabsTrigger value="warnings" className="gap-2">
                        <AlertTriangle className="w-4 h-4" /> Warnings
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="w-4 h-4" /> Notifications
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="payroll" className="space-y-6">
                    <div className="bg-card rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Deduction History</h3>
                        <div className="space-y-3">
                            {deductions.map((d) => (
                                <div key={d.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{d.reason}</p>
                                        <p className="text-sm text-muted-foreground">{d.date}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${d.status === "applied" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                                            }`}>
                                            {d.status}
                                        </span>
                                        <span className="font-semibold text-destructive">-${d.amount}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Add New Deduction</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Amount ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={newDeduction.amount}
                                    onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Reason</Label>
                                <Input
                                    placeholder="Reason for deduction"
                                    value={newDeduction.reason}
                                    onChange={(e) => setNewDeduction({ ...newDeduction, reason: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button className="mt-4 gap-2">
                            <Plus className="w-4 h-4" /> Add Deduction
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="warnings" className="space-y-6">
                    <div className="bg-card rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Warning History</h3>
                        <div className="space-y-3">
                            {warnings.map((w) => (
                                <div key={w.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${w.type === "Written" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                                        }`}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{w.type} Warning</span>
                                            <span className="text-sm text-muted-foreground">· {w.date}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{w.reason}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Issued by: {w.issuedBy}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Issue New Warning</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Type</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                                    value={newWarning.type}
                                    onChange={(e) => setNewWarning({ ...newWarning, type: e.target.value })}
                                >
                                    <option>Verbal</option>
                                    <option>Written</option>
                                    <option>Final</option>
                                </select>
                            </div>
                            <div>
                                <Label>Reason</Label>
                                <Input
                                    placeholder="Reason for warning"
                                    value={newWarning.reason}
                                    onChange={(e) => setNewWarning({ ...newWarning, reason: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button className="mt-4 gap-2">
                            <Plus className="w-4 h-4" /> Issue Warning
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <div className="bg-card rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Alert Preferences</h3>
                        <div className="space-y-4">
                            {[
                                { icon: Mail, label: "Email alerts for absences", desc: "Receive email when employee is marked absent" },
                                { icon: MessageSquare, label: "SMS for late arrivals", desc: "Text notification for tardiness" },
                                { icon: Bell, label: "Push notifications", desc: "Browser alerts for all activities" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <item.icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.label}</p>
                                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                                        </div>
                                    </div>
                                    <Switch defaultChecked={i < 2} />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default EmployeeProfile;
