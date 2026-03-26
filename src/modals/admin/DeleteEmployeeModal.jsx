import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation, Trans } from "react-i18next"; // <-- Added imports

const DeleteEmployeeModal = ({ isOpen, onClose, employeeId, employeeName, onConfirm }) => {
    const { t } = useTranslation(); // <-- Initialize hook
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async () => {
        setIsLoading(true);
        const loadingToast = toast.loading(t('delete_employee.toast_loading', { name: employeeName }));

        try {
            const response = await api.delete(`/admin/employees/${employeeId}`);

            if (response.data.success) {
                toast.success(response.data.message, { id: loadingToast });
                onConfirm(); // Trigger the redirect in the parent
                onClose();
            }
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error(error.response?.data?.message || t('delete_employee.toast_error'), { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>

                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">{t('delete_employee.title')}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        <Trans
                            i18nKey="delete_employee.description"
                            values={{ name: employeeName }}
                            components={[<span key="0" />, <strong key="1" />]}
                        />
                    </p>
                </div>

                <div className="bg-muted/10 px-6 py-4 border-t border-border flex flex-col gap-2 rounded-b-2xl">
                    <button
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isLoading ? t('delete_employee.deleting') : t('delete_employee.confirm')}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('delete_employee.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteEmployeeModal;