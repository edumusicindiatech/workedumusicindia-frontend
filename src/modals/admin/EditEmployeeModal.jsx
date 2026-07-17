import { useState, useEffect, useRef } from "react";
import { X, Loader2, Save, MapPin, Shield, UserCircle2, Phone, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CustomSelect from "../../components/ui/CustomSelect";

const EditEmployeeModal = ({ isOpen, onClose, employee, onSave, currentUser }) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    
    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        zone: "",
        password: "",
        role: "Employee"
    });

    useEffect(() => {
        if (employee && isOpen) {
            setFormData({
                name: employee.name || "",
                email: employee.email || "",
                phone: employee.mobile || "",
                zone: employee.zone || "",
                password: "",
                role: employee.role || "Employee"
            });
            setIsClosing(false);
            setDragOffset(0);
        }
    }, [employee, isOpen]);

    if (!isOpen) return null;

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
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

    // --- API HANDLER ---
    const handleSave = async () => {
        setIsLoading(true);
        const loadingToast = toast.loading(t('edit_employee_modal.saving', 'Updating Profile...'));
        try {
            const response = await api.put(`/admin/employees/${employee._id}`, formData);

            if (response.data.success) {
                toast.success(t('edit_employee_modal.success_msg', 'Profile updated successfully'), { id: loadingToast });
                onSave(response.data.data);
                handleClose();
            }
        } catch (error) {
            console.error("Update Error:", error);
            toast.error(error.response?.data?.message || t('edit_employee_modal.error_msg', 'Failed to update profile'), { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const roleOptions = [
        { value: "Employee", label: t('roles.employee', 'Employee') },
        { value: "Admin", label: t('roles.admin', 'Admin') }
    ];

    return (
        <div className={`fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-md animate-in fade-in'}`} onClick={!isLoading ? handleClose : undefined}>
            <div 
                className={`bg-card w-full max-w-xl rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} 
                style={{ transform: `translateY(${dragOffset}px)` }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Top Border Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit]" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
                    </div>
                    
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                <UserCircle2 className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground line-clamp-1 tracking-tight">
                                    {t('edit_employee_modal.title', 'Edit Profile')}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                    {employee?.name || 'User Account'}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} disabled={isLoading} className="p-2.5 hover:bg-muted rounded-full bg-muted/50 border border-border shrink-0 hidden md:flex transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-card">
                    
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('edit_employee_modal.full_name', 'Full Name')}</Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/70">
                                    <UserCircle2 className="w-4.5 h-4.5" />
                                </div>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl pl-11 bg-muted/20 border-border/60" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('edit_employee_modal.email', 'Email Address')}</Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/70">
                                    <Mail className="w-4.5 h-4.5" />
                                </div>
                                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-12 rounded-xl pl-11 bg-muted/20 border-border/60" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('edit_employee_modal.phone', 'Phone Number')}</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/70">
                                        <Phone className="w-4.5 h-4.5" />
                                    </div>
                                    <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-12 rounded-xl pl-11 bg-muted/20 border-border/60" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('edit_employee_modal.location_zone', 'Location Zone')}</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/70">
                                        <MapPin className="w-4.5 h-4.5" />
                                    </div>
                                    <Input placeholder={t('edit_employee_modal.zone_placeholder', 'Enter Zone')} value={formData.zone} onChange={(e) => setFormData({ ...formData, zone: e.target.value })} className="h-12 rounded-xl pl-11 bg-muted/20 border-border/60" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2 pt-2">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('edit_employee_modal.role', 'Account Permissions')}</Label>
                        <CustomSelect
                            value={formData.role}
                            onChange={(val) => setFormData({ ...formData, role: val })}
                            options={roleOptions}
                            disabled={currentUser?.role !== 'SuperAdmin'}
                            icon={Shield}
                        />
                        {currentUser?.role !== 'SuperAdmin' && (
                            <p className="text-[10px] text-muted-foreground italic ml-1 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> {t('edit_employee_modal.role_lock', 'Role can only be changed by a SuperAdmin')}
                            </p>
                        )}
                    </div>

                    {/* Security Section */}
                    <div className="space-y-2 pt-2">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t('edit_employee_modal.password_optional', 'Reset Password')}</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/70">
                                <Lock className="w-4.5 h-4.5" />
                            </div>
                            <Input
                                type="password"
                                placeholder={t('edit_employee_modal.password_placeholder', 'Leave blank to keep current')}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="h-12 rounded-xl pl-11 bg-muted/20 border-border/60"
                            />
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 sm:p-6 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-end gap-3 rounded-b-4xl pb-safe">
                    <Button 
                        variant="ghost" 
                        onClick={handleClose} 
                        disabled={isLoading} 
                        className="w-full sm:w-auto h-12 rounded-xl font-bold text-muted-foreground border-border/80 hover:bg-muted transition-colors flex-1 sm:flex-none"
                    >
                        {t('edit_employee_modal.cancel', 'Cancel')}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isLoading} 
                        className="w-full sm:w-auto h-12 sm:px-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] flex-2 sm:flex-none"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} 
                        {isLoading ? t('edit_employee_modal.saving', 'Saving...') : t('edit_employee_modal.save_changes', 'Save Changes')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditEmployeeModal;