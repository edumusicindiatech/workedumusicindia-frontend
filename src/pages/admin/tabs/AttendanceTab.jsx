import { useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import AdminAttendanceDetailsModal from "../../../modals/admin/AdminAttendanceDetailsModal";

// --- DEEP MOCK DATA ---
const mockDeepAttendanceData = [
    {
        id: "m1", month: "March 2024",
        schools: [
            {
                id: "s1", name: "Lincoln High School",
                categories: [
                    {
                        id: "c1", name: "Junior Band", recordCount: 20,
                        metrics: { present: 12, late: 2, absent: 1, events: 3, holidays: 2, media: 15 },
                        records: [
                            { id: "r1", date: "Mar 15, 2024 (Fri)", time: "08:00 AM", status: "PRESENT", checkIn: "08:00 AM", checkOut: "04:00 PM", hasReport: true, note: null },
                            { id: "r2", date: "Mar 12, 2024 (Tue)", time: "08:45 AM", status: "LATE", checkIn: "08:45 AM", checkOut: "03:15 PM", hasReport: true, note: '"Heavy traffic on Main St."' },
                            { id: "r3", date: "Mar 10, 2024 (Sun)", time: "-", status: "HOLIDAY", checkIn: "-", checkOut: "-", hasReport: false, note: '"School Closed - Public Holiday"' },
                            { id: "r4", date: "Mar 08, 2024 (Fri)", time: "07:30 AM", status: "EVENT", checkIn: "07:30 AM", checkOut: "05:00 PM", hasReport: true, note: '"Annual Sports Day Preparation"' },
                            { id: "r5", date: "Mar 05, 2024 (Tue)", time: "-", status: "ABSENT", checkIn: "-", checkOut: "-", hasReport: false, note: '"Called in sick."' },
                        ]
                    },
                    { id: "c2", name: "Senior Band", recordCount: 0, metrics: { present: 0, late: 0, absent: 0, events: 0, holidays: 0, media: 0 }, records: [] }
                ]
            },
            { id: "s2", name: "Washington Elementary", categories: [] }
        ]
    },
    { id: "m2", month: "February 2024", schools: [] }
];

const AttendanceTab = ({ employeeName = "Employee" }) => {
    const [selectedMonthData, setSelectedMonthData] = useState(null);

    return (
        <div className="bg-card rounded-xl shadow-card border border-border p-6 min-h-100">

            <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">
                    {employeeName}'s Monthly Reports
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Select a month to view visited schools.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockDeepAttendanceData.map((data) => (
                    <div
                        key={data.id}
                        onClick={() => setSelectedMonthData(data)}
                        className="flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer group shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-base text-foreground">{data.month}</span>
                                <span className="text-xs font-medium text-muted-foreground mt-0.5">Tap to view schools</span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    </div>
                ))}
            </div>

            <AdminAttendanceDetailsModal
                isOpen={!!selectedMonthData}
                monthData={selectedMonthData}
                employeeName={employeeName}
                onClose={() => setSelectedMonthData(null)}
            />
        </div>
    );
};

export default AttendanceTab;