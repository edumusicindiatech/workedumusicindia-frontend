import { useState } from "react";
import { useSelector } from "react-redux";
import { Mail, Phone, ShieldCheck, MapPin, School, Edit2, CheckCircle } from "lucide-react";
import ChangePasswordModal from "../../modals/ChangePasswordModal";

const MyProfile = () => {
    const { user } = useSelector((state) => state.auth);

    // Modal & Action States
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    if (!user) return null;

    // --- MOCK DATA FOR DEMO (Fallback if not in Redux) ---
    // In a real scenario, this comes from the backend via the `user` object
    const allottedLocation = user.location || "Sultanpur, Uttar Pradesh";
    const assignedSchools = user.assignedSchools || [
        "Lincoln High School",
        "Washington Middle School",
        "Roosevelt Elementary"
    ];

    const handlePasswordChange = (currentPassword, newPassword) => {
        setIsSubmitting(true);

        // Mock API Call
        console.log("Updating password...", { currentPassword, newPassword });

        setTimeout(() => {
            setIsSubmitting(false);
            setIsPasswordModalOpen(false);
            setSuccessMsg("Password updated successfully!");
            setTimeout(() => setSuccessMsg(""), 4000);
        }, 1500);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20">

            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    My Profile
                </h1>
                <p className="text-muted-foreground mt-1">Manage your personal information and security.</p>
            </div>

            {/* Success Toast */}
            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold text-sm">{successMsg}</p>
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-8 relative overflow-hidden h-full">

                {/* Decorative background blur */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* Avatar & Edit Button */}
                <div className="flex items-start justify-between mb-8 relative z-10 border-b border-border/50 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-md">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="font-display font-bold text-2xl text-foreground">{user.name}</h2>
                            <p className="text-sm font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-0.5 rounded-full w-fit mt-1.5 uppercase tracking-wide">
                                {user.role || 'Employee'}
                            </p>
                        </div>
                    </div>

                    {/* The Edit Password Button */}
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-primary/10 text-foreground hover:text-primary border border-border hover:border-primary/30 rounded-xl transition-all font-semibold text-sm shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Edit Password</span>
                    </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">

                    {/* Basic Contact Details */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Contact Info</h3>

                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                            <div className="p-2 bg-muted rounded-lg shrink-0">
                                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Employee ID</p>
                                <p className="text-sm font-bold text-foreground truncate">{user.employeeId}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                            <div className="p-2 bg-muted rounded-lg shrink-0">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Email Address</p>
                                <p className="text-sm font-bold text-foreground truncate">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                            <div className="p-2 bg-muted rounded-lg shrink-0">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Phone Number</p>
                                <p className="text-sm font-bold text-foreground truncate">{user.mobile || "+91 9876543210"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Assignment Details */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Assignment Details</h3>

                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                <MapPin className="w-4 h-4 text-primary" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Allotted Location</p>
                                <p className="text-sm font-bold text-foreground truncate">{allottedLocation}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors h-full">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-1">
                                <School className="w-4 h-4 text-primary" />
                            </div>
                            <div className="w-full">
                                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Allotted Schools</p>
                                <div className="flex flex-wrap gap-2">
                                    {assignedSchools.map((school, index) => (
                                        <span key={index} className="text-xs font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-md border border-border">
                                            {school}
                                        </span>
                                    ))}
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