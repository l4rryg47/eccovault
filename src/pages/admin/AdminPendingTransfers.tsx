import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight, Building2, Check, X, Loader2,
  Clock, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import {
  useAdminPendingTransfers, useAdminApproveTransfer, useAdminRejectTransfer,
  type AdminPendingTransfer,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

const FILTERS = ["Pending", "Approved", "Rejected", "All"] as const;
type Filter = (typeof FILTERS)[number];

const StatusBadge = ({ status }: { status: AdminPendingTransfer["status"] }) => {
  const cfg = {
    pending:  { label: "Pending",  cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", Icon: Clock        },
    approved: { label: "Approved", cls: "bg-primary/10 text-primary border-primary/20",          Icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/20", Icon: XCircle   },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  );
};

const TransferRow = ({ transfer }: { transfer: AdminPendingTransfer }) => {
  const [note, setNote]           = useState("");
  const [showReject, setReject]   = useState(false);

  const approve = useAdminApproveTransfer();
  const reject  = useAdminRejectTransfer();
  const isPending = transfer.status === "pending";
  const isExternal = transfer.transfer_type === "external";
  const insufficient = transfer.from_account_balance < transfer.amount;

  const destination = isExternal
    ? `${transfer.beneficiary_name ?? "—"}${transfer.bank_name ? ` · ${transfer.bank_name}` : ""}`
    : (transfer.to_account_name ?? "—");

  const handleApprove = () => {
    approve.mutate(transfer.id, {
      onSuccess: () => toast.success(`Transfer approved. ${formatCurrency(transfer.amount)} moved.`),
      onError:   (e: Error) => toast.error(e.message),
    });
  };

  const handleReject = () => {
    reject.mutate({ id: transfer.id, note: note || undefined }, {
      onSuccess: () => { toast.success("Transfer rejected. No funds were moved."); setReject(false); setNote(""); },
      onError:   (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className={`rounded border overflow-hidden ${isPending ? "border-yellow-500/20" : "border-border/40"} bg-gradient-card`}>
      <div className="flex items-center gap-4 p-4">
        {isExternal
          ? <Building2 size={18} className={`shrink-0 ${isPending ? "text-yellow-500" : "text-muted-foreground"}`} />
          : <ArrowLeftRight size={18} className={`shrink-0 ${isPending ? "text-yellow-500" : "text-muted-foreground"}`} />}
        <div className="flex-1 min-w-0 grid gap-x-4 gap-y-1 sm:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(transfer.amount)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="truncate text-sm text-foreground">{transfer.user_full_name ?? transfer.user_email ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{transfer.from_account_name} · ****{transfer.from_account_number}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{isExternal ? "To (external)" : "To"}</p>
            <p className="truncate text-sm text-foreground">{destination}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="text-sm text-foreground">{formatDate(transfer.created_at)}</p>
            <p className="font-mono text-xs text-muted-foreground">{transfer.reference}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={transfer.status} />
          </div>
        </div>
      </div>

      {(transfer.note || isPending || transfer.review_note) && (
        <div className="border-t border-border/20 p-4 space-y-3">
          {transfer.note && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">User note:</span> {transfer.note}
            </p>
          )}
          {transfer.review_note && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Rejection reason:</span> {transfer.review_note}
            </p>
          )}

          {isPending && (
            <>
              {insufficient && (
                <div className="flex items-start gap-2 rounded bg-destructive/5 p-3">
                  <AlertCircle size={13} className="mt-0.5 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">
                    Source balance ({formatCurrency(transfer.from_account_balance)}) is now below the transfer amount. Approval will fail until funded.
                  </p>
                </div>
              )}

              {!showReject ? (
                <div className="flex gap-3">
                  <Button variant="hero" size="sm" onClick={handleApprove}
                    disabled={approve.isPending || reject.isPending}>
                    {approve.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Approving…</>
                      : <><Check size={14} /> Approve &amp; Move Funds</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setReject(true)}
                    disabled={approve.isPending || reject.isPending}
                    className="border-destructive/30 text-destructive hover:text-destructive">
                    <X size={14} /> Reject
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Rejection reason (optional, shown to no one)"
                    value={note} onChange={(e) => setNote(e.target.value)}
                    className="border-destructive/30 bg-destructive/5 text-foreground text-sm" />
                  <div className="flex gap-3">
                    <Button size="sm" onClick={handleReject} disabled={reject.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {reject.isPending ? <><Loader2 size={13} className="animate-spin" /> Rejecting…</> : "Confirm Reject"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setReject(false); setNote(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const AdminPendingTransfers = () => {
  const [filter, setFilter] = useState<Filter>("Pending");
  const { data: transfers, isLoading } = useAdminPendingTransfers();

  const pendingCount = transfers?.filter((t) => t.status === "pending").length ?? 0;

  const filtered = useMemo(() => {
    if (!transfers) return [];
    if (filter === "All") return transfers;
    return transfers.filter((t) => t.status === filter.toLowerCase());
  }, [transfers, filter]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">Transfer Reviews</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Approve or reject user transfers. Funds only move when you approve.
        </p>
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
      ) : filtered.length === 0 ? (
        <div className="rounded border border-dashed border-border/50 p-10 text-center">
          <ArrowLeftRight size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No {filter !== "All" ? filter.toLowerCase() : ""} transfers found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <TransferRow transfer={t} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPendingTransfers;
