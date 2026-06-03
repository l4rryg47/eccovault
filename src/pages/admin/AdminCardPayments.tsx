import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Check, X, Loader2, ChevronDown, ChevronUp,
  AlertCircle, Clock, CheckCircle2, XCircle, Copy,
} from "lucide-react";
import {
  useAdminCardPayments, useApproveCardPayment, useDeclineCardPayment,
  useRealtimeAdminCardPayments, type CardPayment,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

const FILTERS = ["All", "Pending", "Approved", "Declined"] as const;
type Filter = (typeof FILTERS)[number];

const StatusBadge = ({ status }: { status: CardPayment["status"] }) => {
  const cfg = {
    pending:  { label: "Pending",  cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", Icon: Clock        },
    approved: { label: "Approved", cls: "bg-primary/10 text-primary border-primary/20",          Icon: CheckCircle2 },
    declined: { label: "Declined", cls: "bg-destructive/10 text-destructive border-destructive/20", Icon: XCircle  },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  );
};

// ─── Visual card preview ──────────────────────────────────────

const MiniCard = ({ payment }: { payment: CardPayment }) => {
  const gradient =
    payment.card_type === "amex"       ? "from-[#2E77BC] to-[#1B4F8A]" :
    payment.card_type === "mastercard" ? "from-red-600/80 to-orange-400/80" :
                                          "from-primary/80 to-primary/40";
  return (
    <div className={`relative rounded-xl bg-gradient-to-br ${gradient} p-4 text-white shadow-lg w-44 shrink-0`}>
      <p className="text-xs opacity-60 uppercase tracking-widest">{payment.card_type}</p>
      <p className="mt-3 font-mono text-sm tracking-widest">•••• •••• •••• {payment.card_last_four}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-xs font-medium uppercase opacity-80 truncate max-w-[80px]">{payment.cardholder_name}</p>
        <p className="font-mono text-xs opacity-70">{payment.card_expiry}</p>
      </div>
    </div>
  );
};

// ─── Payment row ──────────────────────────────────────────────

const PaymentRow = ({ payment }: { payment: CardPayment }) => {
  const [expanded, setExpanded]     = useState(false);
  const [note, setNote]             = useState("");
  const [showDecline, setDecline]   = useState(false);

  const approve = useApproveCardPayment();
  const decline = useDeclineCardPayment();
  const isPending = payment.status === "pending";

  const handleApprove = () => {
    approve.mutate({ id: payment.id, note: note || undefined }, {
      onSuccess: () => toast.success(`${formatCurrency(payment.amount)} credited to user's account.`),
      onError:   (e: Error) => toast.error(e.message),
    });
  };

  const handleDecline = () => {
    if (!note.trim()) { toast.error("Enter a decline reason."); return; }
    decline.mutate({ id: payment.id, note }, {
      onSuccess: () => { toast.success("Payment declined."); setDecline(false); setNote(""); },
      onError:   (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className={`rounded border overflow-hidden ${
      isPending ? "border-yellow-500/20" : "border-border/40"
    } bg-gradient-card`}>
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        <CreditCard size={18} className={`shrink-0 ${isPending ? "text-yellow-500" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0 grid sm:grid-cols-4 gap-x-4 gap-y-1">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(payment.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Card</p>
            <p className="text-sm text-foreground">{payment.card_type.toUpperCase()} ****{payment.card_last_four}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="text-sm text-foreground">{formatDate(payment.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={payment.status} />
          </div>
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="shrink-0 text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="border-t border-border/20 p-4 space-y-5 overflow-hidden">

            <div className="flex gap-6 items-start">
              <MiniCard payment={payment} />
              <div className="flex-1 grid gap-2 text-sm">
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground">Cardholder</span>
                  <span className="font-medium text-foreground">{payment.cardholder_name}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground">Card Type</span>
                  <span className="capitalize text-foreground">{payment.card_type}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground">Expiry</span>
                  <span className="font-mono text-foreground">{payment.card_expiry}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">{formatCurrency(payment.amount)} {payment.currency}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-xs text-foreground flex items-center gap-1">
                    {payment.user_id.slice(0, 16)}…
                    <button onClick={() => { navigator.clipboard.writeText(payment.user_id); toast.success("Copied"); }}>
                      <Copy size={10} className="text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground">Account ID</span>
                  <span className="font-mono text-xs text-foreground flex items-center gap-1">
                    {payment.account_id.slice(0, 16)}…
                    <button onClick={() => { navigator.clipboard.writeText(payment.account_id); toast.success("Copied"); }}>
                      <Copy size={10} className="text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                </div>
                {payment.admin_note && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admin Note</span>
                    <span className="text-foreground text-right">{payment.admin_note}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {isPending && (
              <div className="space-y-3 border-t border-border/20 pt-4">
                <Input placeholder="Optional note for this action"
                  value={note} onChange={(e) => setNote(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground text-sm" />

                {!showDecline ? (
                  <div className="flex gap-3">
                    <Button variant="hero" size="sm" onClick={handleApprove}
                      disabled={approve.isPending || decline.isPending}>
                      {approve.isPending
                        ? <><Loader2 size={13} className="animate-spin" /> Approving…</>
                        : <><Check size={14} /> Approve & Credit Account</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDecline(true)}
                      disabled={approve.isPending || decline.isPending}
                      className="text-destructive hover:text-destructive border-destructive/30">
                      <X size={14} /> Decline
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input placeholder="Decline reason (required)"
                      value={note} onChange={(e) => setNote(e.target.value)}
                      className="border-destructive/30 bg-destructive/5 text-foreground text-sm" />
                    <div className="flex gap-3">
                      <Button size="sm" onClick={handleDecline}
                        disabled={decline.isPending || !note.trim()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {decline.isPending ? <><Loader2 size={13} className="animate-spin" /> Declining…</> : "Confirm Decline"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDecline(false); setNote(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 rounded bg-primary/5 p-3">
                  <AlertCircle size={13} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Approving will immediately credit {formatCurrency(payment.amount)} to the user's account.
                    Verify the card charge before approving.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────

const AdminCardPayments = () => {
  useRealtimeAdminCardPayments();

  const [filter, setFilter] = useState<Filter>("All");
  const statusParam = filter === "All" ? undefined : filter.toLowerCase();
  const { data: payments, isLoading } = useAdminCardPayments(statusParam);

  const pendingCount = payments?.filter((p) => p.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">Card Payments</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Review and process user card deposit requests.</p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}>{f}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : (payments?.length ?? 0) === 0 ? (
        <div className="rounded border border-dashed border-border/50 p-10 text-center">
          <CreditCard size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No {filter !== "All" ? filter.toLowerCase() : ""} payments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments!.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <PaymentRow payment={p} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCardPayments;
