import { motion } from "framer-motion";
import { Clock, ShieldAlert, Snowflake, PauseCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, type ApprovalStatus } from "@/contexts/AuthContext";

const STATUS_CONFIG: Record<
  Exclude<ApprovalStatus, "approved">,
  { icon: React.ElementType; color: string; badge: string; heading: string; body: string }
> = {
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    badge: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500",
    heading: "Your account is under review",
    body: "We're verifying your identity documents. This usually takes 1–2 business days. You'll be able to access your dashboard once approved.",
  },
  suspended: {
    icon: ShieldAlert,
    color: "text-orange-500",
    badge: "bg-orange-500/10 border-orange-500/30 text-orange-500",
    heading: "Your account has been suspended",
    body: "Your account has been temporarily suspended. Please contact support if you believe this is a mistake.",
  },
  frozen: {
    icon: Snowflake,
    color: "text-blue-500",
    badge: "bg-blue-500/10 border-blue-500/30 text-blue-500",
    heading: "Your account is frozen",
    body: "Your account has been frozen pending further review. Please contact support for assistance.",
  },
  on_hold: {
    icon: PauseCircle,
    color: "text-muted-foreground",
    badge: "bg-muted/50 border-border/50 text-muted-foreground",
    heading: "Your account is on hold",
    body: "Your account is temporarily on hold. Our team is reviewing your information and will reach out shortly.",
  },
};

const PendingApprovalPage = () => {
  const { profile, logout } = useAuth();
  const status = (profile?.approval_status ?? "pending") as Exclude<ApprovalStatus, "approved">;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="pointer-events-none absolute inset-0 bg-glow" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-bold text-foreground">Eccovault</span>
        </div>

        <div className="rounded border border-border/50 bg-gradient-card p-8 shadow-card text-center space-y-6">
          {/* Icon */}
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${cfg.badge}`}>
            <Icon size={28} className={cfg.color} />
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.color.replace("text-", "bg-")}`} />
            {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="font-display text-xl font-bold text-foreground">{cfg.heading}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{cfg.body}</p>
          </div>

          {/* User info */}
          {profile?.email && (
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{profile.email}</span>
            </p>
          )}

          {/* Sign out */}
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut size={15} className="mr-2" /> Sign out
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PendingApprovalPage;

