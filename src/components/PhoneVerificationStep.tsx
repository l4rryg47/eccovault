import { useState } from "react";
import { Phone, ShieldCheck, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Step = "phone" | "otp";

const PhoneVerificationStep = () => {
  const { profile, session, logout, refreshProfile } = useAuth();

  const storedPhone = (profile?.profile_data?.phone as string) ?? "";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(storedPhone);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }

    setSending(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-otp`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send code. Check the phone number and try again.");
      }

      setStep("otp");
      toast.success("Verification code sent!");
    } catch (err) {
      console.error("Textbelt error:", err);
      toast.error((err as Error).message || "Failed to send code. Check the phone number and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Please enter the full 6-digit code.");
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc("verify_phone_otp", { p_code: code });
      if (error) throw error;

      const result = data as { ok: boolean; error?: string };
      if (!result.ok) {
        throw new Error(result.error || "Invalid or expired code.");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone_verified: true,
          profile_data: {
            ...(profile?.profile_data ?? {}),
            phone,
          },
        })
        .eq("id", session?.user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Phone verified!");
    } catch (err) {
      console.error("Verification error:", err);
      toast.error((err as Error).message || "Invalid or expired code.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Phone size={24} className="text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Verify your phone</h1>
          <p className="text-sm text-muted-foreground">
            {step === "phone"
              ? "We need to confirm your phone number before you can access your account."
              : `Enter the 6-digit code we sent to ${phone}.`}
          </p>
        </div>

        <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-5 shadow-card">
          {step === "phone" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  disabled={sending}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                />
              </div>
              <Button
                variant="hero"
                className="w-full"
                onClick={handleSendOtp}
                disabled={sending || !phone.trim()}
              >
                {sending
                  ? <><Loader2 size={14} className="animate-spin mr-2" />Sending…</>
                  : "Send verification code"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono tracking-[0.4em] text-center text-lg"
                  disabled={verifying}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
              </div>
              <Button
                variant="hero"
                className="w-full"
                onClick={handleVerify}
                disabled={verifying || code.length !== 6}
              >
                {verifying
                  ? <><Loader2 size={14} className="animate-spin mr-2" />Verifying…</>
                  : <><ShieldCheck size={14} className="mr-2" />Verify phone</>}
              </Button>
              <button
                onClick={() => { setCode(""); setStep("phone"); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Didn't receive it? Go back and resend.
              </button>
            </>
          )}
        </div>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={logout}>
          <LogOut size={14} className="mr-2" />Sign out
        </Button>
      </div>
    </div>
  );
};

export default PhoneVerificationStep;
