import { useSelector } from "react-redux";
import { Mail, Phone, ShieldCheck } from "lucide-react";

const MyProfile = () => {
    const { user } = useSelector((state) => state.auth);

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    My Profile
                </h1>
                <p className="text-muted-foreground mt-1">Manage your personal information and details.</p>
            </div>

            <div className="bg-card rounded-2xl shadow-card border border-border p-6 md:p-8 relative overflow-hidden h-full">
                {/* Decorative background blur */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>

                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-md">
                        {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="font-display font-bold text-xl text-foreground">{user.name}</h2>
                        <p className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-md w-fit mt-1">
                            {user.role}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Employee ID</p>
                            <p className="text-sm font-semibold text-foreground">{user.employeeId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                            <p className="text-sm font-semibold text-foreground">{user.email}</p>
                        </div>
                    </div>
                    {user.mobile && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Phone Number</p>
                                <p className="text-sm font-semibold text-foreground">{user.mobile}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyProfile;