import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import {
    CalendarDays, Mail, User, CheckCircle2, XCircle,
    Clock, Loader2, AlertCircle, FileText, Search, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // <-- Added import

// --- SOCKET IMPORT ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const AdminLeaveRequests = () => {
    const { t } = useTranslation(); // <-- Initialize hook
    const { user } = useSelector((state) => state.auth);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");

    const [actionModal, setActionModal] = useState({ isOpen: false, request: null, type: null });
    const [remarks, setRemarks] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await api.get('/admin/leave-requests');
            if (res.data.success) {
                setRequests(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch leave requests", err);
            toast.error(t('admin_leave.error_load'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;
        const joinRoom = () => socket.emit("join_room", currentUserId);

        if (socket.connected) joinRoom();
        socket.on("connect", joinRoom);
        socket.on("new_notification", () => fetchRequests());

        return () => {
            socket.off("connect", joinRoom);
            socket.off("new_notification", () => fetchRequests());
        };
    }, [user, fetchRequests]);

    // Global Overlap Detection
    const uniqueAllRequests = useMemo(() => {
        const allSorted = [...requests].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        const uniqueAll = [];

        allSorted.forEach(current => {
            const hasOverlap = uniqueAll.find(existing => {
                const sameEmployee = existing.employeeEmail === current.employeeEmail;
                if (!sameEmployee) return false;

                const curStart = new Date(current.fromDate);
                const curEnd = new Date(current.toDate);
                const exStart = new Date(existing.fromDate);
                const exEnd = new Date(existing.toDate);

                return (curStart <= exEnd && curEnd >= exStart);
            });

            if (!hasOverlap) uniqueAll.push(current);
        });

        return uniqueAll;
    }, [requests]);

    const uniqueFilteredRequests = uniqueAllRequests.filter(req => req.status === activeTab);
    const pendingCount = uniqueAllRequests.filter(req => req.status === 'pending').length;

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const { request, type } = actionModal;

        const toastMsg = type === 'pending'
            ? t('admin_leave.toasts.revoking')
            : t('admin_leave.toasts.updating', { type: t(`admin_leave.status.${type}`) });

        const toastId = toast.loading(toastMsg);

        // Optimistic Update
        setRequests(prev => prev.map(r =>
            r.id === request.id ? { ...r, status: type, updatedAt: new Date().toISOString() } : r
        ));

        setActionModal({ isOpen: false, request: null, type: null });
        setRemarks("");

        try {
            await api.put(`/admin/leave-requests/${request.id}/status`, {
                status: type,
                adminRemarks: remarks
            });

            const successMsg = type === 'pending'
                ? t('admin_leave.toasts.revoke_success')
                : t('admin_leave.toasts.action_success', { type: t(`admin_leave.status.${type}`) });

            toast.success(successMsg, { id: toastId });
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || t('admin_leave.toasts.update_error'), { id: toastId });
            fetchRequests();
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 border-b border-border/50 pb-6">
                    <div className="space-y-3">
                        <div className="h-7 sm:h-8 w-48 sm:w-72 bg-muted rounded-lg animate-pulse" />
                        <div className="h-3 sm:h-4 w-36 sm:w-56 bg-muted rounded-lg animate-pulse" />
                    </div>
                    <div className="flex gap-2 p-1.5 bg-muted/30 rounded-xl w-full lg:w-auto h-11 sm:h-13 animate-pulse">
                        <div className="flex-1 lg:w-28 bg-muted rounded-lg" />
                        <div className="flex-1 lg:w-28 bg-muted rounded-lg" />
                        <div className="flex-1 lg:w-28 bg-muted rounded-lg" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm flex flex-col h-64 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 p-3 sm:p-6 lg:p-8 mb-20 md:mb-0">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 border-b border-border/50 pb-4 sm:pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2 sm:gap-3">
                        <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                        {t('admin_leave.title')}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">
                        {activeTab === 'pending' ? t('admin_leave.subtitle_pending') : t('admin_leave.subtitle_archived')}
                    </p>
                </div>

                <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50 w-full lg:w-auto overflow-x-auto hide-scrollbar">
                    {['pending', 'approved', 'rejected'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 lg:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold capitalize transition-all duration-200 whitespace-nowrap ${activeTab === tab
                                ? 'bg-background shadow-sm text-foreground border border-border/50'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                        >
                            {t(`admin_leave.tabs.${tab}`)}
                            {tab === 'pending' && pendingCount > 0 && (
                                <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] sm:text-xs">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {uniqueFilteredRequests.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center shadow-sm">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-3 sm:mb-4">
                        <Search className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">
                        {t('admin_leave.no_requests_title', { status: t(`admin_leave.tabs.${activeTab}`).toLowerCase() })}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('admin_leave.no_requests_desc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {uniqueFilteredRequests.map((req) => (
                        <div key={req.id} className="group bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">

                            <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/20 flex justify-between items-start gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 truncate">
                                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">{req.employeeName}</span>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 truncate">
                                        <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                        <span className="truncate">{req.employeeEmail}</span>
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 border ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                            req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                'bg-destructive/10 text-destructive border-destructive/20'
                                        }`}>
                                        {req.status === 'pending' && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                        {req.status === 'approved' && <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                        {req.status === 'rejected' && <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                        {t(`admin_leave.status.${req.status}`)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 sm:p-5 space-y-4 flex-1">
                                <div className="bg-primary/5 border border-primary/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('admin_leave.card.time_period')}</p>
                                        <p className="font-bold text-foreground text-xs sm:text-sm flex flex-wrap items-center gap-x-1">
                                            <span>{new Date(req.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                            <span className="text-muted-foreground font-normal text-[10px] sm:text-xs">{t('admin_leave.card.to')}</span>
                                            <span>{new Date(req.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </p>
                                    </div>
                                    <div className="p-1.5 sm:p-2 bg-background rounded-lg border border-border/50 shrink-0">
                                        <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:space-y-2">
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t('admin_leave.card.reason')}
                                    </p>
                                    <p className="text-xs sm:text-sm text-foreground bg-muted/40 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-border/50 leading-relaxed italic line-clamp-3">
                                        "{req.reason}"
                                    </p>
                                </div>

                                {req.adminRemarks && (
                                    <div className="space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-dashed border-border">
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{t('admin_leave.card.admin_note')}</p>
                                        <p className="text-[11px] sm:text-xs font-medium text-muted-foreground bg-amber-500/5 p-2 rounded-md sm:rounded-lg border border-amber-500/10 line-clamp-2">
                                            {req.adminRemarks}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 sm:p-5 border-t border-border bg-muted/10 flex gap-2 sm:gap-3">
                                {req.status === 'pending' ? (
                                    <>
                                        <Button variant="outline" className="flex-1 h-10 sm:h-11 px-2 text-destructive hover:bg-destructive hover:text-white border-destructive/20 rounded-lg sm:rounded-xl text-xs sm:text-sm" onClick={() => setActionModal({ isOpen: true, request: req, type: 'rejected' })}>
                                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t('admin_leave.card.btn_reject')}</span>
                                        </Button>
                                        <Button className="flex-1 h-10 sm:h-11 px-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-lg sm:rounded-xl text-xs sm:text-sm" onClick={() => setActionModal({ isOpen: true, request: req, type: 'approved' })}>
                                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t('admin_leave.card.btn_approve')}</span>
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" className="w-full h-10 sm:h-11 border-primary/20 text-primary hover:bg-primary/5 rounded-lg sm:rounded-xl text-xs sm:text-sm" onClick={() => setActionModal({ isOpen: true, request: req, type: 'pending' })}>
                                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> {t('admin_leave.card.btn_revoke')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {actionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-2xl sm:rounded-3xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`px-5 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center gap-2 sm:gap-3 ${actionModal.type === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : actionModal.type === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {actionModal.type === 'pending' ? <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /> : actionModal.type === 'approved' ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                            <h3 className="text-base sm:text-lg font-bold">
                                {actionModal.type === 'pending' ? t('admin_leave.modal.title_revoke') : t('admin_leave.modal.title_action', { type: t(`admin_leave.status.${actionModal.type}`) })}
                            </h3>
                        </div>

                        <form onSubmit={handleStatusUpdate} className="p-5 sm:p-6 space-y-4">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                {actionModal.type === 'pending'
                                    ? t('admin_leave.modal.desc_revoke', { name: actionModal.request?.employeeName })
                                    : t('admin_leave.modal.desc_action', { type: t(`admin_leave.status.${actionModal.type}`).toLowerCase(), name: actionModal.request?.employeeName })}
                            </p>

                            {actionModal.type !== 'pending' && (
                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('admin_leave.modal.remarks_label')}</label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder={t('admin_leave.modal.remarks_placeholder', { type: t(`admin_leave.status.${actionModal.type}`).toLowerCase() })}
                                        className="flex min-h-20 sm:min-h-24 w-full rounded-lg sm:rounded-xl border border-input bg-background px-3 py-2 text-xs sm:text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
                                <Button type="button" variant="ghost" className="w-full sm:w-auto h-10 sm:h-11 text-xs sm:text-sm" onClick={() => { setActionModal({ isOpen: false, request: null, type: null }); setRemarks(""); }} disabled={actionLoading}>{t('admin_leave.modal.btn_cancel')}</Button>
                                <Button type="submit" disabled={actionLoading} className={`w-full sm:w-auto h-10 sm:h-11 px-6 sm:px-8 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm ${actionModal.type === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : actionModal.type === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}>
                                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mr-2" /> : null}
                                    {t('admin_leave.modal.btn_confirm')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLeaveRequests;