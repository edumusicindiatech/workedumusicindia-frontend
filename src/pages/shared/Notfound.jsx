import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Ghost } from "lucide-react";

const NotFound = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">

            {/* Background Decorative Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 sm:w-125 sm:h-125 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 right-0 w-50 h-50 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/60 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl shadow-black/5 text-center animate-in fade-in zoom-in-95 duration-700">

                {/* Visual Icon */}
                <div className="mb-8 relative inline-block">
                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner rotate-12 transition-transform hover:rotate-0 duration-500">
                        <Ghost className="w-12 h-12 text-primary" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shadow-lg font-black text-primary text-xs">
                        404
                    </div>
                </div>

                <h1 className="text-5xl sm:text-7xl font-black text-foreground tracking-tighter mb-4 uppercase italic">
                    {t('not_found.lost_title', 'Lost?')}
                </h1>

                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs sm:text-sm mb-10 leading-relaxed">
                    {t('not_found.page_not_found', "The page you're looking for has vanished into thin air.")}
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => navigate("/")}
                        className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider shadow-xl shadow-primary/20 transition-all active:scale-95 gap-2"
                    >
                        <Home className="w-5 h-5" />
                        {t('not_found.return_to_login', 'Back to Home')}
                    </Button>

                    <button
                        onClick={() => navigate(-1)}
                        className="h-12 text-muted-foreground hover:text-foreground font-bold text-sm flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('not_found.go_back', 'Go Back')}
                    </button>
                </div>
            </div>

            {/* Footer Tag */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 pointer-events-none">
                    EduMusic India • System 404
                </p>
            </div>
        </div>
    );
};

export default NotFound;