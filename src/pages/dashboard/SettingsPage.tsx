import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useUpdatePassword } from "@/hooks/useSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Bell, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user, profile } = useAuth();

  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const updateProfile = useUpdateProfile();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { full_name: fullName },
      {
        onSuccess: () => toast.success("Profile updated!"),
        onError:   () => toast.error("Failed to update profile."),
      }
    );
  };

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const updatePassword = useUpdatePassword();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    updatePassword.mutate(newPassword, {
      onSuccess: () => {
        toast.success("Password updated!");
        setNewPassword("");
        setConfirmPassword("");
      },
      onError: (err: Error) => toast.error(err.message ?? "Failed to update password."),
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <form onSubmit={handleSaveProfile} className="rounded border border-border/40 bg-gradient-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <User size={18} className="text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Profile</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-foreground">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="border-border/50 bg-muted/50 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input
                value={user?.email ?? ""}
                readOnly
                disabled
                className="border-border/50 bg-muted/50 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
          </div>
          <Button
            type="submit"
            variant="hero"
            size="sm"
            className="mt-4"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Saving…</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>

        {/* Security */}
        <div className="rounded border border-border/40 bg-gradient-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Shield size={18} className="text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Security</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">New Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                className="border-border/50 bg-muted/50 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Confirm Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-border/50 bg-muted/50 text-foreground"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={updatePassword.isPending || !newPassword}
            >
              {updatePassword.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Updating…</>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </div>

        {/* Notifications (UI only — extend in Phase 4 if needed) */}
        <div className="rounded border border-border/40 bg-gradient-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Bell size={18} className="text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-3">
            {["Transaction alerts", "Security alerts", "Marketing emails", "Monthly statements"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3"
                >
                  <p className="text-sm text-foreground">{item}</p>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" defaultChecked className="peer sr-only" />
                    <div className="h-5 w-9 rounded-full bg-muted-foreground/30 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-foreground after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
                  </label>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
