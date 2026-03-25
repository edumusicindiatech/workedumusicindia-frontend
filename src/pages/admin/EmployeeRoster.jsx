import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, AlertCircle, Users } from "lucide-react";
import toast from "react-hot-toast";
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
            toast.error("Failed to load employee roster.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoster();
    }, []);

    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    // --- ERROR STATE ---
    if (error) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-destructive animate-in fade-in">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 opacity-90" />
                </div>
                <p className="font-semibold text-lg">{error}</p>
                <Button variant="outline" className="mt-6 border-destructive/20 text-destructive hover:bg-destructive/10" onClick={fetchRoster}>
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in relative pb-24 md:pb-10 h-full max-w-7xl mx-auto">

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6 md:mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-1.5">Employee Roster</h1>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {isLoading ? "Syncing staff directory..." : `${employees.length} active staff members`}
                    </p>
                </div>

                <Button
                    className="hidden md:flex shadow-lg shadow-primary/20 gap-2 h-11 px-6 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setIsAddModalOpen(true)}
                    disabled={isLoading}
                >
                    <Plus className="w-5 h-5" /> Add New Employee
                </Button>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="bg-transparent md:bg-card/50 md:backdrop-blur-sm md:rounded-2xl md:shadow-sm md:border md:border-border overflow-hidden">

                {/* Search Bar */}
                <div className="mb-5 md:mb-0 md:p-5 md:border-b md:border-border/50 bg-card md:bg-transparent rounded-2xl md:rounded-none border border-border md:border-none shadow-sm md:shadow-none p-2">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search employees by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={isLoading}
                            className="pl-11 h-12 md:h-11 rounded-xl bg-muted/30 border-transparent hover:border-border focus-visible:bg-background focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 shadow-none w-full text-base md:text-sm transition-all"
                        />
                    </div>
                </div>

                {/* ========================================== */}
                {/* LOADING STATE: YOUTUBE-STYLE SHIMMER EFFECT*/}
                {/* ========================================== */}
                {isLoading ? (
                    <div className="animate-in fade-in duration-500">
                        {/* Shimmer: Desktop Table */}
                        <div className="hidden md:block overflow-x-auto p-5">
                            <div className="w-full">
                                <div className="flex items-center gap-4 pb-4 border-b border-border/50 mb-2">
                                    <div className="h-3 bg-muted/60 rounded-full w-24 animate-pulse ml-6"></div>
                                    <div className="h-3 bg-muted/60 rounded-full w-16 animate-pulse ml-[28%]"></div>
                                    <div className="h-3 bg-muted/60 rounded-full w-20 animate-pulse ml-[20%]"></div>
                                </div>
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="flex items-center py-4 border-b border-border/40 px-4">
                                        <div className="flex items-center gap-4 w-[40%]">
                                            <div className="w-10 h-10 rounded-full bg-secondary animate-pulse shrink-0"></div>
                                            <div className="space-y-2.5 w-full">
                                                <div className="h-3.5 bg-secondary rounded-full w-1/2 animate-pulse"></div>
                                                <div className="h-2.5 bg-secondary/60 rounded-full w-1/3 animate-pulse"></div>
                                            </div>
                                        </div>
                                        <div className="w-[25%] pl-4">
                                            <div className="h-3 bg-secondary/80 rounded-full w-24 animate-pulse"></div>
                                        </div>
                                        <div className="w-[35%]">
                                            <div className="h-3 bg-secondary/60 rounded-full w-32 animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shimmer: Mobile Cards */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="w-12 h-12 rounded-full bg-secondary animate-pulse shrink-0"></div>
                                        <div className="flex flex-col gap-2.5 w-full pr-6">
                                            <div className="h-3.5 bg-secondary rounded-full w-2/3 animate-pulse"></div>
                                            <div className="h-2.5 bg-secondary/70 rounded-full w-1/3 animate-pulse"></div>
                                            <div className="h-2.5 bg-secondary/50 rounded-full w-1/2 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        {/* --- DESKTOP VIEW: TABLE --- */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/20">
                                        <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest w-[40%]">Employee</th>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest w-[25%]">Role</th>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest w-[35%]">Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((emp) => (
                                        <tr
                                            key={emp.id}
                                            onClick={() => navigate(`/admin/employees/${emp.id}`)}
                                            className="border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/40 transition-colors group"
                                        >
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                        {emp.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{emp.name}</span>
                                                            {emp.systemRole === 'Admin' && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 leading-none">
                                                                    ADMIN
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground mt-0.5">{emp.email || 'No email provided'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{emp.role}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70"></div>
                                                {emp.location}
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
                                    className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-primary/30"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground shadow-sm shrink-0">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-bold text-base text-foreground tracking-tight">{emp.name}</span>
                                                {emp.systemRole === 'Admin' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 leading-none">
                                                        ADMIN
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs font-medium text-muted-foreground">{emp.role}</span>
                                            <span className="text-[11px] font-medium text-muted-foreground/80 mt-1 flex items-center gap-1.5 bg-muted/40 w-fit px-2 py-0.5 rounded-md">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70"></div> {emp.location}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/30">
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* --- EMPTY STATE --- */}
                        {filtered.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-5 border border-border/50">
                                    <Search className="w-10 h-10 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">No employees found</h3>
                                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                                    {search
                                        ? `We couldn't find anyone matching "${search}". Try adjusting your filters.`
                                        : "Your roster is currently empty. Add your first employee to get started!"}
                                </p>
                                {!search && (
                                    <Button className="mt-6 rounded-xl md:hidden" onClick={() => setIsAddModalOpen(true)}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Employee
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MOBILE APP: FLOATING ACTION BUTTON (FAB) --- */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={isLoading}
                className="md:hidden fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/30 flex items-center justify-center z-40 active:scale-90 transition-all disabled:opacity-50 disabled:active:scale-100"
                aria-label="Add Employee"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Modal Rendering */}
            <AddEmployeeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    toast.success("Employee added successfully!");
                    fetchRoster();
                    setIsAddModalOpen(false);
                }}
            />
        </div>
    );
};

export default EmployeeRoster;