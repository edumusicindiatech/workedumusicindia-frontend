import { useState, useEffect } from "react";
import { X, Loader2, Save, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next"; // <-- Added import

const EditEmployeeModal = ({ isOpen, onClose, employee, onSave }) => {
    const { t } = useTranslation(); // <-- Initialize translation hook
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "", email: "", phone: "", zone: "", password: ""
    });

    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name || "",
                email: employee.email || "",
                phone: employee.mobile || "", // Map backend 'mobile' to frontend 'phone'
                zone: employee.zone || "",
                password: ""
            });
        }
    }, [employee, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const response = await api.put(`/admin/employees/${employee._id}`, formData);

            if (response.data.success) {
                toast.success(t('edit_employee_modal.success_msg'));
                onSave(response.data.data);
                onClose();
            }
        } catch (error) {
            console.error("Update Error:", error);
            toast.error(error.response?.data?.message || t('edit_employee_modal.error_msg'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {t('edit_employee_modal.title')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">{t('edit_employee_modal.full_name')}</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">{t('edit_employee_modal.email')}</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">{t('edit_employee_modal.phone')}</label>
                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">{t('edit_employee_modal.location_zone')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('edit_employee_modal.zone_placeholder')}
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                    className="w-full h-11 rounded-xl border border-input bg-background pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                        <label className="text-sm font-medium">{t('edit_employee_modal.password_optional')}</label>
                        <input
                            type="password"
                            placeholder={t('edit_employee_modal.password_placeholder')}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-muted/10 px-6 py-4 border-t border-border flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-xl transition-colors">
                        {t('edit_employee_modal.cancel')}
                    </button>
                    <button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-colors shadow-sm">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isLoading ? t('edit_employee_modal.saving') : t('edit_employee_modal.save_changes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditEmployeeModal;