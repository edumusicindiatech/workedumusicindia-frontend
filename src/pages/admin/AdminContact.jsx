import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, ShieldAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminContact = () => {
    return (
        <div className="min-h-screen bg-background font-sans flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-100 h-100 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <ShieldAlert className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                        Admin Support
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto font-medium">
                        Having trouble accessing your account? Reach out to the IT & Administration team for assistance.
                    </p>
                </div>

                {/* Contact Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10">
                    {/* Email Card */}
                    <a href="mailto:contact@workedumusicindia.com" className="group bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Mail className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Email Support</h3>
                        <p className="text-foreground font-bold text-lg">contact@workedumusicindia.com</p>
                    </a>

                    {/* Phone Card */}
                    <a href="tel:+917836953282" className="group bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Phone className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">IT Helpdesk</h3>
                        <p className="text-foreground font-bold text-lg">+91 7836953282</p>
                    </a>
                </div>

                {/* Additional Info */}
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    <div className="flex-1 flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-foreground">Corporate Office</h4>
                            <p className="text-sm text-muted-foreground mt-1">Sector 24 Rohini, 142 GF Pocket-19, New Delhi 110085</p>
                        </div>
                    </div>
                    <div className="w-px h-12 bg-border/50 hidden sm:block"></div>
                    <div className="flex-1 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-foreground">Support Hours</h4>
                            <p className="text-sm text-muted-foreground mt-1">Monday - Saturday <br /> 9:00 AM - 6:00 PM</p>
                        </div>
                    </div>
                </div>

                {/* Back to Login Action */}
                <div className="mt-10 flex justify-center">
                    <Button asChild variant="ghost" className="h-12 px-6 rounded-xl font-bold text-muted-foreground hover:text-foreground group">
                        <Link to="/">
                            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Return to Login
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminContact;