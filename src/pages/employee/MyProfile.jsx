import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Mail, Phone, ShieldCheck, MapPin, School, Edit2, User } from "lucide-react";
import toast, { Toaster } from "react-hot-toast"; // <-- Swapped to react-hot-toast
import api from "../../api/axios";
import ChangePasswordModal from "../../modals/employee/ChangePasswordModal";

// --- 1. SOCKET SETUP OUTSIDE COMPONENT ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const MyProfile = () => {
    const { user } = useSelector((state) => state.auth);

    // Modal & Action States
    const [loading, setLoading] = useState(true); // <-- Added for Shimmer State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- 2. LOCAL DATA STATES ---
    const [localUser, setLocalUser] = useState(user || {});
    const [allottedLocation, setAllottedLocation] = useState(user?.zone || "Unassigned Zone");
    const [assignedSchools, setAssignedSchools] = useState(
        user?.assignments?.length > 0
            ? [...new Set(user.assignments.map(a => a.school?.schoolName || "Unknown School"))]
            : ["No assigned schools"]
    );

    // --- 3. FETCH FRESH DATA (Profile + Assignments) ---
    const fetchFreshData = useCallback(async () => {
        try {
            // A. Fetch fresh profile data
            const profileRes = await api.get('/employee/me/profile').catch(() => null);

            if (profileRes && profileRes.data.success) {
                const freshUser = profileRes.data.user;
                setLocalUser(freshUser);
                setAllottedLocation(freshUser.zone || "Unassigned Zone");
            }

            // B. Fetch fresh school assignments
            const schoolsRes = await api.get('/employee/assigned-schools');
            if (schoolsRes.data.success) {
                const schoolNames = [...new Set(schoolsRes.data.data.map(s => s.name))];
                setAssignedSchools(schoolNames.length > 0 ? schoolNames : ["No assigned schools"]);
            }
        } catch (error) {
            console.error("Failed to silently fetch updated profile:", error);
        } finally {
            setLoading(false); // <-- Stop loading once data is fetched
        }
    }, []);

    // 👉 ALWAYS FETCH FRESH DATA ON PAGE LOAD 
    useEffect(() => {
        fetchFreshData();
    }, [fetchFreshData]);

    // --- 4. REAL-TIME SOCKET CONNECTION ---
    useEffect(() => {
        if (!user) return;

        const currentUserId = user.id || user._id;
        socket.emit("join_room", currentUserId);

        const handleRealTimeUpdate = (data) => {
            console.log("Profile update received via socket!", data);
            fetchFreshData(); // Silently update EVERYTHING on the page
        };

        socket.on("new_notification", handleRealTimeUpdate);

        return () => {
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [user, fetchFreshData]);


    if (!user) return null;

    const handlePasswordChange = async (newPassword) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Updating password...");

        try {
            await api.put('/employee/profile/password', { newPassword });
            setIsPasswordModalOpen(false);
            toast.success("Password updated successfully!", { id: toastId });
        } catch (error) {
            console.error("Password change error:", error);
            toast.error(error.response?.data?.message || "Failed to update password.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // RENDER: LOADING STATE (SHIMMER)
    // ==========================================
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 p-4 sm:p-6 lg:p-8">
                {/* Header Shimmer */}
                <div className="space-y-2.5">
                    <div className="h-9 w-48 bg-muted rounded-lg animate-pulse" />
                    <div className="h-5 w-64 max-w-full bg-muted/60 rounded-md animate-pulse" />
                </div>

                {/* Card Shimmer */}
                <div className="bg-card rounded-[1.5rem] shadow-sm border border-border/60 p-6 md:p-8 relative overflow-hidden">
                    {/* Top Section Shimmer */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8 pb-8 border-b border-border/50">
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted animate-pulse shrink-0" />
                            <div className="space-y-3 flex-1">
                                <div className="h-7 w-40 sm:w-56 bg-muted rounded-md animate-pulse" />
                                <div className="h-6 w-24 bg-muted/60 rounded-full animate-pulse" />
                            </div>
                        </div>
                        <div className="h-11 w-full sm:w-40 bg-muted rounded-xl animate-pulse shrink-0" />
                    </div>

                    {/* Details Grid Shimmer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        {/* Col 1 */}
                        <div className="space-y-5">
                            <div className="h-4 w-28 bg-muted/80 rounded animate-pulse mb-2" />
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-xl bg-muted animate-pulse shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
                                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Col 2 */}
                        <div className="space-y-5">
                            <div className="h-4 w-36 bg-muted/80 rounded animate-pulse mb-2" />
                            {[1, 2].map(i => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-xl bg-muted animate-pulse shrink-0" />
                                    <div className="space-y-2 flex-1 mt-1">
                                        <div className="h-3 w-28 bg-muted/60 rounded animate-pulse" />
                                        <div className="h-4 w-full bg-muted rounded animate-pulse" />
                                        {i === 2 && <div className="h-4 w-2/3 bg-muted rounded animate-pulse mt-1" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 p-4 sm:p-6 lg:p-8">
            <Toaster position="top-right" />

            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                    <User className="w-7 h-7 text-primary hidden sm:block" />
                    My Profile
                </h1>
                <p className="text-muted-foreground mt-1.5 sm:ml-10 text-sm sm:text-base">
                    Manage your personal information and account security.
                </p>
            </div>

            {/* Profile Card */}
            <div className="bg-card rounded-[1.5rem] shadow-sm border border-border/60 p-6 md:p-8 relative overflow-hidden h-full group">

                {/* Decorative background blur */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>

                {/* Avatar & Edit Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8 pb-8 relative z-10 border-b border-border/60">
                    <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-2xl sm:text-3xl font-extrabold shadow-lg shadow-primary/20 shrink-0 border-4 border-background">
                            {localUser.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground truncate leading-tight">
                                {localUser.name}
                            </h2>
                            <p className="text-xs sm:text-sm font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full w-fit mt-2 uppercase tracking-wide">
                                {localUser.designation || 'Employee'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-background hover:bg-primary/5 text-foreground hover:text-primary border border-border hover:border-primary/30 rounded-xl transition-all font-bold text-sm shadow-sm active:scale-95 shrink-0"
                    >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit Password</span>
                    </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">

                    {/* Column 1: Contact Info */}
                    <div className="space-y-5">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary/70" /> Contact Information
                        </h3>

                        <div className="space-y-3">
                            {/* Employee ID */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                <div className="p-2.5 bg-background rounded-xl shrink-0 shadow-sm border border-border/50">
                                    <ShieldCheck className="w-5 h-5 text-primary/80" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Employee ID</p>
                                    <p className="text-sm sm:text-base font-bold text-foreground truncate">{localUser.employeeId}</p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                <div className="p-2.5 bg-background rounded-xl shrink-0 shadow-sm border border-border/50">
                                    <Mail className="w-5 h-5 text-blue-500/80" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Email Address</p>
                                    <p className="text-sm sm:text-base font-bold text-foreground truncate">{localUser.email}</p>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                <div className="p-2.5 bg-background rounded-xl shrink-0 shadow-sm border border-border/50">
                                    <Phone className="w-5 h-5 text-emerald-500/80" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Phone Number</p>
                                    <p className="text-sm sm:text-base font-bold text-foreground truncate">{localUser.mobile || "Not Provided"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Assignment Details */}
                    <div className="space-y-5">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary/70" /> Assignment Details
                        </h3>

                        <div className="space-y-3 h-full flex flex-col">
                            {/* Allotted Zone */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                <div className="p-2.5 bg-background rounded-xl shrink-0 shadow-sm border border-border/50">
                                    <MapPin className="w-5 h-5 text-amber-500/80" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Allotted Zone</p>
                                    <p className="text-sm sm:text-base font-bold text-foreground truncate">{allottedLocation}</p>
                                </div>
                            </div>

                            {/* Allotted Schools */}
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors flex-1">
                                <div className="p-2.5 bg-background rounded-xl shrink-0 shadow-sm border border-border/50 mt-1">
                                    <School className="w-5 h-5 text-indigo-500/80" />
                                </div>
                                <div className="min-w-0 flex-1 w-full">
                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-2.5">Allotted Locations</p>
                                    <div className="flex flex-wrap gap-2">
                                        {assignedSchools.map((schoolName, index) => (
                                            <span
                                                key={index}
                                                className="text-xs font-bold bg-background text-foreground px-3 py-1.5 rounded-lg border border-border/60 shadow-sm hover:border-primary/30 transition-colors"
                                            >
                                                {schoolName}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSubmit={handlePasswordChange}
                actionLoading={isSubmitting}
            />
        </div>
    );
};

export default MyProfile;