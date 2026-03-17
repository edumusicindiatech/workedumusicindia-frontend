import { useState, useEffect } from "react";
import {
    User, Mail, Phone, MapPin,
    CheckCircle, Clock, ShieldCheck, LogOut, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "../../api/axios";

// Handle Environment Variables securely
const BASE_URL = import.meta.env?.VITE_BASE_URL || 'http://localhost:5000';

const MyProfile = () => {
    // --- UI States ---
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // --- Data States ---
    const [employeeData, setEmployeeData] = useState(null);
    const [shiftData, setShiftData] = useState(null);

    // --- Flow States ---
    const [inRadius, setInRadius] = useState(true);
    const [dayStarted, setDayStarted] = useState(false);
    const [dayEnded, setDayEnded] = useState(false);

    // --- 1. FETCH PROFILE ON MOUNT ---
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Cleaned up fetch -> api.get
                const response = await api.get('/employee/me/profile');
                const data = response.data;

                if (data.success) {
                    setEmployeeData(data.user);
                } else {
                    setErrorMsg("Failed to load profile data.");
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
                setErrorMsg("Server error while loading profile.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // --- 2. 5-SECOND RESET TIMER ---
    useEffect(() => {
        let timer;
        if (dayEnded) {
            timer = setTimeout(() => {
                setDayEnded(false);
                setShiftData(null); // Clear shift data for the reset
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dayEnded]);

    // --- HELPER: GET GPS COORDINATES ---
    const getUserLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser"));
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                    },
                    (error) => {
                        reject(new Error("Please enable location services to check in."));
                    }
                );
            }
        });
    };

    // --- 3. START DAY API CALL ---
    const handleStartDay = async () => {
        setActionLoading(true);
        setErrorMsg("");

        try {
            const coords = await getUserLocation();

            // Cleaned up fetch -> api.post
            const response = await api.post('/employee/shift/start', {
                latitude: coords.latitude,
                longitude: coords.longitude,
                territory: employeeData?.territory || "Assigned Zone"
            });

            const data = response.data;

            if (data.success) {
                setShiftData(data.shift);
                setDayEnded(false);
                setDayStarted(true);
            }
        } catch (error) {
            // Axios backend errors
            setErrorMsg(error.response?.data?.message || error.message || "Network error.");
        } finally {
            setActionLoading(false);
        }
    };

    // --- 4. END DAY API CALL ---
    const handleEndDay = async () => {
        setActionLoading(true);
        setErrorMsg("");

        try {
            const coords = await getUserLocation();

            // Cleaned up fetch -> api.post
            const response = await api.post('/employee/shift/end', {
                latitude: coords.latitude,
                longitude: coords.longitude
            });

            const data = response.data;

            if (data.success) {
                setShiftData(data.shift);
                setDayStarted(false);
                setDayEnded(true);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || error.message || "Network error.");
        } finally {
            setActionLoading(false);
        }
    };

    // Format times for display
    const formatTime = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!employeeData) return <div className="p-8 text-center text-destructive">Failed to load profile.</div>;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    Welcome back, {employeeData.name.split(' ')[0]} 👋
                </h1>
                <p className="text-muted-foreground mt-1">Here is your daily overview and profile information.</p>
            </div>

            {/* Error Message Display */}
            {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-semibold animate-in fade-in">
                    {errorMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* LEFT COLUMN: Global Attendance Action */}
                <div className="lg:col-span-7 space-y-6 md:space-y-8">
                    <div className={`rounded-2xl p-6 md:p-8 shadow-elevated transition-all duration-500 ${dayStarted || dayEnded ? "bg-card border border-border" : "gradient-primary border-none text-primary-foreground"}`}>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${dayStarted ? "bg-emerald-500/10" : dayEnded ? "bg-muted" : "bg-white/20 backdrop-blur-sm"}`}>
                                    <MapPin className={`w-6 h-6 ${dayStarted ? "text-emerald-500" : dayEnded ? "text-foreground" : "text-white"} ${!dayStarted && !dayEnded && inRadius ? "animate-pulse-glow" : ""}`} />
                                </div>
                                <h2 className={`font-display font-bold text-xl md:text-2xl ${dayStarted ? "text-foreground" : dayEnded ? "text-foreground" : "text-white"}`}>
                                    {dayStarted ? "Active Shift" : "Start Your Day"}
                                </h2>
                            </div>
                        </div>

                        {dayStarted ? (
                            // STATE 2: ACTIVE SHIFT
                            <div className="space-y-5 animate-fade-in">
                                <div className="flex items-start gap-3.5 py-4 px-5 rounded-xl bg-[#06281e]/40 border border-emerald-900/50">
                                    <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="flex flex-col">
                                        <p className="font-semibold text-emerald-500 text-base">Day Started Successfully</p>
                                        <div className="text-sm text-emerald-500/80 mt-1.5 flex flex-col gap-1.5">
                                            <span className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" /> Logged in at {formatTime(shiftData?.loginTime)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="destructive"
                                    onClick={handleEndDay}
                                    disabled={actionLoading}
                                    className="w-full h-12 rounded-xl text-base font-bold transition-all duration-200 shadow-sm bg-[#ef4444] hover:bg-[#dc2626] text-white"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5 mr-2" />}
                                    {actionLoading ? "Processing..." : "End Day / Log Out"}
                                </Button>
                            </div>
                        ) : dayEnded ? (
                            // STATE 3: SHIFT ENDED
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-start gap-3.5 py-4 px-5 rounded-xl bg-muted/50 border border-border">
                                    <CheckCircle className="w-6 h-6 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="flex flex-col">
                                        <p className="font-semibold text-foreground text-base">Shift Ended Successfully</p>
                                        <div className="text-sm text-muted-foreground mt-1.5 flex flex-col gap-1.5">
                                            <span className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" /> Logged out at {formatTime(shiftData?.logoutTime)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-center text-muted-foreground animate-pulse">
                                    Resetting dashboard...
                                </p>
                            </div>
                        ) : (
                            // STATE 1: INITIAL READY STATE
                            <div className="bg-black/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 animate-fade-in">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-3 h-3 rounded-full shadow-sm ${inRadius ? "bg-green-400" : "bg-red-400"}`} />
                                        <p className="text-sm font-medium text-white/90">
                                            {inRadius ? "Location System Ready" : "Location required"}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleStartDay}
                                    disabled={!inRadius || actionLoading}
                                    className="w-full h-14 rounded-xl text-lg font-bold bg-white text-primary hover:bg-white/90 transition-all duration-200 shadow-lg"
                                >
                                    {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Log In For The Day"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Profile Information Card */}
                <div className="lg:col-span-5">
                    <div className="bg-card rounded-2xl shadow-card border border-border p-6 md:p-8 relative overflow-hidden h-full">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>

                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-md">
                                {employeeData.name.charAt(0).toUpperCase()}
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
                                    <p className="text-sm font-semibold text-foreground">{employeeData.employeeId}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                                <Mail className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                                    <p className="text-sm font-semibold text-foreground">{employeeData.email}</p>
                                </div>
                            </div>
                            {employeeData.mobile && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                                    <Phone className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Phone Number</p>
                                        <p className="text-sm font-semibold text-foreground">{employeeData.mobile}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;