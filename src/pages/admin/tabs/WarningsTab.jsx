import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Plus } from "lucide-react";

const WarningsTab = ({ warningsList }) => {
    const [newWarning, setNewWarning] = useState({ type: "Verbal", reason: "" });

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-xl shadow-card p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Warning History</h3>
                <div className="space-y-3">
                    {warningsList.map((w) => (
                        <div key={w.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${w.type === "Written" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{w.type} Warning</span>
                                    <span className="text-sm text-muted-foreground">· {w.date}</span>
                                </div>
                                <p className="text-sm text-foreground mt-1">{w.reason}</p>
                                <p className="text-xs text-muted-foreground mt-1">Issued by: {w.issuedBy}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-card p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Issue New Warning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Type</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newWarning.type} onChange={(e) => setNewWarning({ ...newWarning, type: e.target.value })}>
                            <option>Verbal</option>
                            <option>Written</option>
                            <option>Final</option>
                        </select>
                    </div>
                    <div>
                        <Label>Reason</Label>
                        <Input placeholder="Reason for warning" value={newWarning.reason} onChange={(e) => setNewWarning({ ...newWarning, reason: e.target.value })} />
                    </div>
                </div>
                <Button className="mt-4 gap-2">
                    <Plus className="w-4 h-4" /> Issue Warning
                </Button>
            </div>
        </div>
    );
};

export default WarningsTab;