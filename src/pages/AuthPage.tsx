import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, REAUTH_GRACE_MS, type SignupProfileData } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2,
  User, MapPin, FileText, Upload, X,
} from "lucide-react";
import type { KycDocument } from "@/lib/cloudinary";

type AuthPageProps = { initialMode?: "login" | "signup" };

type DocType = KycDocument["type"];

interface DocSlot {
  type: DocType;
  label: string;
  file: File | null;
}

const INITIAL_DOCS: DocSlot[] = [
  { type: "national_id",      label: "National ID",           file: null },
  { type: "drivers_license",  label: "Driver's License",      file: null },
  { type: "passport",         label: "International Passport", file: null },
];

const STEPS = [
  { icon: User,     title: "Account",  desc: "Your login credentials" },
  { icon: MapPin,   title: "Personal", desc: "Identity & address"     },
  { icon: FileText, title: "Documents","desc": "KYC verification"      },
];

const AuthPage = ({ initialMode = "login" }: AuthPageProps) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [step, setStep] = useState(1);

  // Step 1
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [phone,       setPhone]       = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city,        setCity]        = useState("");
  const [stateVal,    setStateVal]    = useState("");
  const [postalCode,  setPostalCode]  = useState("");
  const [country,     setCountry]     = useState("");

  // Step 3
  const [docs, setDocs] = useState<DocSlot[]>(INITIAL_DOCS);

  // Email OTP verification
  const [awaitingOtp,    setAwaitingOtp]    = useState(false);
  const [otp,            setOtp]            = useState("");
  const [pendingProfile, setPendingProfile] = useState<SignupProfileData | null>(null);
  // Suppresses the auto-redirect effect during the brief verify session that
  // `verifyEmailOtp` opens (and immediately closes) to persist profile data.
  const verifyingRef = useRef(false);

  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { user, loading, lastVerified, lock, login, signup, verifyEmailOtp, resendEmailOtp } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();

  useEffect(() => {
    if (loading || checkingAdmin) return;
    if (verifyingRef.current) return;
    if (!user) return;
    const destination = isAdmin ? "/admin" : "/dashboard";
    navigate(destination, { replace: true });
    if (!isAdmin) lock();
    // Intentionally gated on auth-resolution state only; `lock`/`navigate` are
    // stable-intent and including the unmemoized `lock` would re-fire the redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, isAdmin, checkingAdmin]);

  if (loading) return null;

  // ── Helpers ──────────────────────────────────────────────

  const clearError = () => setErrorMsg(null);

  const setDoc = (type: DocType, file: File | null) => {
    setDocs((prev) => prev.map((d) => d.type === type ? { ...d, file } : d));
  };

  const hasAtLeastOneDoc = docs.some((d) => d.file !== null);

  // ── Step validation ───────────────────────────────────────

  const validateStep1 = () => {
    if (!name.trim()) { setErrorMsg("Full name is required."); return false; }
    if (!email.trim()) { setErrorMsg("Email is required."); return false; }
    if (password.length < 6) { setErrorMsg("Password must be at least 6 characters."); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!phone.trim())       { setErrorMsg("Phone number is required."); return false; }
    if (!dateOfBirth)        { setErrorMsg("Date of birth is required."); return false; }
    if (!addressLine1.trim()){ setErrorMsg("Street address is required."); return false; }
    if (!city.trim())        { setErrorMsg("City is required."); return false; }
    if (!stateVal.trim())    { setErrorMsg("State/region is required."); return false; }
    if (!postalCode.trim())  { setErrorMsg("Postal code is required."); return false; }
    if (!country.trim())     { setErrorMsg("Country is required."); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!hasAtLeastOneDoc) {
      setErrorMsg("Please upload at least one identity document.");
      return false;
    }
    return true;
  };

  // ── Navigation ────────────────────────────────────────────

  const handleNext = () => {
    clearError();
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    clearError();
    setStep((s) => s - 1);
  };

  // ── Submit ────────────────────────────────────────────────

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    const { error } = await login(email, password);
    if (error) {
      if (error.message.toLowerCase().includes("invalid login")) {
        setErrorMsg("Incorrect email or password.");
        setSubmitting(false);
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        // Move the user into OTP verification and send them a fresh code.
        await resendEmailOtp(email);
        setPendingProfile(null);
        setOtp("");
        setAwaitingOtp(true);
        setSuccessMsg(`Your email isn't confirmed yet. We sent a 6-digit code to ${email}.`);
        setSubmitting(false);
      } else {
        setErrorMsg(error.message);
        setSubmitting(false);
      }
    } else {
      navigate("/dashboard");
    }
  };

  const handleSignupSubmit = async () => {
    clearError();
    if (!validateStep3()) return;
    setSubmitting(true);

    const { error } = await signup(name, email, password);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setErrorMsg("An account with this email already exists.");
      } else {
        setErrorMsg(error.message);
      }
      setSubmitting(false);
      return;
    }

    // Stash the collected profile/KYC data; it's persisted once the email OTP
    // is verified (a session is required for the profiles RLS policy).
    const kycDocuments = docs
      .filter((d) => d.file !== null)
      .map((d) => ({ type: d.type, file: d.file! }));

    setPendingProfile({
      phone:        phone || null,
      dateOfBirth:  dateOfBirth || null,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      city:         city || null,
      state:        stateVal || null,
      postalCode:   postalCode || null,
      country:      country || null,
      kycDocuments,
    });
    setOtp("");
    setAwaitingOtp(true);
    setSuccessMsg(`We sent a 6-digit code to ${email}. Enter it below to confirm your email.`);
    setSubmitting(false);
  };

  const handleVerifyOtp = async () => {
    clearError();
    if (otp.length !== 6) {
      setErrorMsg("Enter the full 6-digit code.");
      return;
    }
    setSubmitting(true);

    verifyingRef.current = true;
    const { error } = await verifyEmailOtp(email, otp, pendingProfile ?? undefined);
    verifyingRef.current = false;

    if (error) {
      setErrorMsg(
        error.message.toLowerCase().includes("expired") ||
        error.message.toLowerCase().includes("invalid")
          ? "Invalid or expired code. Request a new one and try again."
          : error.message
      );
      setSubmitting(false);
      return;
    }

    // Email confirmed — return to the sign-in screen.
    setAwaitingOtp(false);
    setPendingProfile(null);
    setOtp("");
    setMode("login");
    setStep(1);
    setPassword("");
    setSubmitting(false);
    setSuccessMsg(
      "Email confirmed! Your account will be reviewed before you can access your dashboard. Please sign in."
    );
  };

  const handleResendOtp = async () => {
    clearError();
    setSubmitting(true);
    const { error } = await resendEmailOtp(email);
    setSubmitting(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(`A new code has been sent to ${email}.`);
    }
  };

  const cancelVerification = () => {
    setAwaitingOtp(false);
    setPendingProfile(null);
    setOtp("");
    clearError();
    setSuccessMsg(null);
    setMode("login");
    setStep(1);
  };

  // ── Switch mode ───────────────────────────────────────────

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    clearError();
    setSuccessMsg(null);
    setStep(1);
    setAwaitingOtp(false); setOtp(""); setPendingProfile(null);
    setName(""); setEmail(""); setPassword("");
    setPhone(""); setDateOfBirth(""); setAddressLine1(""); setAddressLine2("");
    setCity(""); setStateVal(""); setPostalCode(""); setCountry("");
    setDocs(INITIAL_DOCS);
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background py-12">
      <div className="pointer-events-none absolute inset-0 bg-glow" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg px-6"
      >
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} /> Back to home
        </a>

        <div className="rounded border border-border/50 bg-gradient-card p-8 shadow-card">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {awaitingOtp ? "Confirm your email" : mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {awaitingOtp
                ? `Enter the 6-digit code we sent to ${email}`
                : mode === "login"
                ? "Sign in to access your accounts"
                : "Start your financial journey with Eccovault"}
            </p>
          </div>

          {/* Step indicator — signup only */}
          {mode === "signup" && !awaitingOtp && (
            <div className="mb-6 flex items-center justify-between">
              {STEPS.map((s, i) => {
                const n = i + 1;
                const active = step === n;
                const done   = step > n;
                return (
                  <div key={s.title} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                        done   ? "border-primary bg-primary text-primary-foreground" :
                        active ? "border-primary bg-primary/10 text-primary" :
                                 "border-border/50 bg-muted/30 text-muted-foreground"
                      }`}>
                        {done ? <CheckCircle2 size={14} /> : n}
                      </div>
                      <span className={`text-xs ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {s.title}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`mx-2 mb-4 h-px flex-1 transition-colors ${step > n ? "bg-primary/50" : "bg-border/30"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Alerts */}
          {successMsg && (
            <div className="mb-4 flex items-start gap-2 rounded border border-primary/30 bg-primary/5 p-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-xs text-foreground">{successMsg}</p>
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 p-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{errorMsg}</p>
            </div>
          )}

          {/* ── Email OTP verification ── */}
          {awaitingOtp && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="border-border/50 bg-muted/50 font-mono text-center text-lg tracking-[0.4em]"
                  disabled={submitting}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                />
              </div>
              <Button type="button" variant="hero" className="w-full" size="lg"
                onClick={handleVerifyOtp} disabled={submitting || otp.length !== 6}>
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Confirming…</>
                  : <><CheckCircle2 size={16} className="mr-2" /> Confirm email</>}
              </Button>
              <button type="button" onClick={handleResendOtp} disabled={submitting}
                className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
                Didn't receive it? Resend code.
              </button>
              <button type="button" onClick={cancelVerification} disabled={submitting}
                className="flex w-full items-center justify-center gap-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
                <ArrowLeft size={12} /> Use a different email
              </button>
            </div>
          )}

          {/* ── Login form ── */}
          {!awaitingOtp && mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting}
                  className="border-border/50 bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required disabled={submitting}
                  className="border-border/50 bg-muted/50" />
              </div>
              <Button type="submit" variant="hero" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign In"}
              </Button>
            </form>
          )}

          {/* ── Signup multi-step ── */}
          {!awaitingOtp && mode === "signup" && (
            <AnimatePresence mode="wait">
              {/* Step 1 — Credentials */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" autoComplete="name" placeholder="John Doe"
                      value={name} onChange={(e) => setName(e.target.value)} disabled={submitting}
                      className="border-border/50 bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-email">Email</Label>
                    <Input id="s-email" type="email" autoComplete="email" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting}
                      className="border-border/50 bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-password">Password</Label>
                    <Input id="s-password" type="password" autoComplete="new-password" placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting}
                      className="border-border/50 bg-muted/50" />
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  </div>
                  <Button type="button" variant="hero" className="w-full" size="lg" onClick={handleNext} disabled={submitting}>
                    Continue <ArrowRight size={16} className="ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2 — Personal details */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of birth</Label>
                      <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={submitting} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Street address</Label>
                    <Input placeholder="123 Main St" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} disabled={submitting} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address line 2 <span className="text-muted-foreground">(optional)</span></Label>
                    <Input placeholder="Apt, suite, unit…" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} disabled={submitting} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input placeholder="Austin" value={city} onChange={(e) => setCity(e.target.value)} disabled={submitting} />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input placeholder="TX" value={stateVal} onChange={(e) => setStateVal(e.target.value)} disabled={submitting} />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal code</Label>
                      <Input placeholder="12345" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={submitting} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input placeholder="United States" value={country} onChange={(e) => setCountry(e.target.value)} disabled={submitting} />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleBack} disabled={submitting}>
                      <ArrowLeft size={16} className="mr-2" /> Back
                    </Button>
                    <Button type="button" variant="hero" className="flex-1" onClick={handleNext} disabled={submitting}>
                      Continue <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3 — KYC documents */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload at least one government-issued identity document. Accepted formats: images or PDF.
                  </p>

                  <div className="space-y-3">
                    {docs.map((doc) => (
                      <div key={doc.type} className="rounded border border-border/40 bg-muted/30 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{doc.label}</span>
                          {doc.file && (
                            <button type="button" onClick={() => setDoc(doc.type, null)}
                              className="text-muted-foreground hover:text-destructive transition-colors">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {doc.file ? (
                          <div className="flex items-center gap-2 text-xs text-primary">
                            <CheckCircle2 size={13} />
                            <span className="truncate">{doc.file.name}</span>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-border/50 bg-background px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                            <Upload size={13} />
                            <span>Click to upload</span>
                            <input type="file" accept="image/*,.pdf" className="sr-only"
                              disabled={submitting}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setDoc(doc.type, f);
                                e.target.value = "";
                              }} />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleBack} disabled={submitting}>
                      <ArrowLeft size={16} className="mr-2" /> Back
                    </Button>
                    <Button type="button" variant="hero" className="flex-1" onClick={handleSignupSubmit}
                      disabled={submitting || !hasAtLeastOneDoc}>
                      {submitting
                        ? <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                        : "Create Account"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {!awaitingOtp && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={switchMode} disabled={submitting}
                className="font-medium text-primary hover:underline disabled:opacity-50">
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;

