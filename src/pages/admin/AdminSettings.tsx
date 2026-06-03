import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdminSettings, useAdminSetSetting } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AdminSettings = () => {
  const { data: settings, isLoading } = useAdminSettings();
  const setSetting = useAdminSetSetting();

  const [local, setLocal] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[s.key] = s.value;
      });
      setLocal(map);
    }
  }, [settings]);

  const handleSave = (key: string) => {
    const value = local[key] ?? "";
    setSetting.mutate({ key, value }, {
      onSuccess: () => toast.success("Saved"),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleAddOpen = () => {
    setNewKey("");
    setAddOpen(true);
  };

  const handleCreateSetting = () => {
    const key = newKey.trim();
    if (!key) {
      toast.error("Please enter a setting key.");
      return;
    }
    if (local[key]) {
      toast.error("A setting with this key already exists.");
      return;
    }
    setLocal((current) => ({ ...current, [key]: "" }));
    setAddOpen(false);
    toast.success("Setting created. Update the value and save.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">Customize application messages and behavior.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button onClick={handleAddOpen}>Add Setting</Button>
        </div>

        <div className="grid gap-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : Object.keys(local).length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
              No settings found. Click “Add Setting” to create a custom message.
            </div>
          ) : (
            Object.keys(local).map((key) => (
              <div key={key} className="flex gap-2">
                <Input value={key} readOnly className="w-1/3" />
                <Input
                  value={local[key] ?? ""}
                  onChange={(e) => setLocal((s) => ({ ...s, [key]: e.target.value }))}
                />
                <Button onClick={() => handleSave(key)} disabled={setSetting.isPending}>Save</Button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new admin setting</DialogTitle>
            <DialogDescription>
              Create a new key for custom application text or behavior. Example: <code>error_insufficient_funds</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <Input
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
              placeholder="Setting key"
              aria-label="Setting key"
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSetting}>Create Setting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
