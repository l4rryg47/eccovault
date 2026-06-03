import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Loader2, AlertCircle, LogOut, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * ReauthModal
 *
 * Renders as a fixed overlay on top of whatever is behind it (the dashboard).
 * The backdrop blurs and dims the content so the user can see they're "still
 * inside" the app, but cannot interact with it until they re-verify.
 *
 * Mount this inside DashboardLayout so the dashboard itself renders in the
 * background — the modal just floats on top.
 */

const ReauthModal = () => {
  const { user, profile, reauth, logout, isLocked } = useAuth();

  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus password field when modal appears
  useEffect(() => {
    if (isLocked) {
      setPassword("");
      setErrorMsg(null);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await reauth(password);

    setSubmitting(false);

    if (error) {
      setErrorMsg(error);
      setPassword("");
      inputRef.current?.focus();
    }
    // On success, AuthContext calls unlock() → isLocked becomes false →
    // this component unmounts via AnimatePresence.
  };

  const displayName =
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <AnimatePresence>
      {isLocked && (
        <>
          {/* ── Backdrop: blurs + dims the dashboard behind ── */}
          <motion.div
            key="reauth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 backdrop-blur-sm bg-background/60"
            aria-hidden="true"
          />

          {/* ── Modal card ── */}
          <motion.div
            key="reauth-modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reauth-title"
          >
            <div className="w-full max-w-sm rounded-lg border border-border/60 bg-background shadow-2xl">
              {/* Header */}
              <div className="flex flex-col items-center gap-3 border-b border-border/30 px-6 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Lock size={22} className="text-primary" />
                </div>
                <div>
                  <h2 id="reauth-title" className="font-display text-lg font-semibold text-foreground">
                    Verify it's you
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Welcome back, <span className="font-medium text-foreground">{displayName}</span>.
                    Enter your password to continue.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 p-3">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
                    <p className="text-xs text-destructive">{errorMsg}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reauth-password" className="text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      id="reauth-password"
                      type={showPass ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={submitting}
                      className="border-border/50 bg-muted/50 pr-10 text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={submitting || !password}
                >
                  {submitting ? (
                    <><Loader2 size={15} className="animate-spin" /> Verifying…</>
                  ) : (
                    "Continue to Dashboard"
                  )}
                </Button>
              </form>

              {/* Footer */}
              <div className="border-t border-border/30 px-6 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Not {displayName}?{" "}
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <LogOut size={11} /> Sign out
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReauthModal;
