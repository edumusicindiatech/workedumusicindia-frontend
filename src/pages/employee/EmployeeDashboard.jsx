import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    MapPin, Bell, LogOut, CheckCircle,
    Upload, FileText, Camera, Moon, Sun
} from "lucide-react";

// Import your new component
import AssignmentsManager from "../../components/employee/AssignmentsManager";

const EmployeeDashboard = () => {
    const navigate = useNavigate();

    // Global Day Attendance State
    const [inRadius] = useState(true);
    const [dayStarted, setDayStarted] = useState(false);
    const [notifCount] = useState(3);

    // Dark mode state
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                        <span className="text-primary-foreground font-bold text-sm">W</span>
                    </div>
                    <h1 className="font-display font-bold text-lg hidden sm:block">WorkForce Pro</h1>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>

                    <button className="relative p-2.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Bell className="w-5 h-5" />
                        {notifCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
                                {notifCount}
                            </span>
                        )}
                    </button>

                    <div className="w-px h-6 bg-border mx-1"></div>

                    <button
                        onClick={() => navigate("/")}
                        className="p-2.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

                    {/* LEFT COLUMN: Attendance & Assignments */}
                    <div className="lg:col-span-7 space-y-6 md:space-y-8">

                        {/* Global Day Attendance Card */}
                        <div className={`rounded-2xl p-6 md:p-8 shadow-elevated transition-all duration-500 ${dayStarted ? "bg-card border border-border" : "gradient-primary border-none text-primary-foreground"}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${dayStarted ? "bg-success/10" : "bg-white/20 backdrop-blur-sm"}`}>
                                        <MapPin className={`w-6 h-6 ${dayStarted ? "text-success" : "text-white"} ${!dayStarted && inRadius ? "animate-pulse-glow" : ""}`} />
                                    </div>
                                    <h2 className={`font-display font-bold text-xl md:text-2xl ${dayStarted ? "text-foreground" : "text-white"}`}>
                                        Start Your Day
                                    </h2>
                                </div>
                            </div>

                            {dayStarted ? (
                                <div className="flex items-center gap-4 py-4 px-5 rounded-xl bg-success/5 border border-success/20">
                                    <CheckCircle className="w-10 h-10 text-success flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-success text-lg">Day Started Successfully</p>
                                        <p className="text-sm text-success/80 mt-0.5">Logged in at 8:02 AM · Zone A Territory</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-black/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-3 h-3 rounded-full shadow-sm ${inRadius ? "bg-green-400" : "bg-red-400"}`} />
                                            <p className="text-sm font-medium text-white/90">
                                                {inRadius ? "Location verified (Within Territory)" : "Outside required radius"}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setDayStarted(true)}
                                        disabled={!inRadius}
                                        className="w-full h-14 rounded-xl text-lg font-bold bg-white text-primary hover:bg-white/90 transition-all duration-200 shadow-lg"
                                    >
                                        Log In For The Day
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Assignments Component Integration */}
                        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
                            <AssignmentsManager />
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Reports & Uploads */}
                    <div className="lg:col-span-5 space-y-6 md:space-y-8">

                        {/* Daily Report Form */}
                        <div className="bg-card rounded-2xl shadow-card border border-border p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="font-display font-semibold text-lg">Meeting Report</h2>
                                    <p className="text-xs text-muted-foreground">Submit your end-of-day summary</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground">Summary</Label>
                                    <textarea
                                        placeholder="Describe today's meetings, challenges, and outcomes..."
                                        className="w-full min-h-[120px] rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground">Action Items</Label>
                                    <Input placeholder="List follow-ups (e.g. Email John Doe)" className="h-11 rounded-xl bg-background border-input" />
                                </div>
                                <Button className="w-full h-11 rounded-xl font-semibold shadow-sm mt-2">
                                    Submit Report
                                </Button>
                            </div>
                        </div>

                        {/* Media Upload */}
                        <div className="bg-card rounded-2xl shadow-card border border-border p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <Camera className="w-6 h-6" />
                                    </div>
                                    <h2 className="font-display font-semibold text-lg">Site Media</h2>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/20 uppercase tracking-wider">
                                    Required
                                </span>
                            </div>

                            <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center bg-muted/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer group relative z-10">
                                <div className="w-14 h-14 bg-background rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                                    <Upload className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-base font-semibold text-foreground mb-1">Click to upload media</p>
                                <p className="text-sm text-muted-foreground">or drag and drop files here</p>
                                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground/80 font-medium">
                                    <span>JPEG, PNG, MP4</span>
                                    <span>•</span>
                                    <span>Max 50MB</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default EmployeeDashboard;