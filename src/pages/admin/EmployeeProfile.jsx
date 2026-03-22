import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, replace } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, School, ClipboardList, Film, AlertTriangle, CalendarDays, MapPin, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import api from "../../api/axios";

// --- Import Tab Components ---
import AssignmentsTab from "./tabs/AssignmentsTab";
import TasksTab from "./tabs/TasksTab";
import MediaTab from "./tabs/MediaTab";
import WarningsTab from "./tabs/WarningsTab";
import AttendanceTab from "./tabs/AttendanceTab";

// --- Import Modals ---
import EditEmployeeModal from "../../modals/admin/EditEmployeeModal";
import DeleteEmployeeModal from "../../modals/admin/DeleteEmployeeModal";

// --- MOCK DATA FOR TABS ---
const optionalTasks = [];
const warnings = [];
const monthlyAttendanceData = [];
const mediaCollections = [];

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- API Data States ---
    const [employeeData, setEmployeeData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // --- Modal States ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // --- CRITICAL FIX: Move fetch function outside useEffect so it can be passed as a prop! ---
    const fetchEmployeeDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.get(`/admin/employees/${id}`);
            setEmployeeData(response.data.data);
            setErrorMsg("");
        } catch (err) {
            console.error("Error fetching employee:", err);
            setErrorMsg("Failed to load employee profile.");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchEmployeeDetails();
        }
    }, [id, fetchEmployeeDetails]);

    // --- Handlers ---
    const handleSaveEdit = (updatedEmployee) => setEmployeeData(updatedEmployee);
    const handleConfirmDelete = () => {
        navigate("/admin/employees"), { replace: true };
    };

    // --- LOADING & ERROR UI ---
    if (isLoading && !employeeData) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground animate-fade-in">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p>Loading profile...</p>
            </div>
        );
    }

    if (errorMsg || !employeeData) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-destructive animate-fade-in">
                <AlertCircle className="w-10 h-10 mb-4" />
                <p className="font-semibold text-lg">{errorMsg || "Employee not found"}</p>
                <button onClick={() => navigate("/admin/roster")} className="mt-4 text-primary underline">
                    Return to Roster
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-10 relative">
            <button
                onClick={() => navigate("/admin/employees")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Roster
            </button>

            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-md shrink-0">
                    {employeeData.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{employeeData.name}</h1>
                        <div className="flex items-center shrink-0">
                            <button onClick={() => setIsEditModalOpen(true)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors">
                                <Pencil className="w-4 h-4 sm:w-4 sm:h-4" />
                            </button>
                            <button onClick={() => setIsDeleteModalOpen(true)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                                <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-muted-foreground flex-wrap">
                        <span className="hidden sm:inline font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">
                            {employeeData.designation || 'Staff'}
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3.5 h-3.5" /> {employeeData.zone || 'Unassigned'}
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span className="text-sm">{employeeData.email}</span>
                        {employeeData.mobile && (
                            <>
                                <span className="hidden sm:inline">·</span>
                                <span className="text-sm">{employeeData.mobile}</span>
                            </>
                        )}
                    </div>
                </div>

                <span className={`mt-4 sm:mt-0 px-4 py-1.5 rounded-full text-sm font-semibold border text-center ${employeeData.isActive
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}>
                    {employeeData.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
            </div>

            {/* Main Tabs Navigation */}
            <Tabs defaultValue="schools" className="space-y-6">
                <TabsList className="bg-card w-full flex justify-between sm:justify-center border border-border p-1 h-auto rounded-xl flex-wrap">
                    <TabsTrigger value="schools" className="flex-1 sm:flex-initial md:cursor-pointer justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm">
                        <School className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Assignments</span>
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 md:cursor-pointer px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm">
                        <ClipboardList className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Tasks</span>
                    </TabsTrigger>
                    <TabsTrigger value="media" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm md:cursor-pointer">
                        <Film className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Media</span>
                    </TabsTrigger>
                    <TabsTrigger value="warnings" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm md:cursor-pointer">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Warnings</span>
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm md:cursor-pointer">
                        <CalendarDays className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Attendance</span>
                    </TabsTrigger>
                </TabsList>

                {/* Render Separated Tab Components */}
                <TabsContent value="schools" className="animate-in fade-in-50">
                    <AssignmentsTab
                        schools={employeeData?.assignments || []}
                        employeeId={id}
                        onSuccess={fetchEmployeeDetails} // <-- NOW IT WORKS!
                    />
                </TabsContent>

                <TabsContent value="tasks" className="animate-in fade-in-50">
                    <TasksTab
                        tasks={employeeData?.tasks || []} // Pass REAL tasks
                        employeeId={id}
                        onSuccess={fetchEmployeeDetails}  // Refreshes the page instantly!
                    />
                </TabsContent>

                <TabsContent value="media" className="animate-in fade-in-50">
                    <MediaTab collections={mediaCollections} />
                </TabsContent>

                <TabsContent value="warnings" className="animate-in fade-in-50">
                    <WarningsTab warningsList={warnings} />
                </TabsContent>

                <TabsContent value="attendance" className="animate-in fade-in-50">
                    <AttendanceTab attendanceData={monthlyAttendanceData} />
                </TabsContent>
            </Tabs>

            {employeeData && (
                <>
                    <EditEmployeeModal isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        employee={employeeData}
                        onSave={handleSaveEdit} />

                    <DeleteEmployeeModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        employeeId={id} // Pass the ID from useParams()
                        employeeName={employeeData.name}
                        onConfirm={handleConfirmDelete}
                    /></>
            )}
        </div>
    );
};

export default EmployeeProfile; 