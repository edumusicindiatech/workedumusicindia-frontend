import { useState, useEffect } from "react";
import { X, CalendarPlus, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "../../api/axios"; // Adjust path as needed

const LeaveRequestModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Status can be: 'none', 'pending', 'approved', 'rejected'
    const [activeRequest, setActiveRequest] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    const [formData, setFormData] = useState({
        fromDate: "",
        toDate: "",
        reason: ""
    });

    // Fetch existing leave request status on open
    useEffect(() => {
        if (isOpen) {
            checkActiveLeaveRequest();
        } else {
            // Reset state when closed
            setDismissed(false);
            setFormData({ fromDate: "", toDate: "", reason: "" });
        }
    }, [isOpen]);

    const checkActiveLeaveRequest = async () => {
        setLoading(true);
        try {
            const res = await api.get('/employee/leave-request/status');
            // Assuming backend returns { success: true, data: { id, status, fromDate, toDate, reason, adminRemarks } }
            // If no active request, return data: null
            if (res.data.success && res.data.data) {
                setActiveRequest(res.data.data);
                setDismissed(false);
            } else {
                setActiveRequest(null);
            }
        } catch (err) {
            console.error("Failed to fetch leave status", err);
            // Optionally handle silently if endpoint doesn't exist yet
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const submitLeaveRequest = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const toastId = toast.loading('Submitting leave request...');

        try {
            // This API should handle creating the Leave Request schema,
            // sending email to admin, and sending the in-app notification
            const res = await api.post('/employee/leave-request', formData);

            toast.success(res.data?.message || "Leave request submitted successfully!", { id: toastId });
            setActiveRequest(res.data.data); // Update to pending state
            setDismissed(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit request", { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const revokeLeaveRequest = async () => {
        setActionLoading(true);
        const toastId = toast.loading('Revoking leave request...');

        try {
            await api.delete(`/employee/leave-request/${activeRequest.id || activeRequest._id}`);
            toast.success("Leave request revoked.", { id: toastId });
            setActiveRequest(null);
            setFormData({ fromDate: "", toDate: "", reason: "" });
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to revoke request", { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setFormData({ fromDate: "", toDate: "", reason: "" });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-3xl shadow-xl border border-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <CalendarPlus className="w-5 h-5 text-blue-500" />
                        Request Leave
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                        disabled={actionLoading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Checking status...</p>
                        </div>
                    ) : activeRequest && !dismissed ? (

                        /* --- ACTIVE REQUEST STATE VIEWS --- */
                        <div className="space-y-6 text-center py-2">

                            {/* STATUS ICONS */}
                            {activeRequest.status === 'pending' && (
                                <div className="flex justify-center mb-4">
                                    <div className="p-4 bg-amber-500/10 rounded-full">
                                        <AlertCircle className="w-10 h-10 text-amber-500" />
                                    </div>
                                </div>
                            )}
                            {activeRequest.status === 'approved' && (
                                <div className="flex justify-center mb-4">
                                    <div className="p-4 bg-emerald-500/10 rounded-full">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </div>
                                </div>
                            )}
                            {activeRequest.status === 'rejected' && (
                                <div className="flex justify-center mb-4">
                                    <div className="p-4 bg-destructive/10 rounded-full">
                                        <XCircle className="w-10 h-10 text-destructive" />
                                    </div>
                                </div>
                            )}

                            {/* TEXT INFO */}
                            <div>
                                <h4 className="text-xl font-bold mb-2">
                                    {activeRequest.status === 'pending' && "Leave Request Pending"}
                                    {activeRequest.status === 'approved' && "Leave Approved!"}
                                    {activeRequest.status === 'rejected' && "Leave Rejected"}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Requested dates: <strong>{activeRequest.fromDate}</strong> to <strong>{activeRequest.toDate}</strong>
                                </p>
                                {activeRequest.adminRemarks && (
                                    <p className="text-sm mt-3 p-3 bg-muted rounded-xl">
                                        <strong>Admin Note:</strong> {activeRequest.adminRemarks}
                                    </p>
                                )}
                            </div>

                            {/* ACTIONS DEPENDING ON STATUS */}
                            <div className="flex gap-3 pt-4 border-t border-border mt-4">
                                {activeRequest.status === 'pending' ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={handleDismiss}
                                            disabled={actionLoading}
                                        >
                                            Dismiss
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={revokeLeaveRequest}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Revoke Leave"}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={onClose}
                                        >
                                            Dismiss
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            onClick={handleDismiss}
                                        >
                                            New Request
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                    ) : (

                        /* --- NEW REQUEST FORM --- */
                        <form onSubmit={submitLeaveRequest} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground">From Date</label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        required
                                        value={formData.fromDate}
                                        onChange={handleInputChange}
                                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground">To Date</label>
                                    <input
                                        type="date"
                                        name="toDate"
                                        required
                                        value={formData.toDate}
                                        onChange={handleInputChange}
                                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Reason for Leave</label>
                                <textarea
                                    name="reason"
                                    required
                                    value={formData.reason}
                                    onChange={handleInputChange}
                                    placeholder="Please explain why you need time off..."
                                    className="flex min-h-25 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-border flex justify-end gap-3 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="h-11 px-6 rounded-xl"
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-11 px-8 rounded-xl font-bold"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeaveRequestModal;