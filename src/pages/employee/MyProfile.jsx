import { useState } from "react";
import { useSelector } from "react-redux";
import { Mail, Phone, ShieldCheck, MapPin, School, Edit2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import api from "../../api/axios";
import ChangePasswordModal from "../../modals/employee/ChangePasswordModal";

const MyProfile = () => {
    const { user } = useSelector((state) => state.auth);

    // Modal & Action States
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!user) return null;

    // Dynamic data fallback
    const allottedLocation = user.zone || "Unassigned Zone";

    // Extract school names safely from assignments array
    const assignedSchools = user.assignments?.length > 0
        ? [...new Set(user.assignments.map(a => a.school?.schoolName || "Unknown School"))]
        : ["No assigned schools"];

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

    return (
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20 p-4 sm:p-0">

            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    My Profile
                </h1>
                <p className="text-muted-foreground mt-1">Manage your personal information and security.</p>
            </div>

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
                                {user.designation || 'Employee'}
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
                                <p className="text-sm font-bold text-foreground truncate">{user.mobile || "Not Provided"}</p>
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
                                    {assignedSchools.map((schoolName, index) => (
                                        <span key={index} className="text-xs font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-md border border-border">
                                            {schoolName}
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