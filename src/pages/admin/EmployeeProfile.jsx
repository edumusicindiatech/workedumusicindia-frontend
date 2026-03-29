import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft, School, ClipboardList, AlertTriangle,
    CalendarDays, MapPin, Pencil, Trash2, AlertCircle,
    Mail, Phone, Briefcase
} from "lucide-react";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";

// --- Import Tab Components ---
import AssignmentsTab from "./tabs/AssignmentsTab";
import TasksTab from "./tabs/TasksTab";
import WarningsTab from "./tabs/WarningsTab";
import AttendanceTab from "./tabs/AttendanceTab";

// --- Import Modals ---
import EditEmployeeModal from "../../modals/admin/EditEmployeeModal";
import DeleteEmployeeModal from "../../modals/admin/DeleteEmployeeModal";

const EmployeeProfile = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();

    const [employeeData, setEmployeeData] = useState(null);
    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchEmployeeDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.get(`/admin/employees/${id}`);
            setEmployeeData(response.data.data);

            const attResponse = await api.get(`/admin/employees/${id}/attendance`);
            setAttendanceData(attResponse.data.data || []);

            setErrorMsg("");
        } catch (err) {
            console.error("Error fetching employee:", err);
            setErrorMsg(t('employee_profile.error_load'));
        } finally {
            setIsLoading(false);
        }
    }, [id, t]);

    useEffect(() => {
        if (id) {
            fetchEmployeeDetails();
        }
    }, [id, fetchEmployeeDetails]);

    const handleSaveEdit = (updatedEmployee) => setEmployeeData(updatedEmployee);
    const handleConfirmDelete = () => {
        navigate("/admin/employees", { replace: true });
    };

    if (errorMsg || (!isLoading && !employeeData)) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-destructive animate-in fade-in">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 opacity-90" />
                </div>
                <p className="font-semibold text-lg">{errorMsg || t('employee_profile.not_found')}</p>
                <button
                    onClick={() => navigate("/admin/employees")}
                    className="mt-6 px-6 py-2 bg-background border border-border rounded-xl text-foreground font-medium hover:bg-muted transition-colors"
                >
                    {t('employee_profile.btn_return')}
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-12 relative max-w-6xl mx-auto h-full">
            <button
                onClick={() => navigate("/admin/employees")}
                className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors w-fit"
                disabled={isLoading}
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                {t('employee_profile.btn_back')}
            </button>

            {isLoading && !employeeData ? (
                <div className="animate-in fade-in duration-500">
                    <div className="relative flex flex-col sm:flex-row sm:items-start gap-6 mb-8 bg-card/40 p-6 sm:p-8 rounded-3xl border border-border/40 overflow-hidden h-40 animate-pulse" />
                    <div className="h-64 bg-card/20 rounded-3xl animate-pulse" />
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">

                    {/* --- HEADER PROFILE CARD --- */}
                    <div className="relative flex flex-col sm:flex-row sm:items-start gap-6 mb-8 bg-card/60 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-sm border border-border/60 overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />

                        <div className="relative shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-extrabold text-primary-foreground shadow-lg ring-4 ring-background z-10 relative">
                                {employeeData.profilePicture ? (
                                    // If it's a URL, use an <img> tag. If it's an icon/string, just render it.
                                    typeof employeeData.profilePicture === 'string' && employeeData.profilePicture.startsWith('http')
                                        ? <img src={employeeData.profilePicture} alt={employeeData.name} className="w-full h-full rounded-full object-cover" />
                                        : employeeData.profilePicture
                                ) : (
                                    employeeData.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className={`absolute bottom-1 sm:bottom-2 right-1 sm:right-2 w-5 h-5 rounded-full border-4 border-background z-20 ${employeeData.isActive ? "bg-emerald-500" : "bg-destructive"}`} />
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col justify-center pt-1">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                                            {employeeData.name}
                                        </h1>
                                        <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase border ${employeeData.isActive
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                            : "bg-destructive/10 text-destructive border-destructive/20"
                                            }`}>
                                            {employeeData.isActive ? t('employee_profile.status_active') : t('employee_profile.status_inactive')}
                                        </span>
                                    </div>

                                    <div className="flex sm:hidden items-center gap-2 mt-3 mb-1">
                                        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-border/50">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border/50">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="hidden sm:flex items-center gap-2 shrink-0">
                                    <button onClick={() => setIsEditModalOpen(true)} className="p-2.5 text-muted-foreground hover:text-primary bg-background hover:bg-primary/10 border border-border/60 rounded-xl transition-all hover:scale-105 shadow-sm">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 text-muted-foreground hover:text-destructive bg-background hover:bg-destructive/10 border border-border/60 rounded-xl transition-all hover:scale-105 shadow-sm">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 sm:mt-5">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs sm:text-sm font-semibold">
                                    <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-80" />
                                    {employeeData.designation || t('employee_profile.staff_fallback')}
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 text-muted-foreground border border-border/60 rounded-lg text-xs sm:text-sm font-medium">
                                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
                                    {employeeData.zone || t('employee_profile.unassigned_zone')}
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 text-muted-foreground border border-border/60 rounded-lg text-xs sm:text-sm font-medium">
                                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
                                    <span className="truncate max-w-37.5 sm:max-w-none">{employeeData.email}</span>
                                </div>
                                {employeeData.mobile && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 text-muted-foreground border border-border/60 rounded-lg text-xs sm:text-sm font-medium">
                                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
                                        {employeeData.mobile}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- TABS SECTION --- */}
                    <Tabs defaultValue="schools" className="space-y-6">
                        {/* 👇 FIX APPLIED HERE: Added scrollbar hiding classes */}
                        <div className="w-full overflow-x-auto border-b border-border/40 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <TabsList className="bg-transparent w-max sm:w-full flex justify-start p-0 h-auto gap-6 sm:gap-8 rounded-none">
                                <TabsTrigger
                                    value="schools"
                                    className="relative flex items-center gap-2 py-3 px-1 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors group"
                                >
                                    <School className="w-4 h-4" /> <span className="font-semibold">{t('employee_profile.tabs.assignments')}</span>
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-data-[state=active]:scale-x-100 transition-transform origin-left rounded-t-full"></div>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="tasks"
                                    className="relative flex items-center gap-2 py-3 px-1 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors group"
                                >
                                    <ClipboardList className="w-4 h-4" /> <span className="font-semibold">{t('employee_profile.tabs.tasks')}</span>
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-data-[state=active]:scale-x-100 transition-transform origin-left rounded-t-full"></div>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="warnings"
                                    className="relative flex items-center gap-2 py-3 px-1 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors group"
                                >
                                    <AlertTriangle className="w-4 h-4" /> <span className="font-semibold">{t('employee_profile.tabs.warnings')}</span>
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-data-[state=active]:scale-x-100 transition-transform origin-left rounded-t-full"></div>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="attendance"
                                    className="relative flex items-center gap-2 py-3 px-1 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors group"
                                >
                                    <CalendarDays className="w-4 h-4" /> <span className="font-semibold">{t('employee_profile.tabs.attendance')}</span>
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-data-[state=active]:scale-x-100 transition-transform origin-left rounded-t-full"></div>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="mt-6">
                            <TabsContent value="schools" className="animate-in slide-in-from-left-4 fade-in duration-300">
                                <AssignmentsTab schools={employeeData?.assignments || []} employeeId={id} onSuccess={fetchEmployeeDetails} />
                            </TabsContent>

                            <TabsContent value="tasks" className="animate-in slide-in-from-left-4 fade-in duration-300">
                                <TasksTab tasks={employeeData?.tasks || []} employeeId={id} onSuccess={fetchEmployeeDetails} />
                            </TabsContent>

                            <TabsContent value="warnings" className="animate-in slide-in-from-left-4 fade-in duration-300">
                                <WarningsTab warningsList={employeeData?.warnings || []} employeeId={id} onSuccess={fetchEmployeeDetails} />
                            </TabsContent>

                            <TabsContent value="attendance" className="animate-in slide-in-from-left-4 fade-in duration-300">
                                <AttendanceTab
                                    attendanceData={attendanceData}
                                    employeeName={employeeData?.name}
                                    assignments={employeeData?.assignments}
                                />
                            </TabsContent>
                        </div>
                    </Tabs>

                    {employeeData && (
                        <>
                            <EditEmployeeModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} employee={employeeData} onSave={handleSaveEdit} />
                            <DeleteEmployeeModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} employeeId={id} employeeName={employeeData.name} onConfirm={handleConfirmDelete} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeProfile;