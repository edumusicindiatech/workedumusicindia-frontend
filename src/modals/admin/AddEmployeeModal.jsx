import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next"; // <-- Added import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Loader2, ShieldAlert, AlertCircle } from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";
import toast from "react-hot-toast";
import api from "../../api/axios";

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation(); // <-- Initialize translation hook
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === 'SuperAdmin';

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    const [formData, setFormData] = useState({
        name: "", email: "", mobile: "", role: "Employee", designation: "", zone: "", adminId: "", password: ""
    });

    if (!isOpen) return null;

    const isAdminForm = formData.role === "Admin";

    const handleClose = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
            setErrorMsg("");
            setFormData({ name: "", email: "", mobile: "", role: "Employee", designation: "", zone: "", adminId: "", password: "" });
        }, 300);
    };

    const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; setIsDragging(true); };
    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0) setDragOffset(delta);
    };
    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 120) handleClose();
        else setDragOffset(0);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || !formData.mobile) {
            toast.error(t('add_user_modal.error_mandatory'));
            return;
        }

        if (isAdminForm && (!formData.adminId || !formData.password)) {
            toast.error(t('add_user_modal.error_admin_req'));
            return;
        }

        setIsLoading(true);
        setErrorMsg("");
        const loadingToast = toast.loading(isAdminForm ? t('add_user_modal.creating_admin') : t('add_user_modal.creating_employee'));

        try {
            if (isAdminForm) {
                await api.post('/admin/create-admin', {
                    name: formData.name,
                    email: formData.email,
                    mobile: formData.mobile,
                    employeeId: formData.adminId,
                    password: formData.password
                });
            } else {
                await api.post('/admin/create-employee', {
                    name: formData.name,
                    email: formData.email,
                    mobile: formData.mobile,
                    designation: formData.designation || 'Staff',
                    zone: formData.zone
                });
            }

            toast.success(isAdminForm ? t('add_user_modal.success_admin') : t('add_user_modal.success_employee'), { id: loadingToast });

            if (onSuccess) onSuccess();
            handleClose();

        } catch (error) {
            console.error("Save Error:", error);
            const errorMessage = error.response?.data?.message || t('common.error');
            setErrorMsg(errorMessage);
            toast.error(errorMessage, { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-sm animate-in fade-in'}`} onClick={!isLoading ? handleClose : undefined}>
            <div className={`bg-card w-full max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0' : ''}`} style={{ transform: `translateY(${dragOffset}px)` }} onClick={e => e.stopPropagation()}>

                <div className="sticky top-0 bg-card z-10 rounded-t-3xl md:rounded-t-2xl touch-none border-b border-border" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted rounded-full"></div>
                    </div>
                    <div className="flex items-center justify-between px-6 pb-4 pt-2 md:pt-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {isAdminForm ? <ShieldAlert className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
                            {isAdminForm ? t('add_user_modal.title_admin') : t('add_user_modal.title_employee')}
                        </h2>
                        <button onClick={handleClose} disabled={isLoading} className="p-2 hover:bg-muted rounded-full transition-colors hidden md:block">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

                    {errorMsg && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-semibold text-sm leading-tight">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>{t('add_user_modal.label_name')}</Label>
                        <Input placeholder={t('add_user_modal.placeholder_name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('add_user_modal.label_email')}</Label>
                        <Input type="email" placeholder={t('add_user_modal.placeholder_email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11 rounded-xl" />
                    </div>

                    <div className={`grid ${isSuperAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        <div className="space-y-2">
                            <Label>{t('add_user_modal.label_mobile')}</Label>
                            <Input type="tel" placeholder={t('add_user_modal.placeholder_mobile')} value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                        {isSuperAdmin && (
                            <div className="space-y-2">
                                <Label>{t('add_user_modal.label_level')}</Label>
                                <CustomSelect
                                    options={[t('add_user_modal.level_employee'), t('add_user_modal.level_admin')]}
                                    value={formData.role === "Admin" ? t('add_user_modal.level_admin') : t('add_user_modal.level_employee')}
                                    onChange={(selectedValue) => setFormData({ ...formData, role: selectedValue === t('add_user_modal.level_admin') ? "Admin" : "Employee" })}
                                />
                            </div>
                        )}
                    </div>

                    {!isAdminForm && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                            <div className="space-y-2">
                                <Label>{t('add_user_modal.label_designation')} <span className="text-muted-foreground font-normal">{t('add_user_modal.optional')}</span></Label>
                                <Input placeholder={t('add_user_modal.placeholder_designation')} value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('add_user_modal.label_location')} <span className="text-muted-foreground font-normal">{t('add_user_modal.optional')}</span></Label>
                                <Input placeholder={t('add_user_modal.placeholder_location')} value={formData.zone} onChange={(e) => setFormData({ ...formData, zone: e.target.value })} className="h-11 rounded-xl" />
                            </div>
                        </div>
                    )}

                    {isAdminForm && (
                        <div className="space-y-4 p-4 border border-border rounded-xl bg-muted/20 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('add_user_modal.label_admin_id')}</Label>
                                    <Input placeholder={t('add_user_modal.placeholder_admin_id')} value={formData.adminId} onChange={(e) => setFormData({ ...formData, adminId: e.target.value })} className="h-11 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('add_user_modal.label_password')}</Label>
                                    <Input type="password" placeholder={t('add_user_modal.placeholder_password')} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-11 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-muted/10 p-4 md:p-6 border-t border-border flex justify-end gap-3 rounded-b-3xl md:rounded-b-2xl pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <Button variant="ghost" onClick={handleClose} disabled={isLoading} className="rounded-xl font-medium">{t('add_user_modal.btn_cancel')}</Button>
                    <Button className="gap-2 shadow-glow rounded-xl font-semibold" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isAdminForm ? <ShieldAlert className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {isLoading ? t('add_user_modal.btn_saving') : isAdminForm ? t('add_user_modal.btn_create_admin') : t('add_user_modal.btn_create_employee')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddEmployeeModal;