import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    MapPin, Clock, Bell, LogOut, CheckCircle, XCircle,
    Upload, FileText, Camera
} from "lucide-react";

const assignments = [
    { id: 1, name: "Lincoln Elementary", address: "123 Oak Street", date: "Mar 16", type: "visit", status: "pending" },
    { id: 2, name: "Washington Middle School", address: "456 Elm Ave", date: "Mar 17", type: "visit", status: "accepted" },
    { id: 3, name: "Jefferson High School", address: "789 Pine Blvd", date: "Mar 18", type: "regular", status: "pending" },
];

const EmployeeDashboard = () => {
    const navigate = useNavigate();
    const [inRadius] = useState(true);
    const [attendanceMarked, setAttendanceMarked] = useState(false);
    const [notifCount] = useState(3);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
                <h1 className="font-display font-bold text-lg">WorkForce Pro</h1>
                <div className="flex items-center gap-3">
                    <button className="relative p-2">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {notifCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                                {notifCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => navigate("/")} className="p-2">
                        <LogOut className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </header>

            <div className="p-4 space-y-5 max-w-lg mx-auto">
                <div className={`rounded-2xl p-5 shadow-elevated ${attendanceMarked ? "bg-card" : "gradient-primary"}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className={`w-5 h-5 ${attendanceMarked ? "text-success" : "text-primary-foreground"} ${!attendanceMarked && inRadius ? "animate-pulse-glow" : ""}`} />
                        <h2 className={`font-display font-bold text-lg ${attendanceMarked ? "text-foreground" : "text-primary-foreground"}`}>
                            Mark Attendance
                        </h2>
                    </div>

                    {attendanceMarked ? (
                        <div className="flex items-center gap-3 py-2">
                            <CheckCircle className="w-8 h-8 text-success" />
                            <div>
                                <p className="font-semibold text-success">Attendance Marked</p>
                                <p className="text-xs text-muted-foreground">Today at 8:02 AM · Zone A</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-2 h-2 rounded-full ${inRadius ? "bg-success" : "bg-destructive"}`} />
                                <p className={`text-sm ${inRadius ? "text-primary-foreground/90" : "text-primary-foreground/60"}`}>
                                    {inRadius ? "Within geo-fence (45m away)" : "Outside 100m radius"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <Clock className="w-4 h-4 text-primary-foreground/70" />
                                <span className="text-sm text-primary-foreground/80 font-mono">Window closes in 00:42:15</span>
                            </div>
                            <Button
                                onClick={() => setAttendanceMarked(true)}
                                disabled={!inRadius}
                                className="w-full h-12 rounded-xl text-base font-semibold bg-card/20 text-primary-foreground border border-primary-foreground/30 hover:bg-card/30 transition-all duration-150 disabled:opacity-40"
                            >
                                {inRadius ? "Mark Attendance Now" : "Move Closer to Mark"}
                            </Button>
                        </>
                    )}
                </div>

                <div>
                    <h2 className="font-display font-semibold text-base mb-3">School Assignments</h2>
                    <div className="space-y-3">
                        {assignments.map((a) => (
                            <div key={a.id} className="bg-card rounded-xl shadow-card p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-semibold text-sm">{a.name}</p>
                                        <p className="text-xs text-muted-foreground">{a.address}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{a.date}</span>
                                </div>
                                {a.type === "visit" && a.status === "pending" ? (
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" variant="success" className="flex-1 rounded-full gap-1.5">
                                            <CheckCircle className="w-3.5 h-3.5" /> Accept
                                        </Button>
                                        <Button size="sm" variant="destructive" className="flex-1 rounded-full gap-1.5">
                                            <XCircle className="w-3.5 h-3.5" /> Reject
                                        </Button>
                                    </div>
                                ) : a.status === "accepted" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success mt-2">
                                        <CheckCircle className="w-3 h-3" /> Accepted
                                    </span>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-primary" />
                        <h2 className="font-display font-semibold text-base">Daily Meeting Report</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Meeting Summary</Label>
                            <textarea
                                placeholder="Describe today's meetings and outcomes..."
                                className="w-full mt-1 min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Follow-up Actions</Label>
                            <Input placeholder="List action items" className="h-9 mt-1" />
                        </div>
                        <Button size="sm" className="w-full">Submit Report</Button>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Camera className="w-5 h-5 text-primary" />
                        <h2 className="font-display font-semibold text-base">Weekly Media Upload</h2>
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
                            Active — Weekend
                        </span>
                    </div>
                    <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-primary/5 hover:bg-primary/10 transition-colors duration-150 cursor-pointer">
                        <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium text-primary">Drop files or tap to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">Images, videos up to 50MB</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
