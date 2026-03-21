import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Loader2, ShieldAlert, AlertCircle } from "lucide-react";
import CustomSelect from "../../components/ui/CustomSelect";
import api from "../../api/axios";

const AddEmployeeModal = ({ isOpen, onClose }) => {
    // Determine if the logged-in user is a SuperAdmin
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === 'SuperAdmin';

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Default role is always 'Employee'. SuperAdmins can change this to 'Admin'.
    const [formData, setFormData] = useState({
        name: "", email: "", mobile: "", role: "Employee", designation: "", adminId: "", password: ""
    });

    if (!isOpen) return null;

    const isAdminForm = formData.role === "Admin";

    const handleSave = async () => {
        setIsLoading(true);
        setErrorMsg("");

        try {
            if (isAdminForm) {
                // Route for Admin (SuperAdmin only)
                await api.post('/admin/create-admin', {
                    name: formData.name,
                    email: formData.email,
                    mobile: formData.mobile,
                    employeeId: formData.adminId,
                    password: formData.password
                });
            } else {
                // Route for Employee
                await api.post('/admin/create-employee', {
                    name: formData.name,
                    email: formData.email,
                    mobile: formData.mobile,
                    designation: formData.designation || 'Staff', // e.g., Teacher, Supervisor
                    zone: ''
                });
            }

            // Reset form and close modal on success
            setFormData({ name: "", email: "", mobile: "", role: "Employee", designation: "", adminId: "", password: "" });
            onClose();

        } catch (error) {
            console.error("Save Error:", error);
            setErrorMsg(error.response?.data?.message || "Failed to create user. Please check your inputs.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0" onClick={e => e.stopPropagation()}>

                <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-12 h-1.5 bg-muted rounded-full"></div>
                </div>

                <div className="bg-card flex items-center justify-between px-6 pb-4 pt-2 md:pt-6 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isAdminForm ? <ShieldAlert className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
                        {isAdminForm ? "Add New Admin" : "Add New Employee"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors hidden md:block">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

                    {errorMsg && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-semibold text-sm leading-tight">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input placeholder="e.g. John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input type="email" placeholder="john.doe@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11 rounded-xl" />
                    </div>

                    <div className={`grid ${isSuperAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        <div className="space-y-2">
                            <Label>Mobile No.</Label>
                            <Input type="tel" placeholder="+1 234 567 890" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                        {/* Only show the Role dropdown if the logged-in user is a SuperAdmin */}
                        {isSuperAdmin && (
                            <div className="space-y-2">
                                <Label>Account Level</Label>
                                <CustomSelect
                                    options={["Employee", "Admin"]}
                                    value={formData.role}
                                    onChange={(selectedValue) => setFormData({ ...formData, role: selectedValue })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Show Designation IF creating an Employee */}
                    {!isAdminForm && (
                        <div className="space-y-2 animate-in fade-in">
                            <Label>Designation <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                            <Input placeholder="Teacher, Supervisor etc." value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="h-11 rounded-xl" />
                        </div>
                    )}

                    {/* Show Admin ID and Password IF creating an Admin */}
                    {isAdminForm && (
                        <div className="space-y-4 p-4 border border-border rounded-xl bg-muted/20 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Admin ID</Label>
                                    <Input placeholder="ADM-001" value={formData.adminId} onChange={(e) => setFormData({ ...formData, adminId: e.target.value })} className="h-11 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-11 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-muted/10 p-4 md:p-6 border-t border-border flex justify-end gap-3 pb-safe">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl">Cancel</Button>
                    <Button className="gap-2 shadow-glow rounded-xl" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isAdminForm ? <ShieldAlert className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {isLoading ? "Saving..." : isAdminForm ? "Create Admin" : "Create Employee"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddEmployeeModal;