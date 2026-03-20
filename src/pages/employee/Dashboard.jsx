import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../../store/slices/authSlice";
import { updateLocation } from "../../store/slices/locationSlice";
import api from "../../api/axios";

import { MapPin, CheckCircle, Clock, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
    const dispatch = useDispatch();
    const { user, token } = useSelector((state) => state.auth);

    const [isLoading, setIsLoading] = useState(!user);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [shiftData, setShiftData] = useState(null);
    const [inRadius, setInRadius] = useState(true);
    const [dayStarted, setDayStarted] = useState(false);
    const [dayEnded, setDayEnded] = useState(false);

    // Background Sync
    useEffect(() => {
        const fetchLatestProfile = async () => {
            try {
                const response = await api.get('/employee/me/profile');
                if (response.data.success) {
                    dispatch(setCredentials({
                        user: response.data.user,
                        access_token: token
                    }));
                }
            } catch (error) {
                console.error("Background sync failed:", error);
                if (!user) setErrorMsg("Failed to load dashboard data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLatestProfile();
    }, [dispatch, token, user]);

    // 5-Second Reset Timer
    useEffect(() => {
        let timer;
        if (dayEnded) {
            timer = setTimeout(() => {
                setDayEnded(false);
                setShiftData(null);
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dayEnded]);

    const getUserLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser"));
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };
                        dispatch(updateLocation(coords));
                        resolve(coords);
                    },
                    (error) => {
                        reject(new Error("Please enable location services to check in."));
                    }
                );
            }
        });
    };

    const handleStartDay = async () => {
        setActionLoading(true);
        setErrorMsg("");
        try {
            const coords = await getUserLocation();
            const response = await api.post('/employee/shift/start', {
                latitude: coords.latitude,
                longitude: coords.longitude,
                territory: user?.territory || "Assigned Zone"
            });
            if (response.data.success) {
                setShiftData(response.data.shift);
                setDayEnded(false);
                setDayStarted(true);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || error.message || "Network error.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEndDay = async () => {
        setActionLoading(true);
        setErrorMsg("");
        try {
            const coords = await getUserLocation();
            const response = await api.post('/employee/shift/end', {
                latitude: coords.latitude,
                longitude: coords.longitude
            });
            if (response.data.success) {
                setShiftData(response.data.shift);
                setDayStarted(false);
                setDayEnded(true);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || error.message || "Network error.");
        } finally {
            setActionLoading(false);
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading && !user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return <div className="p-8 text-center text-destructive">Failed to load dashboard.</div>;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in max-w-3xl mx-auto">
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    Welcome back, {user.name?.split(' ')[0]} 👋
                </h1>
                <p className="text-muted-foreground mt-1">Here is your daily overview and shift status.</p>
            </div>

            {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-semibold animate-in fade-in">
                    {errorMsg}
                </div>
            )}

            <div className={`rounded-2xl p-6 md:p-8 shadow-elevated transition-all duration-500 ${dayStarted || dayEnded ? "bg-card border border-border" : "gradient-primary border-none text-primary-foreground"}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${dayStarted ? "bg-emerald-500/10" : dayEnded ? "bg-muted" : "bg-white/20 backdrop-blur-sm"}`}>
                            <MapPin className={`w-6 h-6 ${dayStarted ? "text-emerald-500" : dayEnded ? "text-foreground" : "text-white"} ${!dayStarted && !dayEnded && inRadius ? "animate-pulse-glow" : ""}`} />
                        </div>
                        <h2 className={`font-display font-bold text-xl md:text-2xl ${dayStarted || dayEnded ? "text-foreground" : "text-white"}`}>
                            {dayStarted ? "Active Shift" : "Start Your Day"}
                        </h2>
                    </div>
                </div>

                {dayStarted ? (
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
    );
};

export default Dashboard;