import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    UserPlus, X, Loader2, ShieldAlert, AlertCircle, 
    User, Mail, Phone, MapPin, Briefcase, KeyRound, 
    ShieldCheck, Fingerprint 
} from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";
import toast from "react-hot-toast";
import api from "../../api/axios";

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === 'SuperAdmin';

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Swipe & Animation states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const dragStartY = useRef(0);

    const [formData, setFormData] = useState({
        name: "", email: "", mobile: "", role: "Employee", designation: "", zone: "", adminId: "", password: ""
    });

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setDragOffset(0);
            setErrorMsg("");
            setFormData({ name: "", email: "", mobile: "", role: "Employee", designation: "", zone: "", adminId: "", password: "" });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isAdminForm = formData.role === "Admin";

    // --- ANIMATION HANDLERS ---
    const handleClose = () => {
        if (isLoading) return;
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setDragOffset(0);
        }, 300);
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

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
            toast.error(t('add_user_modal.error_mandatory', 'Please fill all mandatory fields.'));
            return;
        }

        if (isAdminForm && (!formData.adminId || !formData.password)) {
            toast.error(t('add_user_modal.error_admin_req', 'Admin ID and Password are required.'));
            return;
        }

        setIsLoading(true);
        setErrorMsg("");
        const loadingToast = toast.loading(isAdminForm ? t('add_user_modal.creating_admin', 'Creating Admin...') : t('add_user_modal.creating_employee', 'Creating Employee...'));

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

            toast.success(isAdminForm ? t('add_user_modal.success_admin', 'Admin account created!') : t('add_user_modal.success_employee', 'Employee created successfully!'), { id: loadingToast });

            if (onSuccess) onSuccess();
            handleClose();

        } catch (error) {
            console.error("Save Error:", error);
            const errorMessage = error.response?.data?.message || t('common.error', 'Something went wrong');
            setErrorMsg(errorMessage);
            toast.error(errorMessage, { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 transition-all duration-300 md:p-4 ${isClosing ? 'opacity-0 backdrop-blur-none' : 'opacity-100 backdrop-blur-sm animate-in fade-in'}`} onClick={handleClose}>
            <div 
                className={`bg-card w-full max-w-lg rounded-t-[2.5rem] md:rounded-4xl shadow-2xl border-t md:border border-border/50 flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${!isClosing && !isDragging ? 'animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 zoom-in-95' : ''}`} 
                style={{ transform: `translateY(${dragOffset}px)` }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Top Accent Border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary/40 via-primary to-primary/40 z-20 rounded-t-[inherit] pointer-events-none" />

                {/* HEADER */}
                <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 touch-none border-b border-border/50 pt-2" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full"></div>
                    </div>
                    
                    <div className="px-6 pb-5 pt-2 md:pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                {isAdminForm ? <ShieldAlert className="w-6 h-6 text-primary" /> : <UserPlus className="w-6 h-6 text-primary" />}
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                                    {isAdminForm ? t('add_user_modal.title_admin', 'Add New Admin') : t('add_user_modal.title_employee', 'Add New Employee')}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                    {t('add_user_modal.subtitle', 'Fill in the credentials below')}
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

                    {errorMsg && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3.5 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="font-bold text-xs leading-tight uppercase tracking-wide">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Name Input */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_name', 'Full Name')}
                            </Label>
                            <Input 
                                placeholder={t('add_user_modal.placeholder_name', 'Enter full name')} 
                                value={formData.name} 
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                onPointerDown={(e) => e.stopPropagation()}
                                className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30" 
                            />
                        </div>

                        {/* Email Input */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_email', 'Email Address')}
                            </Label>
                            <Input 
                                type="email" 
                                placeholder={t('add_user_modal.placeholder_email', 'name@example.com')} 
                                value={formData.email} 
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                                onPointerDown={(e) => e.stopPropagation()}
                                className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30" 
                            />
                        </div>

                        {/* Mobile & Role Switch Grid */}
                        <div className={`grid ${isSuperAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-5`}>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_mobile', 'Mobile Number')}
                                </Label>
                                <Input 
                                    type="tel" 
                                    placeholder="+91 00000 00000" 
                                    value={formData.mobile} 
                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30" 
                                />
                            </div>
                            
                            {isSuperAdmin && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_level', 'Account Level')}
                                    </Label>
                                    <CustomSelect
                                        options={[t('add_user_modal.level_employee', 'Employee'), t('add_user_modal.level_admin', 'Admin')]}
                                        value={formData.role === "Admin" ? t('add_user_modal.level_admin') : t('add_user_modal.level_employee')}
                                        onChange={(selectedValue) => setFormData({ ...formData, role: selectedValue === t('add_user_modal.level_admin') ? "Admin" : "Employee" })}
                                        icon={ShieldCheck}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Employee Specific Fields */}
                        {!isAdminForm && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-500">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                        <Briefcase className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_designation', 'Designation')}
                                    </Label>
                                    <Input 
                                        placeholder={t('add_user_modal.placeholder_designation', 'Staff')} 
                                        value={formData.designation} 
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })} 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_location', 'Assigned Zone')}
                                    </Label>
                                    <Input 
                                        placeholder={t('add_user_modal.placeholder_location', 'e.g. Zone A')} 
                                        value={formData.zone} 
                                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })} 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="h-12 rounded-xl bg-muted/20 border-border/60 focus-visible:ring-primary/30" 
                                    />
                                </div>
                            </div>
                        )}

                        {/* Admin Specific Credentials */}
                        {isAdminForm && (
                            <div className="space-y-5 p-5 border border-border/80 rounded-3xl bg-muted/30 animate-in slide-in-from-top-2 duration-500">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1 mb-2">Access Credentials</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                            <Fingerprint className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_admin_id', 'Admin ID')}
                                        </Label>
                                        <Input 
                                            placeholder="ADM-001" 
                                            value={formData.adminId} 
                                            onChange={(e) => setFormData({ ...formData, adminId: e.target.value })} 
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="h-12 rounded-xl bg-card border-border/80 focus-visible:ring-primary/30" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-foreground ml-1 flex items-center gap-2">
                                            <KeyRound className="w-3.5 h-3.5 text-primary/70" /> {t('add_user_modal.label_password', 'Password')}
                                        </Label>
                                        <Input 
                                            type="password" 
                                            placeholder="••••••••" 
                                            value={formData.password} 
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="h-12 rounded-xl bg-card border-border/80 focus-visible:ring-primary/30" 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
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
                        {t('add_user_modal.btn_cancel', 'Cancel')}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isLoading} 
                        className="w-full sm:w-auto h-12 sm:px-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] flex-2 sm:flex-none"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : isAdminForm ? (
                            <ShieldAlert className="w-5 h-5 mr-2" />
                        ) : (
                            <UserPlus className="w-5 h-5 mr-2" />
                        )}
                        {isLoading ? t('add_user_modal.btn_saving', 'Saving...') : isAdminForm ? t('add_user_modal.btn_create_admin', 'Create Admin') : t('add_user_modal.btn_create_employee', 'Create Employee')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddEmployeeModal;