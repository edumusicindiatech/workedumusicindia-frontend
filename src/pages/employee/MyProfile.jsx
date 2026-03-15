import { useState } from "react";
import {
    User, Mail, Phone, MapPin,
    CheckCircle, Clock, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MyProfile = () => {
    // Global Day Attendance State
    const [inRadius] = useState(true);
    const [dayStarted, setDayStarted] = useState(false);

    // Mock Employee Data
    const employeeData = {
        name: "Ankit Pandey",
        role: "Field Representative",
        empId: "EMP-2026",
        email: "ankit@workforce.com",
        phone: "+91 98765 43210",
        territory: "Zone A - Central District",
        joinDate: "March 2026"
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">

            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    Welcome back, {employeeData.name.split(' ')[0]} 👋
                </h1>
                <p className="text-muted-foreground mt-1">Here is your daily overview and profile information.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

                {/* LEFT COLUMN: Global Attendance Action */}
                <div className="lg:col-span-7 space-y-6 md:space-y-8">
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
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 px-5 rounded-xl bg-success/5 border border-success/20">
                                <CheckCircle className="w-10 h-10 text-success flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-success text-lg">Day Started Successfully</p>
                                    <p className="text-sm text-success/80 mt-0.5 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Logged in at 8:02 AM
                                    </p>
                                    <p className="text-sm text-success/80 flex items-center gap-1.5 mt-0.5">
                                        <MapPin className="w-3.5 h-3.5" /> {employeeData.territory}
                                    </p>
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
                </div>

                {/* RIGHT COLUMN: Profile Information Card */}
                <div className="lg:col-span-5">
                    <div className="bg-card rounded-2xl shadow-card border border-border p-6 md:p-8 relative overflow-hidden h-full">
                        {/* Decorative Background Element */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>

                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-md">
                                {employeeData.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="font-display font-bold text-xl text-foreground">{employeeData.name}</h2>
                                <p className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-md w-fit mt-1">
                                    {employeeData.role}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Employee ID</p>
                                    <p className="text-sm font-semibold text-foreground">{employeeData.empId}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                                <Mail className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                                    <p className="text-sm font-semibold text-foreground">{employeeData.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                                <Phone className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Phone Number</p>
                                    <p className="text-sm font-semibold text-foreground">{employeeData.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                                <MapPin className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Assigned Territory</p>
                                    <p className="text-sm font-semibold text-foreground">{employeeData.territory}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MyProfile;