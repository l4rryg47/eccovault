import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, ChevronLeft, Copy, Loader2,
  Clock, AlertCircle, CheckCircle2, XCircle,
  RefreshCw, Coins, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/hooks/useSupabase";
import {
  useCreateDeposit, useCryptoDeposits,
  useRealtimeDeposits, type CryptoDeposit, type DepositStatus,
} from "@/hooks/useDeposits";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

// ─── Status display config ────────────────────────────────────

const STATUS_CONFIG: Record<DepositStatus, {
  label: string; color: string; icon: React.ElementType; desc: string;
}> = {
  pending: {
    label: "Awaiting Payment",
    color: "text-yellow-500",
    icon:  Clock,
    desc:  "Send the exact crypto amount to the address below. Your account will be credited once confirmed.",
  },
  confirming: {
    label: "Confirming",
    color: "text-blue-400",
    icon:  RefreshCw,
    desc:  "Payment detected. Waiting for blockchain confirmations.",
  },
  confirmed: {
    label: "Payment Confirmed",
    color: "text-primary",
    icon:  CheckCircle2,
    desc:  "Your payment is confirmed. Our team is processing the credit to your account.",
  },
  credited: {
    label: "Credited",
    color: "text-primary",
    icon:  Check,
    desc:  "Funds have been credited to your account.",
  },
  expired: {
    label: "Expired",
    color: "text-muted-foreground",
    icon:  XCircle,
    desc:  "This deposit request expired without payment. Please create a new one.",
  },
  rejected: {
    label: "Rejected",
    color: "text-destructive",
    icon:  XCircle,
    desc:  "This deposit was not processed. Please contact support.",
  },
};

// ─── Copy button ──────────────────────────────────────────────

const CopyBtn = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle}
      className="ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      {copied ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

// ─── Deposit status card ──────────────────────────────────────

const DepositStatusCard = ({ deposit }: { deposit: CryptoDeposit }) => {
  const cfg  = STATUS_CONFIG[deposit.status];
  const Icon = cfg.icon;
  const isActive = ["pending", "confirming"].includes(deposit.status);

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded border p-4 ${
        deposit.status === "credited"   ? "border-primary/30 bg-primary/5" :
        deposit.status === "rejected"   ? "border-destructive/30 bg-destructive/5" :
        deposit.status === "expired"    ? "border-border/30 bg-muted/20" :
        "border-yellow-500/30 bg-yellow-500/5"
      }`}>
        <Icon size={20} className={`shrink-0 ${cfg.color} ${isActive && deposit.status === "confirming" ? "animate-spin" : ""}`} />
        <div>
          <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-xs text-muted-foreground">{cfg.desc}</p>
        </div>
      </div>

      {/* Payment details — shown while pending */}
      {deposit.status === "pending" && deposit.crypto_address && (
        <div className="space-y-3 rounded border border-border/40 bg-gradient-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Send exactly</span>
            <div className="flex items-center font-mono text-sm font-bold text-foreground">
              {deposit.crypto_amount?.toFixed(6)} {deposit.crypto_currency}
              <CopyBtn value={deposit.crypto_amount?.toFixed(6) ?? ""} />
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 text-xs text-muted-foreground">To address</span>
            <div className="flex items-start">
              <span className="break-all font-mono text-xs text-foreground">
                {deposit.crypto_address}
              </span>
              <CopyBtn value={deposit.crypto_address} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Network</span>
            <span className="text-xs font-medium text-foreground">
              {deposit.crypto_currency === "BTC" ? "Bitcoin" : "ERC-20 / TRC-20"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">USD value</span>
            <span className="text-xs font-medium text-foreground">
              {formatCurrency(deposit.usd_amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Expires</span>
            <span className="text-xs text-muted-foreground">
              {new Date(deposit.expires_at).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-start gap-2 rounded bg-yellow-500/5 border border-yellow-500/20 p-3">
            <AlertCircle size={13} className="mt-0.5 shrink-0 text-yellow-500" />
            <p className="text-xs text-muted-foreground">
              Send the <strong>exact</strong> amount shown. Sending a different amount
              may delay processing. Funds are credited after admin review.
            </p>
          </div>
        </div>
      )}

      {/* Tx hash — shown once confirming */}
      {deposit.tx_hash && (
        <div className="flex items-start justify-between gap-4 rounded border border-border/30 bg-muted/20 p-4">
          <span className="shrink-0 text-xs text-muted-foreground">Tx Hash</span>
          <div className="flex items-start">
            <span className="break-all font-mono text-xs text-foreground">{deposit.tx_hash}</span>
            <CopyBtn value={deposit.tx_hash} />
          </div>
        </div>
      )}

      {/* Admin note on rejection */}
      {deposit.status === "rejected" && deposit.admin_note && (
        <div className="rounded border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">Reason: {deposit.admin_note}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Ref: {deposit.id.slice(0, 8).toUpperCase()}</span>
        <span>{formatDate(deposit.created_at)}</span>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────

type Step = "account" | "currency" | "amount" | "review" | "pending";

const CURRENCIES = [
  { value: "USDT", label: "USDT", desc: "Tether — most stable, lowest fees" },
  { value: "USDC", label: "USDC", desc: "USD Coin — fully regulated stablecoin" },
  { value: "BTC",  label: "BTC",  desc: "Bitcoin — higher value, slower confirmation" },
];

const CryptoDepositPage = () => {
  useRealtimeDeposits();

  const { data: accounts } = useAccounts();
  const { data: deposits, isLoading: depositsLoading } = useCryptoDeposits();
  const createDeposit = useCreateDeposit();

  const [step, setStep]             = useState<Step>("account");
  const [accountId, setAccountId]   = useState<string | null>(null);
  const [currency, setCurrency]     = useState("USDT");
  const [amount, setAmount]         = useState("");
  const [activeDeposit, setActive]  = useState<CryptoDeposit | null>(null);
  const [viewingId, setViewingId]   = useState<string | null>(null);

  const sendable  = (accounts ?? []).filter((a) => a.type !== "credit" && a.status === "active");
  const account   = accounts?.find((a) => a.id === accountId);
  const parsed    = parseFloat(amount) || 0;

  const MIN_DEPOSIT = 10;
  const MAX_DEPOSIT = 50_000;

  const handleCreate = async () => {
    if (!accountId || parsed < MIN_DEPOSIT) return;
    createDeposit.mutate(
      { accountId, usdAmount: parsed, currency },
      {
        onSuccess: (dep) => {
          setActive(dep);
          setStep("pending");
          toast.success("Deposit request created. Send your crypto to the address shown.");
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const reset = () => {
    setStep("account");
    setAccountId(null);
    setCurrency("USDT");
    setAmount("");
    setActive(null);
    setViewingId(null);
  };

  const stepOrder: Step[] = ["account", "currency", "amount", "review"];
  const stepLabels = ["Account", "Currency", "Amount", "Review"];
  const currentIdx = stepOrder.indexOf(step);

  // ── Viewing a past deposit ──
  const viewingDeposit = viewingId
    ? deposits?.find((d) => d.id === viewingId) ?? null
    : null;

  if (viewingDeposit) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewingId(null)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-display text-2xl font-bold text-foreground">Deposit Details</h1>
        </div>
        <DepositStatusCard deposit={viewingDeposit} />
        <Button variant="outline" className="w-full" onClick={() => setViewingId(null)}>
          Back to Deposits
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Crypto Deposit</h1>
        <p className="text-sm text-muted-foreground">
          Top up your account by paying with crypto. Funds are credited after confirmation.
        </p>
      </div>

      {/* ── New deposit flow ── */}
      <div className="space-y-6">
        {step !== "pending" && (
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => {
              const isDone   = currentIdx > i;
              const isActive = currentIdx === i;
              return (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors ${
                    isDone   ? "bg-primary text-primary-foreground" :
                    isActive ? "bg-primary/20 text-primary" :
                               "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? <Check size={13} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${isActive || isDone ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {i < stepLabels.length - 1 && <div className="h-px flex-1 bg-border" />}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* Step 1: Account */}
          {step === "account" && (
            <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              <p className="text-sm font-medium text-foreground">Credit funds to which account?</p>
              {sendable.map((a) => (
                <button key={a.id} onClick={() => { setAccountId(a.id); setStep("currency"); }}
                  className={`flex w-full items-center gap-3 rounded border p-3 text-left transition-all ${
                    accountId === a.id ? "border-primary bg-primary/5" : "border-border/40 bg-gradient-card hover:border-primary/30"
                  }`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 text-sm font-bold text-primary">
                    {a.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{a.type}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(a.balance)}</p>
                  <ArrowRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </motion.div>
          )}

          {/* Step 2: Currency */}
          {step === "currency" && (
            <motion.div key="currency" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
              <button onClick={() => setStep("account")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft size={16} /> Back
              </button>
              <p className="text-sm font-medium text-foreground">Pay with which crypto?</p>
              <div className="space-y-2">
                {CURRENCIES.map((c) => (
                  <button key={c.value} onClick={() => { setCurrency(c.value); setStep("amount"); }}
                    className={`flex w-full items-center gap-4 rounded border p-4 text-left transition-all ${
                      currency === c.value ? "border-primary bg-primary/5" : "border-border/40 bg-gradient-card hover:border-primary/30"
                    }`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Coins size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                    {currency === c.value && <Check size={16} className="ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Amount */}
          {step === "amount" && (
            <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <button onClick={() => setStep("currency")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft size={16} /> Back
              </button>
              <div className="text-center">
                <p className="mb-2 text-xs text-muted-foreground">Amount to deposit (USD)</p>
                <div className="relative mx-auto max-w-xs">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" min={MIN_DEPOSIT} step="0.01" autoFocus
                    className="w-full rounded border border-border/50 bg-muted/30 py-4 pl-12 pr-4 text-center font-display text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Min ${MIN_DEPOSIT} · Max ${MAX_DEPOSIT.toLocaleString()}
                </p>
                {parsed > 0 && parsed < MIN_DEPOSIT && (
                  <p className="mt-1 text-xs text-destructive">Minimum deposit is ${MIN_DEPOSIT}</p>
                )}
              </div>
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setAmount(v.toString())}
                    className={`flex-1 rounded border py-2 text-xs font-medium transition-colors ${
                      amount === v.toString() ? "border-primary bg-primary/10 text-primary"
                        : "border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}>
                    ${v.toLocaleString()}
                  </button>
                ))}
              </div>
              <Button variant="hero" className="w-full" size="lg"
                disabled={!amount || parsed < MIN_DEPOSIT || parsed > MAX_DEPOSIT}
                onClick={() => setStep("review")}>
                Review <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === "review" && account && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <button onClick={() => setStep("amount")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft size={16} /> Back
              </button>
              <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold text-foreground text-center">Confirm Deposit</h2>
                <p className="font-display text-4xl font-bold text-gradient text-center">{formatCurrency(parsed)}</p>
                <div className="space-y-3">
                  {[
                    { label: "Credit to",    value: account.name },
                    { label: "Pay with",     value: currency },
                    { label: "USD amount",   value: formatCurrency(parsed) },
                    { label: "Processing",   value: "Admin review (typically < 24h)" },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between border-b border-border/20 pb-2">
                      <span className="text-sm text-muted-foreground">{r.label}</span>
                      <span className="text-sm font-medium text-foreground">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 rounded bg-primary/5 p-3">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    A crypto address will be generated. Send the exact amount shown.
                    Funds are credited after our team confirms receipt.
                  </p>
                </div>
                <Button variant="hero" className="w-full" size="lg"
                  onClick={handleCreate} disabled={createDeposit.isPending}>
                  {createDeposit.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Creating…</>
                    : "Generate Payment Address"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Pending / status screen */}
          {step === "pending" && activeDeposit && (
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="space-y-6">
              <DepositStatusCard deposit={activeDeposit} />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  New Deposit
                </Button>
                <Button variant="heroOutline" className="flex-1" onClick={() => window.history.back()}>
                  Dashboard
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Past deposits ── */}
      {step !== "pending" && (
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Deposits</h2>
          {depositsLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={22} />
            </div>
          ) : (deposits?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No deposits yet.</p>
          ) : (
            <div className="space-y-2">
              {deposits!.map((dep) => {
                const cfg  = STATUS_CONFIG[dep.status];
                const Icon = cfg.icon;
                return (
                  <button key={dep.id} onClick={() => setViewingId(dep.id)}
                    className="flex w-full items-center gap-4 rounded border border-border/40 bg-gradient-card p-4 text-left transition-all hover:border-primary/20">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted ${cfg.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(dep.usd_amount)} via {dep.crypto_currency}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(dep.created_at)}</p>
                    </div>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CryptoDepositPage;
