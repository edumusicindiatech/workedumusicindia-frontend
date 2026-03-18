import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft, Plus, AlertTriangle, DollarSign,
    School, ClipboardList, MapPin, Calendar,
    CheckCircle2, XCircle, Clock, CalendarDays, Eye, ChevronRight
} from "lucide-react";

import AssignSchoolModal from "../../modals/AssignSchoolModals";
import AssignTaskModal from "../../modals/AssignTaskModal";
import AttendanceDetailsModal from "../../modals/AttendanceDetailsModal";

// --- MOCK DATA ---
const employeeData = {
    id: 1, name: "Sarah Johnson", role: "Field Officer", zone: "Zone A",
    email: "sarah.j@workforce.com", phone: "+1 (555) 123-4567", joinDate: "Jan 15, 2023", status: "active",
};

const assignedSchools = [
    { id: 101, name: "Lincoln High School", address: "123 Main St", status: "Pending Visit" },
    { id: 102, name: "Washington Elementary", address: "456 Oak Ave", status: "Visited Today" },
];

const optionalTasks = [
    { id: 201, title: "Emergency Equipment Audit", school: "Roosevelt Middle", status: "Accepted", reason: "" },
    { id: 202, title: "Staff Training Session", school: "Lincoln High School", status: "Pending", reason: "" },
    { id: 203, title: "Facility Inspection", school: "Washington Elementary", status: "Rejected", reason: "Schedule conflict." },
];

const deductions = [
    { id: 1, date: "Mar 1, 2024", amount: 150, reason: "Late arrivals (3x)", status: "applied" },
    { id: 2, date: "Feb 15, 2024", amount: 75, reason: "Uniform violation", status: "applied" },
];

const warnings = [
    { id: 1, date: "Feb 10, 2024", type: "Verbal", reason: "Tardiness", issuedBy: "Manager A" },
];

const monthlyAttendanceSummaries = [
    { id: 'm1', month: "March 2024", present: 18, late: 2, absent: 1, holidays: 4, totalDays: 25 },
    { id: 'm2', month: "February 2024", present: 19, late: 1, absent: 0, holidays: 8, totalDays: 28 },
    { id: 'm3', month: "January 2024", present: 20, late: 0, absent: 2, holidays: 5, totalDays: 27 },
];

