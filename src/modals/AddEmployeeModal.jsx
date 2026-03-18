import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Loader2, ShieldAlert } from "lucide-react";

const AddEmployeeModal = ({ isOpen, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        role: "Teacher", // Default role
        adminName: "",
        adminId: "",
        password: ""
    });

    if (!isOpen) return null;

    const isAdmin = formData.role === "Admin";

    const handleSave = async () => {
        setIsLoading(true);
        // TODO: Call your backend POST /api/admin/create here
        console.log(`Adding ${isAdmin ? 'Admin' : 'Employee'}:`, formData);

        // Mock delay
        setTimeout(() => {
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden">

                <div className="bg-card flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isAdmin ? <ShieldAlert className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
                        {isAdmin ? "Add New Admin" : "Add New Employee"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                            placeholder="e.g. John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                            type="email"
                            placeholder="john.doe@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="Teacher">Teacher</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Mobile No.</Label>
                            <Input
                                type="tel"
                                placeholder="e.g. +1 234 567 890"
                                value={formData.mobile}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Conditional Admin Fields */}
                    {isAdmin && (
                        <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20 animate-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label>Admin Name</Label>
                                <Input
                                    placeholder="Enter Admin Name"
                                    value={formData.adminName}
                                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Admin ID</Label>
                                    <Input
                                        placeholder="e.g. ADM-001"
                                        value={formData.adminId}
                                        onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-muted/20 p-6 border-t border-border flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button className="gap-2 shadow-glow" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isAdmin ? <ShieldAlert className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {isLoading ? "Creating..." : isAdmin ? "Create Admin" : "Create Employee"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddEmployeeModal;