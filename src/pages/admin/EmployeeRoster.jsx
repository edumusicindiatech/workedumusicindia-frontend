import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, AlertCircle, Users } from "lucide-react";
import toast from "react-hot-toast";
import AddEmployeeModal from "../../modals/admin/AddEmployeeModal";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

// --- SOCKET IMPORT FOR REAL-TIME PRESENCE ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const EmployeeRoster = () => {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // --- NEW: Real-Time Presence State for Multiple Users ---
    const [onlineUsers, setOnlineUsers] = useState({});
    const timeoutsRef = useRef({});

    const fetchRoster = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/roster');
            setEmployees(response.data.data);
            setError("");
        } catch (err) {
            console.error("Error fetching roster:", err);
            setError(t('employee_roster.error_load'));
            toast.error(t('employee_roster.toast_load_error'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoster();
    }, []);

    // --- NEW: Real-Time Presence Listener ---
    useEffect(() => {
        // 1. Join the admin tracking room to hear location pings
        socket.emit("join_admin_room");

        // 2. Listen for any employee's location update
        const handleLocationUpdate = (data) => {
            const empId = data.employeeId;
            if (!empId) return;

            // Mark this specific employee as online
            setOnlineUsers((prev) => ({ ...prev, [empId]: true }));

            // Clear any existing timeout for this specific employee
            if (timeoutsRef.current[empId]) {
                clearTimeout(timeoutsRef.current[empId]);
            }

            // Set a new 15-second fuse. If they don't ping again in 15 seconds, mark offline.
            timeoutsRef.current[empId] = setTimeout(() => {
                setOnlineUsers((prev) => ({ ...prev, [empId]: false }));
            }, 15000);
        };

        socket.on("employee_location_changed", handleLocationUpdate);

        return () => {
            socket.off("employee_location_changed", handleLocationUpdate);
            // Cleanup all active timeouts when leaving the page
            Object.values(timeoutsRef.current).forEach(clearTimeout);
        };
    }, []);

    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    if (error) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-destructive animate-in fade-in">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 opacity-90" />
                </div>
                <p className="font-semibold text-lg">{error}</p>
                <Button variant="outline" className="mt-6 border-destructive/20 text-destructive hover:bg-destructive/10" onClick={fetchRoster}>
                    {t('employee_roster.btn_retry')}
                </Button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in relative pb-24 md:pb-10 h-full max-w-7xl mx-auto">

            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6 md:mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-1.5">{t('employee_roster.title')}</h1>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {isLoading ? t('employee_roster.syncing') : t('employee_roster.active_staff', { count: employees.length })}
                    </p>
                </div>

                <Button
                    className="hidden md:flex shadow-lg shadow-primary/20 gap-2 h-11 px-6 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setIsAddModalOpen(true)}
                    disabled={isLoading}
                >
                    <Plus className="w-5 h-5" /> {t('employee_roster.btn_add_desktop')}
                </Button>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="bg-transparent md:bg-card/50 md:backdrop-blur-sm md:rounded-2xl md:shadow-sm md:border md:border-border overflow-hidden">

                {/* Search Bar */}
                <div className="mb-5 md:mb-0 md:p-5 md:border-b md:border-border/50 bg-card md:bg-transparent rounded-2xl md:rounded-none border border-border md:border-none shadow-sm md:shadow-none p-2">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={t('employee_roster.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={isLoading}
                            className="pl-11 h-12 md:h-11 rounded-xl bg-muted/30 border-transparent hover:border-border focus-visible:bg-background focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 shadow-none w-full text-base md:text-sm transition-all"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="animate-in fade-in duration-500">
                        <div className="hidden md:block overflow-x-auto p-5">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-16 w-full bg-muted/20 animate-pulse rounded-xl mb-3" />
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-20 w-full bg-muted/20 animate-pulse rounded-2xl" />
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
                                        <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest w-[40%]">{t('employee_roster.table_employee')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest w-[25%]">{t('employee_roster.table_role')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest w-[35%]">{t('employee_roster.table_location')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((emp) => {
                                        const isOnline = onlineUsers[emp.id];
                                        return (
                                            <tr
                                                key={emp.id}
                                                onClick={() => navigate(`/admin/employees/${emp.id}`)}
                                                className="border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/40 transition-colors group"
                                            >
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-4">
                                                        {/* --- FIXED DESKTOP PROFILE PIC WITH ONLINE INDICATOR --- */}
                                                        <div className="relative w-10 h-10 shrink-0">
                                                            <div className="w-full h-full rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 overflow-hidden transition-all">
                                                                {emp.profilePicture ? (
                                                                    <img
                                                                        src={emp.profilePicture}
                                                                        alt={emp.name}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                            e.target.parentElement.innerHTML = emp.name.charAt(0).toUpperCase();
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    emp.name.charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div
                                                                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-background group-hover:border-muted transition-colors duration-500 ${isOnline ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "bg-slate-400"}`}
                                                                title={isOnline ? "Online" : "Offline"}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{emp.name}</span>
                                                                {emp.systemRole === 'Admin' && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 leading-none">
                                                                        {t('employee_roster.admin_badge')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground mt-0.5">{emp.email || t('employee_roster.no_email')}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{emp.role || t('employee_roster.no_role')}</td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70"></div>
                                                    {emp.location || t('employee_roster.unassigned_role')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* --- MOBILE VIEW: APP CARDS --- */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filtered.map((emp) => {
                                const isOnline = onlineUsers[emp.id];
                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => navigate(`/admin/employees/${emp.id}`)}
                                        className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:border-primary/30"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* --- FIXED MOBILE PROFILE PIC WITH ONLINE INDICATOR --- */}
                                            <div className="relative w-12 h-12 shrink-0">
                                                <div className="w-full h-full rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground shadow-sm overflow-hidden">
                                                    {emp.profilePicture ? (
                                                        <img
                                                            src={emp.profilePicture}
                                                            alt={emp.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = emp.name.charAt(0).toUpperCase();
                                                            }}
                                                        />
                                                    ) : (
                                                        emp.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div
                                                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] border-card transition-colors duration-500 ${isOnline ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "bg-slate-400"}`}
                                                    title={isOnline ? "Online" : "Offline"}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-base text-foreground tracking-tight">{emp.name}</span>
                                                    {emp.systemRole === 'Admin' && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 leading-none">
                                                            {t('employee_roster.admin_badge')}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">{emp.role || t('employee_roster.no_role')}</span>
                                                <span className="text-[11px] font-medium text-muted-foreground/80 mt-1 flex items-center gap-1.5 bg-muted/40 w-fit px-2 py-0.5 rounded-md">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70"></div> {emp.location || t('employee_roster.unassigned_role')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/30">
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* --- EMPTY STATE --- */}
                        {filtered.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-5 border border-border/50">
                                    <Search className="w-10 h-10 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">{t('employee_roster.empty_title')}</h3>
                                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                                    {search
                                        ? t('employee_roster.empty_search', { query: search })
                                        : t('employee_roster.empty_initial')}
                                </p>
                                {!search && (
                                    <Button className="mt-6 rounded-xl md:hidden" onClick={() => setIsAddModalOpen(true)}>
                                        <Plus className="w-4 h-4 mr-2" /> {t('employee_roster.btn_add_mobile')}
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
                aria-label={t('employee_roster.btn_add_mobile')}
            >
                <Plus className="w-6 h-6" />
            </button>

            <AddEmployeeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchRoster();
                    setIsAddModalOpen(false);
                }}
            />
        </div>
    );
};

export default EmployeeRoster;