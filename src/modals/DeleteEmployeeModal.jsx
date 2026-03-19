import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

const DeleteEmployeeModal = ({ isOpen, onClose, employeeName, onConfirm }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        // Simulate API call
        setTimeout(() => {
            setIsDeleting(false);
            onConfirm();
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 flex flex-col items-center text-center space-y-4 mt-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Delete Employee?</h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Are you sure you want to completely remove <strong>{employeeName}</strong>? This action will permanently erase their profile, attendance records, and all associated data.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-muted/10 px-6 py-4 border-t border-border flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl transition-colors shadow-sm">
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isDeleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteEmployeeModal;