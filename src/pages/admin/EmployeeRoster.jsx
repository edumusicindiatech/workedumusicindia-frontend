import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight } from "lucide-react";
import AddEmployeeModal from "../../modals/admin/AddEmployeeModal";
// Mock Data
const employees = [
    { id: 1, name: "Sarah Johnson", role: "Field Officer", location: "District A", status: "active", attendance: "Present" },
    { id: 2, name: "Mike Chen", role: "Supervisor", location: "District B", status: "active", attendance: "Present" },
    { id: 3, name: "Emily Davis", role: "Field Officer", location: "District C", status: "warning", attendance: "Late" },
    { id: 4, name: "James Wilson", role: "Field Officer", location: "District A", status: "inactive", attendance: "No-Show" },
    { id: 5, name: "Ana Garcia", role: "Team Lead", location: "District B", status: "active", attendance: "Present" },
    { id: 6, name: "David Lee", role: "Field Officer", location: "District D", status: "active", attendance: "Present" },
    { id: 7, name: "Lisa Brown", role: "Coordinator", location: "District A", status: "active", attendance: "Present" },
    { id: 8, name: "Tom Martinez", role: "Field Officer", location: "District C", status: "warning", attendance: "Pending" },
];

const attendanceBadge = (a) => {
    const m = {
        Present: "bg-success/10 text-success",
        Late: "bg-warning/10 text-warning",
        "No-Show": "bg-destructive/10 text-destructive",
        Pending: "bg-warning/10 text-warning",
    };
    return m[a] || "bg-muted text-muted-foreground";
};

const EmployeeRoster = () => {
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const navigate = useNavigate();

    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        // Added pb-24 so the floating button doesn't cover the last list item
        <div className="animate-fade-in relative pb-24 md:pb-10 h-full">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Employee Roster</h1>
                    <p className="text-sm text-muted-foreground">{employees.length} total employees</p>
                </div>

                {/* Desktop 'Add' Button (Hidden on Mobile) */}
                <Button
                    className="hidden md:flex shadow-glow gap-2 h-11 px-6 rounded-xl"
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <Plus className="w-4 h-4" /> Add New Employee
                </Button>
            </div>

            {/* Main Content Area */}
            <div className="bg-transparent md:bg-card md:rounded-2xl md:shadow-card md:border md:border-border overflow-hidden">

                {/* Search Bar - Full width on mobile, constrained on desktop */}
                <div className="mb-4 md:mb-0 md:p-5 md:border-b md:border-border">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-12 md:h-11 rounded-xl bg-card border-border shadow-sm w-full text-base md:text-sm"
                        />
                    </div>
                </div>

                {/* --- DESKTOP VIEW: TABLE --- */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Attendance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((emp, i) => (
                                <tr
                                    key={emp.id}
                                    onClick={() => navigate(`/admin/employees/${emp.id}`)}
                                    className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors duration-150 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-sm text-foreground">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">{emp.role}</td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">{emp.location}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${attendanceBadge(emp.attendance)}`}>
                                            {emp.attendance}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- MOBILE VIEW: APP CARDS --- */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                    {filtered.map((emp) => (
                        <div
                            key={emp.id}
                            onClick={() => navigate(`/admin/employees/${emp.id}`)}
                            className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground shadow-sm shrink-0">
                                    {emp.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-base text-foreground mb-0.5">{emp.name}</span>
                                    <span className="text-xs font-medium text-muted-foreground">{emp.role}</span>
                                    <span className="text-[11px] text-muted-foreground opacity-80 mt-1 flex items-center gap-1">
                                        📍 {emp.location}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${attendanceBadge(emp.attendance)}`}>
                                    {emp.attendance}
                                </span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {filtered.length === 0 && (
                        <div className="py-10 text-center text-muted-foreground">
                            No employees found.
                        </div>
                    )}
                </div>
            </div>

            {/* --- MOBILE APP: FLOATING ACTION BUTTON (FAB) --- */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="md:hidden fixed bottom-20 right-5 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40 active:scale-90 transition-transform"
                aria-label="Add Employee"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modal Rendering */}
            <AddEmployeeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
};

export default EmployeeRoster;