const detailedMonthlyRecords = {
    'm1': [
        { date: 'Mar 1, 2024 (Fri)', status: 'Present', timeIn: '08:00 AM' },
        { date: 'Mar 2, 2024 (Sat)', status: 'Present', timeIn: '08:05 AM' },
        { date: 'Mar 3, 2024 (Sun)', status: 'Holiday', timeIn: '-' },
        { date: 'Mar 4, 2024 (Mon)', status: 'Late', timeIn: '08:45 AM' },
        { date: 'Mar 5, 2024 (Tue)', status: 'Absent', timeIn: '-' },
    ]
};

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Form states
    const [newDeduction, setNewDeduction] = useState({ amount: "", reason: "" });
    const [newWarning, setNewWarning] = useState({ type: "Verbal", reason: "" });

    // Modal States
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(null);

    return (
        <div className="animate-fade-in pb-10 relative">
            <button
                onClick={() => navigate("/admin/employees")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Roster
            </button>

            {/* Header Card (Restored original code) */}
            <div className="flex items-center gap-4 mb-8 bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-md">
                    {employeeData.name.charAt(0)}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{employeeData.name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">{employeeData.role}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-sm"><MapPin className="w-3.5 h-3.5" /> {employeeData.zone}</span>
                    </div>
                </div>
                <span className="ml-auto px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {employeeData.status.toUpperCase()}
                </span>
            </div>

            {/* Main Tabs (Restored original code) */}
            <Tabs defaultValue="schools" className="space-y-6">
                <TabsList className="bg-card w-full justify-start overflow-x-auto border border-border p-1 h-auto rounded-xl flex-wrap">
                    <TabsTrigger value="schools" className="gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm">
                        <School className="w-4 h-4" /> School Assignments
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm">
                        <ClipboardList className="w-4 h-4" /> Optional Tasks
                    </TabsTrigger>
                    <TabsTrigger value="payroll" className="gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm">
                        <DollarSign className="w-4 h-4" /> Deductions
                    </TabsTrigger>
                    <TabsTrigger value="warnings" className="gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm">
                        <AlertTriangle className="w-4 h-4" /> Warnings
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm">
                        <CalendarDays className="w-4 h-4" /> Attendance Record
                    </TabsTrigger>
                </TabsList>

                {/* --- SCHOOL ASSIGNMENTS TAB (Restored original code) --- */}
                <TabsContent value="schools" className="space-y-6 animate-in fade-in-50">
                    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h3 className="text-lg font-semibold flex items-center gap-2"><School className="w-5 h-5 text-primary" /> Assigned Schools</h3>
                            <Button size="sm" className="gap-2" onClick={() => setIsAssignModalOpen(true)}>
                                <Plus className="w-4 h-4" /> Assign School
                            </Button>
                        </div>
                        <div className="p-0">
                            {assignedSchools.map((school) => (
                                <div key={school.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <div>
                                        <p className="font-semibold text-foreground">{school.name}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3.5 h-3.5" /> {school.address}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${school.status === 'Visited Today' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-600'}`}>
                                        {school.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* --- OPTIONAL TASKS TAB (Restored original code) --- */}
                <TabsContent value="tasks" className="space-y-6 animate-in fade-in-50">
                    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Task Requests</h3>
                                <p className="text-sm text-muted-foreground mt-1">Review the status of optional assignments sent to this employee.</p>
                            </div>
                            <Button size="sm" className="gap-2" onClick={() => setIsTaskModalOpen(true)}>
                                <Plus className="w-4 h-4" /> Send Request
                            </Button>
                        </div>
                        <div className="p-0">
                            {optionalTasks.map((task) => (
                                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border last:border-0 hover:bg-muted/30 gap-4">
                                    <div>
                                        <p className="font-semibold text-foreground text-base">{task.title}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                            <School className="w-3.5 h-3.5" /> {task.school}
                                        </p>
                                        {task.status === 'Rejected' && task.reason && (
                                            <p className="text-sm text-destructive mt-2 bg-destructive/10 p-2 rounded-md border border-destructive/20 inline-block">
                                                <span className="font-medium">Reason:</span> {task.reason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {task.status === 'Accepted' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        {task.status === 'Rejected' && <XCircle className="w-4 h-4 text-destructive" />}
                                        {task.status === 'Pending' && <Clock className="w-4 h-4 text-slate-500" />}
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${task.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : task.status === 'Rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                                            {task.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* --- PAYROLL & DEDUCTIONS TAB (Restored original code) --- */}
                <TabsContent value="payroll" className="space-y-6">
                    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
                        <h3 className="text-lg font-semibold mb-4">Deduction History</h3>
                        <div className="space-y-3">
                            {deductions.map((d) => (
                                <div key={d.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <div>
                                        <p className="font-medium">{d.reason}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                            <Calendar className="w-3.5 h-3.5" />{d.date}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${d.status === "applied" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                                            {d.status}
                                        </span>
                                        <span className="font-semibold text-destructive text-lg">-${d.amount}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
                        <h3 className="text-lg font-semibold mb-4">Add New Deduction</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Amount ($)</Label>
                                <Input type="number" placeholder="0.00" value={newDeduction.amount} onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })} />
                            </div>
                            <div>
                                <Label>Reason</Label>
                                <Input placeholder="Reason for deduction" value={newDeduction.reason} onChange={(e) => setNewDeduction({ ...newDeduction, reason: e.target.value })} />
                            </div>
                        </div>
                        <Button className="mt-4 gap-2">
                            <Plus className="w-4 h-4" /> Add Deduction
                        </Button>
                    </div>
                </TabsContent>

                {/* --- WARNINGS TAB (Restored original code) --- */}
                <TabsContent value="warnings" className="space-y-6">
                    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
                        <h3 className="text-lg font-semibold mb-4">Warning History</h3>
                        <div className="space-y-3">
                            {warnings.map((w) => (
                                <div key={w.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${w.type === "Written" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{w.type} Warning</span>
                                            <span className="text-sm text-muted-foreground">· {w.date}</span>
                                        </div>
                                        <p className="text-sm text-foreground mt-1">{w.reason}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Issued by: {w.issuedBy}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-card p-6 border border-border">
                        <h3 className="text-lg font-semibold mb-4">Issue New Warning</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Type</Label>
                                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newWarning.type} onChange={(e) => setNewWarning({ ...newWarning, type: e.target.value })}>
                                    <option>Verbal</option>
                                    <option>Written</option>
                                    <option>Final</option>
                                </select>
                            </div>
                            <div>
                                <Label>Reason</Label>
                                <Input placeholder="Reason for warning" value={newWarning.reason} onChange={(e) => setNewWarning({ ...newWarning, reason: e.target.value })} />
                            </div>
                        </div>
                        <Button className="mt-4 gap-2">
                            <Plus className="w-4 h-4" /> Issue Warning
                        </Button>
                    </div>
                </TabsContent>

                {/* --- ATTENDANCE RECORD TAB (UPDATED: Hidden on mobile, cards shown instead. No stats in table) --- */}
                <TabsContent value="attendance" className="space-y-6 animate-in fade-in-50">
                    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/20">
                            <h3 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Historical Attendance</h3>
                            <p className="text-sm text-muted-foreground mt-1">Select a month to view the detailed daily breakdown.</p>
                        </div>

                        <div className="p-0">
                            {/* Desktop Table: Shows only Month and Action */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                        <tr>
                                            <th className="px-6 py-3">Month</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyAttendanceSummaries.map((record) => (
                                            <tr key={record.id} className="border-b border-border hover:bg-muted/30">
                                                <td className="px-6 py-4 font-medium">{record.month}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2 h-8"
                                                        onClick={() => setSelectedMonth(record)}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards: Tap to view details */}
                            <div className="grid grid-cols-1 gap-3 md:hidden p-4">
                                {monthlyAttendanceSummaries.map((record) => (
                                    <div
                                        key={record.id}
                                        onClick={() => setSelectedMonth(record)}
                                        className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <CalendarDays className="w-6 h-6" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-base text-foreground">{record.month}</span>
                                                <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Tap to view details</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* --- Modals --- */}
            <AssignSchoolModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />
            <AssignTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
            <AttendanceDetailsModal selectedMonth={selectedMonth} detailedRecords={detailedMonthlyRecords} onClose={() => setSelectedMonth(null)} />
        </div>
    );
};

export default EmployeeProfile;