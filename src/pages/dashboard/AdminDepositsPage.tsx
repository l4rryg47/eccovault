import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check, X, Loader2, RefreshCw, Clock,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Copy, Shield,
} from "lucide-react";
import {
  useAdminDeposits, useApproveDeposit, useRejectDeposit,
  useIsAdmin, useRealtimeAdminDeposits, type CryptoDeposit, type DepositStatus,
} from "@/hooks/useDeposits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

// ─── Status badge ─────────────────────────────────────────────

const StatusBadge = ({ status }: { status: DepositStatus }) => {
  const map: Record<DepositStatus, { label: string; className: string }> = {
    pending:    { label: "Pending",    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    confirming: { label: "Confirming", className: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
    confirmed:  { label: "Confirmed",  className: "bg-primary/10 text-primary border-primary/20" },
    credited:   { label: "Credited",   className: "bg-primary/10 text-primary border-primary/20" },
    expired:    { label: "Expired",    className: "bg-muted text-muted-foreground border-border/30" },
    rejected:   { label: "Rejected",   className: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
};

// ─── Individual deposit row ───────────────────────────────────

const DepositRow = ({ deposit }: { deposit: CryptoDeposit }) => {
  const [expanded, setExpanded]   = useState(false);
  const [note, setNote]           = useState("");
  const [showReject, setShowReject] = useState(false);

  const approve = useApproveDeposit();
  const reject  = useRejectDeposit();

  const canAct = ["pending", "confirming", "confirmed"].includes(deposit.status);

  const handleApprove = () => {
    approve.mutate(
      { depositId: deposit.id, note: note || undefined },
      {
        onSuccess: () => toast.success(`Deposit approved — ${formatCurrency(deposit.usd_amount)} credited.`),
        onError:   (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleReject = () => {
    if (!note.trim()) { toast.error("Please enter a rejection reason."); return; }
    reject.mutate(
      { depositId: deposit.id, note },
      {
        onSuccess: () => { toast.success("Deposit rejected."); setShowReject(false); setNote(""); },
        onError:   (e: Error) => toast.error(e.message),
      }
    );
  };

  const copyValue = async (v: string) => {
    await navigator.clipboard.writeText(v);
    toast.success("Copied");
  };

  return (
    <div className="rounded border border-border/40 bg-gradient-card overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(deposit.usd_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Crypto</p>
            <p className="text-sm font-medium text-foreground">
              {deposit.crypto_amount?.toFixed(4)} {deposit.crypto_currency}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm text-foreground">{formatDate(deposit.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={deposit.status} />
          </div>
        </div>
        <button onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/20 p-4 space-y-4">
          {/* Detail grid */}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Deposit ID</p>
              <div className="flex items-center gap-1 font-mono text-xs text-foreground">
                {deposit.id}
                <button onClick={() => copyValue(deposit.id)}><Copy size={10} className="text-muted-foreground hover:text-foreground" /></button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <div className="flex items-center gap-1 font-mono text-xs text-foreground">
                {deposit.user_id}
                <button onClick={() => copyValue(deposit.user_id)}><Copy size={10} className="text-muted-foreground hover:text-foreground" /></button>
              </div>
            </div>
            {deposit.payment_id && (
              <div>
                <p className="text-xs text-muted-foreground">Payment ID (NexaPay)</p>
                <p className="font-mono text-xs text-foreground">{deposit.payment_id}</p>
              </div>
            )}
            {deposit.crypto_address && (
              <div>
                <p className="text-xs text-muted-foreground">Crypto Address</p>
                <div className="flex items-center gap-1 font-mono text-xs text-foreground break-all">
                  {deposit.crypto_address}
                  <button onClick={() => copyValue(deposit.crypto_address!)}><Copy size={10} className="text-muted-foreground hover:text-foreground shrink-0" /></button>
                </div>
              </div>
            )}
            {deposit.tx_hash && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Tx Hash</p>
                <div className="flex items-center gap-1 font-mono text-xs text-foreground break-all">
                  {deposit.tx_hash}
                  <button onClick={() => copyValue(deposit.tx_hash!)}><Copy size={10} className="text-muted-foreground hover:text-foreground shrink-0" /></button>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Confirmations</p>
              <p className="text-xs text-foreground">{deposit.confirmations}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="text-xs text-foreground">{new Date(deposit.expires_at).toLocaleString()}</p>
            </div>
            {deposit.admin_note && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Admin Note</p>
                <p className="text-xs text-foreground">{deposit.admin_note}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {canAct && (
            <div className="space-y-3 border-t border-border/20 pt-4">
              <div className="flex items-center gap-2">
                <Input placeholder="Optional note (shown to user on approval)"
                  value={note} onChange={(e) => setNote(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground text-sm" />
              </div>

              {!showReject ? (
                <div className="flex gap-3">
                  <Button variant="hero" size="sm" onClick={handleApprove}
                    disabled={approve.isPending || reject.isPending}>
                    {approve.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Approving…</>
                      : <><Check size={14} /> Approve & Credit</>}
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={() => setShowReject(true)}
                    disabled={approve.isPending || reject.isPending}
                    className="text-destructive hover:text-destructive border-destructive/30">
                    <X size={14} /> Reject
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Rejection reason (required)"
                    value={note} onChange={(e) => setNote(e.target.value)}
                    className="border-destructive/30 bg-destructive/5 text-foreground text-sm" />
                  <div className="flex gap-3">
                    <Button size="sm" onClick={handleReject}
                      disabled={reject.isPending || !note.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {reject.isPending ? <><Loader2 size={13} className="animate-spin" /> Rejecting…</> : "Confirm Reject"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowReject(false); setNote(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Already processed */}
          {deposit.status === "credited" && (
            <div className="flex items-center gap-2 rounded border border-primary/20 bg-primary/5 p-3">
              <CheckCircle2 size={15} className="text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Credited {deposit.credited_at ? `on ${new Date(deposit.credited_at).toLocaleString()}` : ""}
                {deposit.admin_note ? ` — ${deposit.admin_note}` : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Filter tabs ──────────────────────────────────────────────

const FILTERS: { label: string; value: DepositStatus | undefined }[] = [
  { label: "All",        value: undefined     },
  { label: "Pending",    value: "pending"     },
  { label: "Confirming", value: "confirming"  },
  { label: "Confirmed",  value: "confirmed"   },
  { label: "Credited",   value: "credited"    },
  { label: "Rejected",   value: "rejected"    },
];

// ─── Main admin page ──────────────────────────────────────────

const AdminDepositsPage = () => {
  useRealtimeAdminDeposits();

  const { data: isAdmin, isLoading: adminChecking } = useIsAdmin();
  const [filter, setFilter] = useState<DepositStatus | undefined>(undefined);
  const { data: deposits, isLoading, error, refetch, isFetching } = useAdminDeposits(filter);

  if (adminChecking) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <Shield size={24} className="text-destructive" />
        </div>
        <p className="font-display text-lg font-semibold text-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          This page is restricted to administrators. If you should have access,
          ask an existing admin to add your user ID to the admins table.
        </p>
      </div>
    );
  }

  const pendingCount = deposits?.filter((d) => ["pending","confirming","confirmed"].includes(d.status)).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Deposit Queue</h1>
            {pendingCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Review and approve incoming crypto deposits.</p>
        </div>
        <button onClick={() => refetch()}
          className={`flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground ${isFetching ? "opacity-50" : ""}`}>
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.label} onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Warning: mock mode */}
      <div className="flex items-start gap-2 rounded border border-yellow-500/30 bg-yellow-500/5 p-3">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-yellow-500" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Manual review mode.</span>{" "}
          NexaPay webhooks are not yet wired — deposits will show as{" "}
          <span className="font-mono">pending</span> until you approve them here.
          Verify payment on the blockchain before approving.
        </p>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle size={15} className="text-destructive" />
          <p className="text-sm text-destructive">Failed to load deposits.</p>
        </div>
      )}

      {!isLoading && (deposits?.length ?? 0) === 0 && (
        <div className="rounded border border-dashed border-border/50 p-10 text-center">
          <Clock size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No deposits found for this filter.</p>
        </div>
      )}

      {!isLoading && deposits && deposits.length > 0 && (
        <div className="space-y-3">
          {deposits.map((dep, i) => (
            <motion.div key={dep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <DepositRow deposit={dep} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDepositsPage;
