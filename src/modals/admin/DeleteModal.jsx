import { AlertTriangle } from "lucide-react";

const DeleteModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-foreground mb-2">Delete Video?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    This action cannot be undone. This video will be permanently removed from the vault.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-white font-bold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2">
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal