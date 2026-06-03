import { useEffect, useState } from "react";
import { Search, Wallet, Loader2, ArrowDownLeft, Trash2, Shield, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdminAllAccounts, useAdminAdjustBalance, useAdminUpdateAccount, useAdminDeleteAccount } from "@/hooks/useAdmin";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const AdminAccounts = () => {
  const { data: accounts, isLoading } = useAdminAllAccounts();
  const adjust = useAdminAdjustBalance();

  const [search, setSearch]           = useState("");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [adjAmount, setAdjAmount]     = useState("");
  const [adjType, setAdjType]         = useState<"credit" | "debit">("credit");
  const [adjNote, setAdjNote]         = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [accountState, setAccountState] = useState<"active"|"inactive"|"frozen"|"on_hold"|"suspended">("active");
  const [transactionLimit, setTransactionLimit] = useState<string>("");
  const [requiresTransferOtp, setRequiresTransferOtp] = useState(false);
  const [holdReason, setHoldReason] = useState("");

  const filtered = (accounts ?? []).filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.account_number.includes(search) ||
      a.user_id.includes(search);
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const selectedAccount = selectedId ? filtered.find((a) => a.id === selectedId) : undefined;

  useEffect(() => {
    if (!selectedAccount) return;
    setAccountState(selectedAccount.account_state ?? "active");
    setTransactionLimit(selectedAccount.transaction_limit?.toString() ?? "");
    setRequiresTransferOtp(selectedAccount.requires_transfer_otp ?? false);
    setHoldReason(selectedAccount.hold_reason ?? "");
  }, [selectedAccount]);

  const handleAdjust = () => {
    if (!selectedId || !adjAmount) return;
    const amt = parseFloat(adjAmount) * (adjType === "debit" ? -1 : 1);
    adjust.mutate({ accountId: selectedId, amount: amt, note: adjNote || undefined }, {
      onSuccess: (r) => {
        toast.success(`Done. New balance: ${formatCurrency(r.new_balance)}`);
        setAdjAmount(""); setAdjNote(""); setSelectedId(null);
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">All Accounts</h1>
        <p className="text-sm text-muted-foreground">{accounts?.length ?? 0} accounts across all users.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, number, user ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="border-border/50 bg-muted/50 pl-10 text-foreground" />
        </div>
        <div className="flex gap-2">
          {["all", "checking", "savings", "investment", "credit"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Balance adjustment panel */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded border border-primary/30 bg-primary/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Adjust Balance — {filtered.find((a) => a.id === selectedId)?.name}
              </h3>
              <button onClick={() => setSelectedId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-foreground">Type</Label>
                <div className="flex gap-2">
                  {(["credit", "debit"] as const).map((t) => (
                    <button key={t} onClick={() => setAdjType(t)}
                      className={`flex-1 rounded border py-1.5 text-xs font-medium transition-colors ${
                        adjType === t ? "border-primary bg-primary/10 text-primary" : "border-border/40 bg-muted/30 text-muted-foreground"
                      }`}>
                      {t === "credit" ? "+ Credit" : "− Debit"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Amount</Label>
                <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                  value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)}
                  className="border-border/50 bg-background text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Note</Label>
                <Input placeholder="Optional reason"
                  value={adjNote} onChange={(e) => setAdjNote(e.target.value)}
                  className="border-border/50 bg-background text-foreground" />
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={handleAdjust} disabled={adjust.isPending || !adjAmount}>
              {adjust.isPending ? <><Loader2 size={13} className="animate-spin" /> Applying…</> : "Apply Adjustment"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-dashed border-border/50 p-10 text-center">
          <Wallet size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No accounts found.</p>
        </div>
      ) : (
        <div className="rounded border border-border/40 overflow-hidden">
          <div className="grid grid-cols-5 gap-4 border-b border-border/20 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="col-span-2">Account</span>
            <span>Type</span>
            <span>Status</span>
            <span className="text-right">Balance</span>
          </div>
          {filtered.map((a, i) => (
            <div key={a.id}
              className={`grid grid-cols-5 gap-4 items-center px-4 py-3 transition-colors hover:bg-muted/20 ${
                i !== filtered.length - 1 ? "border-b border-border/20" : ""
              } ${selectedId === a.id ? "bg-primary/5" : ""}`}>
              <div className="col-span-2 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                <p className="font-mono text-xs text-muted-foreground">****{a.account_number.slice(-4)}</p>
              </div>
              <span className="text-xs text-muted-foreground capitalize">{a.type}</span>
              <span className={`text-xs font-medium capitalize ${
                a.status === "active" ? "text-primary" : "text-muted-foreground"
              }`}>{a.status}</span>
              <div className="flex items-center justify-end gap-2">
                <p className={`text-sm font-bold ${a.balance < 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatCurrency(a.balance)}
                </p>
                <button
                  onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                  title="Adjust balance"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <ArrowDownLeft size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAccounts;
