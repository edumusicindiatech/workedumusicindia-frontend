import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import {
    CalendarDays, Mail, User, CheckCircle2, XCircle,
    Clock, Loader2, AlertCircle, FileText, Search, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

// --- SOCKET IMPORT ---
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000");

const AdminLeaveRequests = () => {
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
            toast.error("Failed to load leave requests.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // ==========================================
    // REAL-TIME DATA REFRESH
    // ==========================================
    useEffect(() => {
        if (!user) return;
        const currentUserId = user.id || user._id;

        const joinRoom = () => socket.emit("join_room", currentUserId);

        if (socket.connected) joinRoom();
        socket.on("connect", joinRoom);

        const handleRealTimeUpdate = () => {
            fetchRequests(); // Silent refresh on background events
        };

        socket.on("new_notification", handleRealTimeUpdate);

        return () => {
            socket.off("connect", joinRoom);
            socket.off("new_notification", handleRealTimeUpdate);
        };
    }, [user, fetchRequests]);

    // ==========================================
    // THE FIX: GLOBAL OVERLAP DETECTION
    // ==========================================
    const uniqueAllRequests = useMemo(() => {
        // 1. Sort ALL requests by newest update first
        const allSorted = [...requests].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        const uniqueAll = [];

        // 2. Keep only the absolute latest request for any overlapping period per user
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

            if (!hasOverlap) {
                uniqueAll.push(current);
            }
        });

        return uniqueAll;
    }, [requests]);

    // 3. Filter the absolute unique list by the active tab
    const uniqueFilteredRequests = uniqueAllRequests.filter(req => req.status === activeTab);

    // Accurate badge counting
    const pendingCount = uniqueAllRequests.filter(req => req.status === 'pending').length;

    // ==========================================
    // THE FIX: OPTIMISTIC UI UPDATES
    // ==========================================
    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const { request, type } = actionModal;
        const toastId = toast.loading(`${type === 'pending' ? 'Revoking decision' : 'Marking as ' + type}...`);

        // 1. Optimistic Update: Vanish the card instantly before server responds
        setRequests(prev => prev.map(r =>
            r.id === request.id ? { ...r, status: type, updatedAt: new Date().toISOString() } : r
        ));

        // Close modal instantly
        setActionModal({ isOpen: false, request: null, type: null });
        setRemarks("");

        try {
            await api.put(`/admin/leave-requests/${request.id}/status`, {
                status: type,
                adminRemarks: remarks
            });

            toast.success(type === 'pending' ? 'Decision revoked!' : `Leave request ${type}!`, { id: toastId });
            fetchRequests(); // Background sync to ensure total accuracy
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to update request.`, { id: toastId });
            fetchRequests(); // If it fails, revert UI to actual server state
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">Syncing requests...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                        <CalendarDays className="w-8 h-8 text-primary" />
                        Leave Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {activeTab === 'pending' ? "Reviewing unique active requests." : "Archived leave history."}
                    </p>
                </div>

                <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50 w-full md:w-auto">
                    {['pending', 'approved', 'rejected'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${activeTab === tab
                                ? 'bg-background shadow-sm text-foreground border border-border/50'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                        >
                            {tab}
                            {tab === 'pending' && pendingCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {uniqueFilteredRequests.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-3xl p-12 text-center flex flex-col items-center shadow-sm">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No {activeTab} requests</h3>
                    <p className="text-muted-foreground">All caught up! No unique requests found in this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {uniqueFilteredRequests.map((req) => (
                        <div key={req.id} className="group bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">

                            <div className="p-5 border-b border-border/50 bg-muted/20 flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        {req.employeeName}
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" />
                                        {req.employeeEmail}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {req.status === 'pending' && <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>}
                                    {req.status === 'approved' && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>}
                                    {req.status === 'rejected' && <span className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>}
                                </div>
                            </div>

                            <div className="p-5 space-y-4 flex-1">
                                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Time Period</p>
                                        <p className="font-bold text-foreground text-sm">
                                            {new Date(req.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            <span className="text-muted-foreground font-normal mx-1">to</span>
                                            {new Date(req.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg border border-border/50">
                                        <CalendarDays className="w-5 h-5 text-primary" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" /> Reason
                                    </p>
                                    <p className="text-sm text-foreground bg-muted/40 p-3 rounded-xl border border-border/50 leading-relaxed italic">
                                        "{req.reason}"
                                    </p>
                                </div>

                                {req.adminRemarks && (
                                    <div className="space-y-2 mt-4 pt-4 border-t border-dashed border-border">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Admin Note</p>
                                        <p className="text-xs font-medium text-muted-foreground bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                            {req.adminRemarks}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-5 border-t border-border bg-muted/10 flex gap-3">
                                {req.status === 'pending' ? (
                                    <>
                                        <Button variant="outline" className="flex-1 h-11 text-destructive hover:bg-destructive hover:text-white border-destructive/20 rounded-xl" onClick={() => setActionModal({ isOpen: true, request: req, type: 'rejected' })}>
                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                        <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-xl" onClick={() => setActionModal({ isOpen: true, request: req, type: 'approved' })}>
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" className="w-full h-11 border-primary/20 text-primary hover:bg-primary/5 rounded-xl" onClick={() => setActionModal({ isOpen: true, request: req, type: 'pending' })}>
                                        <RotateCcw className="w-4 h-4 mr-2" /> Revoke Decision
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {actionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-3xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`px-6 py-4 border-b border-border flex items-center gap-3 ${actionModal.type === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : actionModal.type === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {actionModal.type === 'pending' ? <RotateCcw className="w-6 h-6" /> : actionModal.type === 'approved' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                            <h3 className="text-lg font-bold capitalize">{actionModal.type === 'pending' ? 'Revoke Decision' : actionModal.type + ' Leave'}</h3>
                        </div>

                        <form onSubmit={handleStatusUpdate} className="p-6 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {actionModal.type === 'pending'
                                    ? `Are you sure you want to revoke the decision for ${actionModal.request?.employeeName}? The request will return to the Pending tab.`
                                    : `Provide details for the ${actionModal.type} of ${actionModal.request?.employeeName}'s leave.`}
                            </p>

                            {actionModal.type !== 'pending' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Remarks (Optional)</label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder={`Reason for ${actionModal.type}...`}
                                        className="flex min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => { setActionModal({ isOpen: false, request: null, type: null }); setRemarks(""); }} disabled={actionLoading}>Cancel</Button>
                                <Button type="submit" disabled={actionLoading} className={`px-8 rounded-xl text-white ${actionModal.type === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : actionModal.type === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}>
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Confirm
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