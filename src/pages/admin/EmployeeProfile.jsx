import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, School, ClipboardList, Film, AlertTriangle, CalendarDays, MapPin } from "lucide-react";

// --- Import your new Tab Components ---
// Adjust the paths below based on where you saved them!
import AssignmentsTab from "./tabs/AssignmentsTab";
import TasksTab from "./tabs/TasksTab";
import MediaTab from "./tabs/MediaTab";
import WarningsTab from "./tabs/WarningsTab";
import AttendanceTab from "./tabs/AttendanceTab";

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

const warnings = [
    { id: 1, date: "Feb 10, 2024", type: "Verbal", reason: "Tardiness", issuedBy: "Manager A" },
];

const monthlyAttendanceData = [
    {
        id: 'm1', month: "March 2024",
        schools: [
            { id: 101, name: "Lincoln High School", address: "123 Main St", stats: { present: 12, late: 2, absent: 1, holidays: 2 }, records: [{ date: 'Mar 15, 2024 (Fri)', status: 'Present', timeIn: '08:00 AM' }, { date: 'Mar 12, 2024 (Tue)', status: 'Late', timeIn: '08:45 AM' }, { date: 'Mar 10, 2024 (Sun)', status: 'Holiday', timeIn: '-' }] },
            { id: 102, name: "Washington Elementary", address: "456 Oak Ave", stats: { present: 6, late: 0, absent: 0, holidays: 2 }, records: [{ date: 'Mar 14, 2024 (Thu)', status: 'Present', timeIn: '07:55 AM' }] }
        ]
    }
];

const mediaCollections = [
    {
        id: 'mm1', month: "March 2024",
        dates: [
            { id: 'md1', date: "Mar 15, 2024", files: [{ id: 'v1', type: 'video', title: 'Classroom Activity Video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', size: '12 MB' }, { id: 'v2', type: 'video', title: 'Morning Assembly', url: 'https://www.w3schools.com/html/mov_bbb.mp4', size: '25 MB' }, { id: 'i1', type: 'image', title: 'Whiteboard Notes', url: 'https://picsum.photos/800/450', size: '2 MB' }] },
            { id: 'md2', date: "Mar 10, 2024", files: [{ id: 'v3', type: 'video', title: 'Sports Day Practice', url: 'https://www.w3schools.com/html/mov_bbb.mp4', size: '40 MB' }] }
        ]
    },
    { id: 'mm2', month: "February 2024", dates: [{ id: 'md3', date: "Feb 20, 2024", files: [{ id: 'i2', type: 'image', title: 'Student Projects', url: 'https://picsum.photos/800/451', size: '3 MB' }] }] }
];


const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="animate-fade-in pb-10 relative">
            <button
                onClick={() => navigate("/admin/employees")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Roster
            </button>

            {/* Header Card */}
            <div className="flex items-center gap-4 mb-8 bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-md shrink-0">
                    {employeeData.name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <h1 className="text-base sm:text-2xl font-bold text-foreground truncate">{employeeData.name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground flex-wrap">
                        <span className="hidden sm:inline font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">{employeeData.role}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="flex items-center gap-1 text-sm"><MapPin className="w-3.5 h-3.5" /> {employeeData.zone}</span>
                    </div>
                </div>
                <span className="hidden sm:inline-block ml-auto px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {employeeData.status.toUpperCase()}
                </span>
            </div>

            {/* Main Tabs Navigation */}
            <Tabs defaultValue="schools" className="space-y-6">
                <TabsList className="bg-card w-full flex justify-between sm:justify-center border border-border p-1 h-auto rounded-xl flex-wrap">
                    <TabsTrigger value="schools" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm">
                        <School className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Assignments</span>
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm">
                        <ClipboardList className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Tasks</span>
                    </TabsTrigger>
                    <TabsTrigger value="media" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm">
                        <Film className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Media</span>
                    </TabsTrigger>
                    <TabsTrigger value="warnings" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Warnings</span>
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex-1 sm:flex-initial justify-center gap-2 py-2.5 px-2 sm:px-4 rounded-lg data-[state=active]:shadow-sm">
                        <CalendarDays className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Attendance</span>
                    </TabsTrigger>
                </TabsList>

                {/* Render Separated Tab Components */}
                <TabsContent value="schools" className="animate-in fade-in-50">
                    <AssignmentsTab schools={assignedSchools} />
                </TabsContent>

                <TabsContent value="tasks" className="animate-in fade-in-50">
                    <TasksTab tasks={optionalTasks} />
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
        </div>
    );
};

export default EmployeeProfile;