import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import AddEmployeeModal from "../../modals/AddEmployeeModal"; // <-- Import the new modal

// Mock Data updated to use 'location'
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
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); // <-- Modal State
    const navigate = useNavigate();

    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in relative pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Employee Roster</h1>
                    <p className="text-muted-foreground">{employees.length} total employees</p>
                </div>
                <Button
                    className="shadow-glow gap-2"
                    onClick={() => setIsAddModalOpen(true)} // <-- Open Modal
                >
                    <Plus className="w-4 h-4" /> Add New Employee
                </Button>
            </div>

            <div className="bg-card rounded-xl shadow-card overflow-hidden">
                <div className="p-4 border-b border-border">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-lg"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-muted/20">
                                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((emp, i) => (
                                <tr
                                    key={emp.id}
                                    onClick={() => navigate(`/admin/employees/${emp.id}`)}
                                    className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors duration-150 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shadow-sm">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-sm text-foreground">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-muted-foreground">{emp.role}</td>
                                    <td className="px-5 py-4 text-sm text-muted-foreground">{emp.location}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${attendanceBadge(emp.attendance)}`}>
                                            {emp.attendance}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Add Employee Modal Rendering --- */}
            <AddEmployeeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
};

export default EmployeeRoster;