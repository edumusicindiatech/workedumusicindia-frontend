import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import AddEmployeeModal from "../../modals/admin/AddEmployeeModal";
import api from "../../api/axios";

const EmployeeRoster = () => {
    // --- UI STATES ---
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const navigate = useNavigate();

    // --- API DATA STATES ---
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // --- FETCH FUNCTION ---
    const fetchRoster = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/roster');
            setEmployees(response.data.data);
            setError("");
        } catch (err) {
            console.error("Error fetching roster:", err);
            setError("Failed to load employee roster. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data on initial component mount
    useEffect(() => {
        fetchRoster();
    }, []);

    // Filter employees based on search input
    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    // --- LOADING STATE ---
    if (isLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground animate-in fade-in">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Loading roster data...</p>
            </div>
        );
    }

    // --- ERROR STATE ---
    if (error) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-destructive animate-in fade-in">
                <AlertCircle className="w-12 h-12 mb-4 opacity-80" />
                <p className="font-semibold">{error}</p>
                <Button variant="outline" className="mt-6" onClick={fetchRoster}>
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in relative pb-24 md:pb-10 h-full">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Employee Roster</h1>
                    <p className="text-sm text-muted-foreground">{employees.length} total employees</p>
                </div>

                {/* Desktop 'Add' Button */}
                <Button
                    className="hidden md:flex shadow-glow gap-2 h-11 px-6 rounded-xl"
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <Plus className="w-4 h-4" /> Add New Employee
                </Button>
            </div>

            {/* Main Content Area */}
            <div className="bg-transparent md:bg-card md:rounded-2xl md:shadow-card md:border md:border-border overflow-hidden">

                {/* Search Bar */}
                <div className="mb-4 md:mb-0 md:p-5 md:border-b md:border-border">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-12 md:h-11 rounded-xl bg-card border-border shadow-sm w-full text-base md:text-sm focus-visible:ring-primary"
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
                                                {emp.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-sm text-foreground">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">{emp.role}</td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">{emp.location}</td>
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
                                    {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-base text-foreground mb-0.5">{emp.name}</span>
                                    <span className="text-xs font-medium text-muted-foreground">{emp.role}</span>
                                    <span className="text-[11px] text-muted-foreground opacity-80 mt-1 flex items-center gap-1">
                                        📍 {emp.location}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center px-2">
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filtered.length === 0 && (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">No employees found</h3>
                        <p className="text-sm text-muted-foreground max-w-62.5">
                            {search ? "We couldn't find anyone matching that search." : "Your roster is currently empty. Add your first employee to get started!"}
                        </p>
                    </div>
                )}
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
                // We pass fetchRoster so the modal can call it upon a successful creation!
                onSuccess={() => {
                    fetchRoster();
                    setIsAddModalOpen(false);
                }}
            />
        </div>
    );
};

export default EmployeeRoster;