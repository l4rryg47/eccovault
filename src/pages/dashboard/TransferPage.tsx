import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight, Check, ChevronLeft, Search, DollarSign,
  AlertCircle, Loader2, ArrowLeftRight, Building2,
  User, Plus, Star, Trash2, ArrowDownLeft, RefreshCw, KeyRound, Clock,
} from "lucide-react";
import {
  useAccounts, useTransfer, useRealtimeAccounts,
  useBeneficiaries, useAddBeneficiary, useDeleteBeneficiary,
  useSendExternalTransfer, useDeposit, useCustomMessages,
} from "@/hooks/useSupabase";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

// ─── Transfer mode ────────────────────────────────────────────

const DEFAULT_PENDING_MESSAGE =
  "Your transfer has been submitted and is now pending review. Funds will be released once it has been approved by our team.";

type TransferMode = "own" | "external" | "deposit";
type OwnStep     = "from" | "to"   | "amount"  | "confirm" | "success";
type ExtStep     = "mode" | "recipient" | "details" | "amount" | "confirm" | "success";

// ─── Small reusable components ────────────────────────────────

const AccountRow = ({
  account, onClick, selected = false,
}: {
  account: { id: string; name: string; type: string; balance: number; account_number: string; status: string };
  onClick?: () => void;
  selected?: boolean;
}) => (
  <button onClick={onClick}
    className={`flex w-full items-center gap-3 rounded border p-3 text-left transition-all ${
      selected ? "border-primary bg-primary/5" : "border-border/40 bg-gradient-card hover:border-primary/30"
    }`}>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 font-display text-sm font-bold text-primary">
      {account.name.slice(0, 2).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{account.name}</p>
      <p className="text-xs text-muted-foreground capitalize">{account.type} · ****{account.account_number}</p>
    </div>
    <p className="text-sm font-semibold text-foreground">{formatCurrency(account.balance)}</p>
    {onClick && <ArrowRight size={16} className="shrink-0 text-muted-foreground" />}
  </button>
);

// ─── Progress bar ─────────────────────────────────────────────

const ProgressBar = ({
  steps, current,
}: { steps: string[]; current: number }) => (
  <div className="flex items-center gap-2">
    {steps.map((label, i) => {
      const isDone   = current > i;
      const isActive = current === i;
      return (
        <div key={label} className="flex flex-1 items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors ${
            isDone ? "bg-primary text-primary-foreground" :
            isActive ? "bg-primary/20 text-primary" :
            "bg-muted text-muted-foreground"
          }`}>
            {isDone ? <Check size={14} /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${isActive || isDone ? "text-foreground" : "text-muted-foreground"}`}>
            {label}
          </span>
          {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
        </div>
      );
    })}
  </div>
);

// ─── Amount input panel ───────────────────────────────────────

const AmountInput = ({
  amount, onChange, availableBalance, label = "Enter amount",
}: {
  amount: string;
  onChange: (v: string) => void;
  availableBalance: number;
  label?: string;
}) => {
  const parsed   = parseFloat(amount) || 0;
  const overLimit = parsed > availableBalance;
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="mb-2 text-xs text-muted-foreground">{label}</p>
        <div className="relative mx-auto max-w-xs">
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
          <input
            type="number" value={amount} onChange={(e) => onChange(e.target.value)}
            placeholder="0.00" min="0.01" step="0.01" autoFocus
            className="w-full rounded border border-border/50 bg-muted/30 py-4 pl-12 pr-4 text-center font-display text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <p className={`mt-2 text-xs ${overLimit ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          Available: {formatCurrency(availableBalance)}
          {overLimit && " — Insufficient funds"}
        </p>
      </div>
      <div className="flex gap-2">
        {[50, 100, 250, 500, 1000].map((v) => (
          <button key={v} onClick={() => onChange(v.toString())}
            className={`flex-1 rounded border py-2 text-xs font-medium transition-colors ${
              amount === v.toString() ? "border-primary bg-primary/10 text-primary"
                : "border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}>
            ${v}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────

const TransferPage = () => {
  useRealtimeAccounts();

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: beneficiaries, isLoading: beneLoading } = useBeneficiaries();

  const transferOwn       = useTransfer();
  const sendExternal      = useSendExternalTransfer();
  const deposit           = useDeposit();
  const addBeneficiary    = useAddBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();
  const customMessages    = useCustomMessages();

  // ── Shared state ───────────────────────────────────────────
  const [mode, setMode]           = useState<TransferMode | null>(null);
  const [fromId, setFromId]       = useState<string | null>(null);
  const [amount, setAmount]       = useState("");
  const [note, setNote]           = useState("");
  const [successData, setSuccess] = useState<{ ref: string; to: string; amount: string; pending?: boolean; message?: string | null } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  // ── Own account transfer state ─────────────────────────────
  const [ownStep, setOwnStep] = useState<OwnStep>("from");
  const [toId, setToId]       = useState<string | null>(null);
  const [search, setSearch]   = useState("");

  // ── External transfer state ────────────────────────────────
  const [extStep, setExtStep]           = useState<ExtStep>("recipient");
  const [selectedBeneId, setSelectedBeneId] = useState<string | null>(null);
  const [recipientName, setRecipientName]   = useState("");
  const [bankName, setBankName]             = useState("");
  const [accountNumber, setAccountNumber]   = useState("");
  const [routingNumber, setRoutingNumber]   = useState("");
  const [iban, setIban]                     = useState("");
  const [swiftBic, setSwiftBic]             = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [saveAsBeneficiary, setSave]        = useState(false);

  // ── Deposit state ──────────────────────────────────────────
  const [depositAccountId, setDepositAccountId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount]       = useState("");
  const [depositNote, setDepositNote]           = useState("");
  const [depositStep, setDepositStep]           = useState<"account" | "amount" | "confirm" | "success">("account");

  // ── Derived ────────────────────────────────────────────────
  const sendable     = (accounts ?? []).filter((a) => a.type !== "credit" && (a.account_state ?? a.status) === "active");
  const fromAccount  = accounts?.find((a) => a.id === fromId) ?? null;
  const toAccount    = accounts?.find((a) => a.id === toId)   ?? null;
  const selectedBene = beneficiaries?.find((b) => b.id === selectedBeneId) ?? null;
  const depositAcct  = accounts?.find((a) => a.id === depositAccountId) ?? null;
  const parsedAmount = parseFloat(amount) || 0;
  const fmtAmount    = parsedAmount > 0 ? formatCurrency(parsedAmount) : "$0.00";

  const customMessage = (key: string, fallback: string) => {
    const setting = customMessages.data?.find((item) => item.key === key);
    return setting?.value ?? fallback;
  };

  const resetAll = () => {
    setMode(null);
    setFromId(null); setToId(null); setAmount(""); setNote(""); setSearch("");
    setOwnStep("from"); setExtStep("recipient");
    setSelectedBeneId(null); setRecipientName(""); setBankName("");
    setAccountNumber(""); setRoutingNumber(""); setIban(""); setSwiftBic("");
    setRecipientEmail(""); setSave(false);
    setDepositAccountId(null); setDepositAmount(""); setDepositNote("");
    setDepositStep("account"); setSuccess(null);
    setOtpCode("");
  };

  // ── Handlers ───────────────────────────────────────────────

  const handleOwnConfirm = () => {
    if (!fromId || !toId || parsedAmount <= 0) return;
    transferOwn.mutate(
      { fromAccountId: fromId, toAccountId: toId, amount: parsedAmount, note: note || undefined, otpCode: otpCode || undefined },
      {
        onSuccess: (data) => {
          setSuccess({
            ref:     data.reference ?? "—",
            to:      data.to_name ?? "",
            amount:  fmtAmount,
            pending: data.pending,
            message: data.message,
          });
          setOwnStep("success");
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleExternalConfirm = () => {
    if (!fromId || parsedAmount <= 0) return;
    const bene = selectedBene;
    sendExternal.mutate(
      {
        accountId:       fromId,
        beneficiaryId:   bene?.id,
        beneficiaryName: bene ? bene.full_name : recipientName,
        bankName:        bene ? bene.bank_name : bankName,
        accountNumber:   bene ? bene.account_number : accountNumber,
        amount:          parsedAmount,
        note:            note || undefined,
        saveBeneficiary: saveAsBeneficiary,
        swiftBic:        swiftBic || undefined,
        iban:            iban || undefined,
        otpCode:         otpCode || undefined,
      },
      {
        onSuccess: (data) => {
          setSuccess({
            ref:     data.reference ?? "—",
            to:      bene ? bene.full_name : recipientName,
            amount:  fmtAmount,
            pending: data.pending,
            message: data.message,
          });
          setExtStep("success");
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleDeposit = () => {
    if (!depositAccountId || !depositAmount) return;
    const amt = parseFloat(depositAmount);
    deposit.mutate(
      { accountId: depositAccountId, amount: amt, note: depositNote || undefined },
      {
        onSuccess: () => {
          setSuccess({ ref: "", to: depositAcct?.name ?? "", amount: formatCurrency(amt) });
          setDepositStep("success");
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  // ── Mode selector ──────────────────────────────────────────

  if (!mode) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Transfers & Payments</h1>
          <p className="text-sm text-muted-foreground">Move money wherever you need it.</p>
        </div>
        <div className="grid gap-4">
          {[
            {
              key: "own" as TransferMode,
              icon: ArrowLeftRight,
              title: "Between My Accounts",
              desc: "Move funds between your checking, savings, and investment accounts instantly.",
            },
            {
              key: "external" as TransferMode,
              icon: Building2,
              title: "Send to Another Bank",
              desc: "Transfer to any bank account via ACH, SWIFT, or IBAN. Save recipients as beneficiaries.",
            },
            {
              key: "deposit" as TransferMode,
              icon: ArrowDownLeft,
              title: "Deposit / Top Up",
              desc: "Add funds to any of your accounts — simulate an incoming wire or payroll deposit.",
            },
          ].map(({ key, icon: Icon, title, desc }) => (
            <motion.button
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setMode(key)}
              className="flex items-start gap-4 rounded border border-border/40 bg-gradient-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-card"
            >
              <div className="rounded-lg bg-primary/10 p-3 text-primary shrink-0"><Icon size={22} /></div>
              <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
              </div>
              <ArrowRight size={18} className="ml-auto shrink-0 self-center text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        {/* Saved beneficiaries quick view */}
        {(beneficiaries?.length ?? 0) > 0 && (
          <div>
            <h2 className="mb-3 font-display text-base font-semibold text-foreground">Saved Beneficiaries</h2>
            <div className="space-y-2">
              {beneficiaries!.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded border border-border/40 bg-gradient-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {b.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.nickname ?? b.full_name}</p>
                    <p className="text-xs text-muted-foreground">{b.bank_name} · ****{b.account_number.slice(-4)}</p>
                  </div>
                  <button
                    onClick={() => { setMode("external"); setSelectedBeneId(b.id); setExtStep("amount"); }}
                    className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => deleteBeneficiary.mutate(b.id, { onSuccess: () => toast.success("Beneficiary removed") })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODE: DEPOSIT
  // ─────────────────────────────────────────────────────────────

  if (mode === "deposit") {
    const depositParsed = parseFloat(depositAmount) || 0;

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          {depositStep !== "success" && (
            <button onClick={depositStep === "account" ? resetAll : () => setDepositStep("account")}
              className="text-muted-foreground hover:text-foreground">
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Deposit Funds</h1>
            <p className="text-sm text-muted-foreground">Add money to your account.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {depositStep === "account" && (
            <motion.div key="dep-account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              <p className="text-sm font-medium text-foreground">Select the account to deposit into:</p>
              {sendable.map((a) => (
                <AccountRow key={a.id} account={a} selected={depositAccountId === a.id}
                  onClick={() => { setDepositAccountId(a.id); setDepositStep("amount"); }} />
              ))}
            </motion.div>
          )}

          {depositStep === "amount" && depositAcct && (
            <motion.div key="dep-amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <div className="rounded border border-border/40 bg-gradient-card p-4">
                <p className="text-xs text-muted-foreground">Depositing into</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{depositAcct.name}</p>
                <p className="text-xs text-muted-foreground">Current balance: {formatCurrency(depositAcct.balance)}</p>
              </div>
              <div className="text-center">
                <p className="mb-2 text-xs text-muted-foreground">Deposit amount</p>
                <div className="relative mx-auto max-w-xs">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                  <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00" min="0.01" step="0.01" autoFocus
                    className="w-full rounded border border-border/50 bg-muted/30 py-4 pl-12 pr-4 text-center font-display text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setDepositAmount(v.toString())}
                    className={`flex-1 rounded border py-2 text-xs font-medium transition-colors ${depositAmount === v.toString() ? "border-primary bg-primary/10 text-primary" : "border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                    ${v.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Reference (optional)</Label>
                <Input placeholder="e.g. Payroll, Wire transfer" value={depositNote} onChange={(e) => setDepositNote(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <Button variant="hero" className="w-full" size="lg"
                disabled={!depositAmount || depositParsed <= 0}
                onClick={() => setDepositStep("confirm")}>
                Review Deposit <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}

          {depositStep === "confirm" && depositAcct && (
            <motion.div key="dep-confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold text-foreground text-center">Confirm Deposit</h2>
                <p className="font-display text-4xl font-bold text-gradient text-center">{formatCurrency(depositParsed)}</p>
                <div className="space-y-3">
                  {[
                    { label: "Into",    value: depositAcct.name },
                    { label: "Amount",  value: formatCurrency(depositParsed) },
                    { label: "New balance", value: formatCurrency(depositAcct.balance + depositParsed) },
                    ...(depositNote ? [{ label: "Reference", value: depositNote }] : []),
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between border-b border-border/20 pb-2">
                      <span className="text-sm text-muted-foreground">{r.label}</span>
                      <span className="text-sm font-medium text-foreground">{r.value}</span>
                    </div>
                  ))}
                </div>
                <Button variant="hero" className="w-full" size="lg" onClick={handleDeposit} disabled={deposit.isPending}>
                  {deposit.isPending ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : "Confirm Deposit"}
                </Button>
              </div>
            </motion.div>
          )}

          {depositStep === "success" && successData && (
            <motion.div key="dep-success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
              className="rounded border border-border/40 bg-gradient-card p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><Check size={32} className="text-primary" /></div>
              <h2 className="font-display text-xl font-bold text-foreground">Deposit Successful!</h2>
              <p className="text-sm text-muted-foreground">{successData.amount} has been added to <span className="font-medium text-foreground">{successData.to}</span>.</p>
              <div className="flex gap-3 pt-2">
                <Button variant="hero" className="flex-1" onClick={resetAll}>Done</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODE: OWN ACCOUNTS
  // ─────────────────────────────────────────────────────────────

  if (mode === "own") {
    const ownStepOrder: OwnStep[] = ["from", "to", "amount", "confirm", "success"];
    const ownStepLabels = ["From", "To", "Amount", "Confirm"];
    const ownIdx = ownStepOrder.indexOf(ownStep);
    const receivable = sendable.filter((a) => a.id !== fromId);
    const filteredTo = receivable.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          {ownStep !== "success" && (
            <button onClick={ownStep === "from" ? resetAll : () => setOwnStep(ownStepOrder[ownIdx - 1] as OwnStep)}
              className="text-muted-foreground hover:text-foreground"><ChevronLeft size={20} /></button>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Between My Accounts</h1>
            <p className="text-sm text-muted-foreground">Instant internal transfer.</p>
          </div>
        </div>

        {ownStep !== "success" && <ProgressBar steps={ownStepLabels} current={ownIdx} />}

        <AnimatePresence mode="wait">
          {ownStep === "from" && (
            <motion.div key="own-from" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              <p className="text-sm font-medium text-foreground">Send from:</p>
              {sendable.map((a) => (
                <AccountRow key={a.id} account={a} onClick={() => { setFromId(a.id); setOwnStep("to"); }} />
              ))}
            </motion.div>
          )}

          {ownStep === "to" && (
            <motion.div key="own-to" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
              {fromAccount && (
                <div className="rounded border border-border/40 bg-muted/20 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <AccountRow account={fromAccount} />
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="border-border/50 bg-muted/50 pl-10 text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-2">
                {filteredTo.map((a) => (
                  <AccountRow key={a.id} account={a} onClick={() => { setToId(a.id); setSearch(""); setOwnStep("amount"); }} />
                ))}
                {filteredTo.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No other accounts found.</p>}
              </div>
            </motion.div>
          )}

          {ownStep === "amount" && fromAccount && toAccount && (
            <motion.div key="own-amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <div className="flex items-center gap-3 rounded border border-border/40 bg-gradient-card p-4">
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-sm font-semibold text-foreground">{fromAccount.name}</p>
                </div>
                <ArrowLeftRight size={18} className="shrink-0 text-primary" />
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="text-sm font-semibold text-foreground">{toAccount.name}</p>
                </div>
              </div>
              <AmountInput amount={amount} onChange={setAmount} availableBalance={fromAccount.balance} />
              <div className="space-y-2">
                <Label className="text-foreground">Note (optional)</Label>
                <Input placeholder="What's this for?" value={note} onChange={(e) => setNote(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <Button variant="hero" className="w-full" size="lg"
                disabled={!amount || parsedAmount <= 0 || parsedAmount > fromAccount.balance}
                onClick={() => setOwnStep("confirm")}>
                Review <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}

          {ownStep === "confirm" && fromAccount && toAccount && (
            <motion.div key="own-confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold text-foreground text-center">Confirm Transfer</h2>
                <p className="font-display text-4xl font-bold text-gradient text-center">{fmtAmount}</p>
                <div className="space-y-3">
                  {[
                    { label: "From",   value: `${fromAccount.name} (****${fromAccount.account_number})` },
                    { label: "To",     value: `${toAccount.name} (****${toAccount.account_number})` },
                    { label: "Amount", value: fmtAmount },
                    { label: "Fee",    value: "Free" },
                    ...(note ? [{ label: "Note", value: note }] : []),
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between border-b border-border/20 pb-2">
                      <span className="text-sm text-muted-foreground">{r.label}</span>
                      <span className="text-sm font-medium text-foreground">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 rounded bg-primary/5 p-3">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-xs text-muted-foreground">Both balances update simultaneously. Atomic — all or nothing.</p>
                </div>
                <div className="space-y-2 rounded border border-border/40 bg-muted/30 p-4">
                  <div className="flex items-center gap-2">
                    <KeyRound size={14} className="text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">Transfer OTP required</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact your account manager to obtain a one-time code before proceeding.
                  </p>
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="border-border/50 bg-background font-mono tracking-widest text-foreground"
                  />
                </div>
                <Button variant="hero" className="w-full" size="lg" onClick={handleOwnConfirm} disabled={transferOwn.isPending || !otpCode.trim()}>
                  {transferOwn.isPending ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : `Send ${fmtAmount}`}
                </Button>
              </div>
            </motion.div>
          )}

          {ownStep === "success" && successData && (
            <motion.div key="own-success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
              className="rounded border border-border/40 bg-gradient-card p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10"><Clock size={32} className="text-amber-500" /></div>
              <h2 className="font-display text-xl font-bold text-foreground">Transfer Pending Review</h2>
              <p className="text-sm text-muted-foreground">
                {successData.amount} to <span className="font-medium text-foreground">{successData.to}</span>
              </p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">{successData.message || DEFAULT_PENDING_MESSAGE}</p>
              <p className="font-mono text-xs text-muted-foreground">Ref: {successData.ref}</p>
              <div className="flex gap-3 pt-2">
                <Button variant="hero" className="flex-1" onClick={resetAll}>New Transfer</Button>
                <Button variant="heroOutline" className="flex-1" onClick={() => window.history.back()}>Dashboard</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODE: EXTERNAL TRANSFER
  // ─────────────────────────────────────────────────────────────

  const extStepOrder: ExtStep[] = ["mode", "recipient", "details", "amount", "confirm", "success"];
  const extStepLabels = ["Recipient", "Details", "Amount", "Confirm"];
  // progress index: recipient=0, details=1, amount=2, confirm=3
  const extProgressIdx = ["recipient", "details", "amount", "confirm"].indexOf(extStep);

  const extRecipientName = selectedBene ? (selectedBene.nickname ?? selectedBene.full_name) : recipientName;
  const extBankName      = selectedBene ? selectedBene.bank_name : bankName;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        {extStep !== "success" && (
          <button onClick={() => {
            if (extStep === "recipient") resetAll();
            else if (extStep === "details")  { setExtStep("recipient"); setSelectedBeneId(null); }
            else if (extStep === "amount")   setExtStep(selectedBene ? "recipient" : "details");
            else if (extStep === "confirm")  setExtStep("amount");
          }} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Send to Another Bank</h1>
          <p className="text-sm text-muted-foreground">International & domestic wire transfers.</p>
        </div>
      </div>

      {extStep !== "success" && extProgressIdx >= 0 && (
        <ProgressBar steps={extStepLabels} current={extProgressIdx} />
      )}

      <AnimatePresence mode="wait">

        {/* ── Step 1: Choose recipient (beneficiary or new) ── */}
        {extStep === "recipient" && (
          <motion.div key="ext-recipient" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">

            {/* Saved beneficiaries */}
            {(beneficiaries?.length ?? 0) > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Saved Beneficiaries</p>
                <div className="space-y-2">
                  {beneficiaries!.map((b) => (
                    <button key={b.id}
                      onClick={() => { setSelectedBeneId(b.id); setExtStep("amount"); }}
                      className="flex w-full items-center gap-3 rounded border border-border/40 bg-gradient-card p-3 text-left transition-all hover:border-primary/30">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {b.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{b.nickname ?? b.full_name}</p>
                          <Star size={12} className="text-primary/50" />
                        </div>
                        <p className="text-xs text-muted-foreground">{b.bank_name} · ****{b.account_number.slice(-4)}</p>
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New recipient */}
            <button
              onClick={() => { setSelectedBeneId(null); setExtStep("details"); }}
              className="flex w-full items-center gap-3 rounded border border-dashed border-border/50 p-4 text-left transition-all hover:border-primary/30">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Plus size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">New Recipient</p>
                <p className="text-xs text-muted-foreground">Enter bank details manually</p>
              </div>
              <ArrowRight size={16} className="ml-auto text-muted-foreground" />
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Enter recipient bank details (new only) ── */}
        {extStep === "details" && (
          <motion.div key="ext-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Full Name *</Label>
                <Input placeholder="John Doe" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Bank Name *</Label>
                <Input placeholder="Chase, HSBC, etc." value={bankName} onChange={(e) => setBankName(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Account Number *</Label>
                <Input placeholder="e.g. 000123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Routing / Sort Code</Label>
                <Input placeholder="Optional" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">IBAN</Label>
                <Input placeholder="Optional" value={iban} onChange={(e) => setIban(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">SWIFT / BIC</Label>
                <Input placeholder="Optional" value={swiftBic} onChange={(e) => setSwiftBic(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-foreground">Recipient Email (optional)</Label>
                <Input type="email" placeholder="for transfer notification" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
                  className="border-border/50 bg-muted/50 text-foreground" />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded border border-border/40 bg-gradient-card p-3">
              <input type="checkbox" checked={saveAsBeneficiary} onChange={(e) => setSave(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Save as beneficiary</p>
                <p className="text-xs text-muted-foreground">Reuse this recipient for future transfers</p>
              </div>
            </label>

            <Button variant="hero" className="w-full" size="lg"
              disabled={!recipientName || !bankName || !accountNumber}
              onClick={() => setExtStep("amount")}>
              Continue <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}

        {/* ── Step 3: From account + amount ── */}
        {extStep === "amount" && (
          <motion.div key="ext-amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">

            {/* Recipient summary */}
            <div className="rounded border border-border/40 bg-gradient-card p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{extRecipientName}</p>
                <p className="text-xs text-muted-foreground">{extBankName}</p>
              </div>
            </div>

            {/* From account picker */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Send from:</p>
              {sendable.map((a) => (
                <AccountRow key={a.id} account={a} selected={fromId === a.id}
                  onClick={() => setFromId(a.id)} />
              ))}
            </div>

            {fromAccount && (
              <>
                <AmountInput amount={amount} onChange={setAmount} availableBalance={fromAccount.balance} />
                <div className="space-y-2">
                  <Label className="text-foreground">Reference / Note (optional)</Label>
                  <Input placeholder="Payment reference" value={note} onChange={(e) => setNote(e.target.value)}
                    className="border-border/50 bg-muted/50 text-foreground" />
                </div>
                <Button variant="hero" className="w-full" size="lg"
                  disabled={!amount || parsedAmount <= 0 || parsedAmount > fromAccount.balance}
                  onClick={() => setExtStep("confirm")}>
                  Review Transfer <ArrowRight size={18} />
                </Button>
              </>
            )}
          </motion.div>
        )}

        {/* ── Step 4: Confirm external ── */}
        {extStep === "confirm" && fromAccount && (
          <motion.div key="ext-confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground text-center">Confirm Transfer</h2>
              <p className="font-display text-4xl font-bold text-gradient text-center">{fmtAmount}</p>
              <div className="space-y-3">
                {[
                  { label: "To",           value: extRecipientName },
                  { label: "Bank",         value: extBankName },
                  { label: "Account",      value: selectedBene ? `****${selectedBene.account_number.slice(-4)}` : accountNumber },
                  { label: "From",         value: `${fromAccount.name} (****${fromAccount.account_number})` },
                  { label: "Amount",       value: fmtAmount },
                  { label: "Fee",          value: "Free" },
                  ...(note ? [{ label: "Reference", value: note }] : []),
                ].map((r) => (
                  <div key={r.label} className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="text-sm font-medium text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded bg-primary/5 p-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Funds will be deducted immediately. External transfers typically settle within 1–3 business days.
                </p>
              </div>
              <div className="space-y-2 rounded border border-border/40 bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <KeyRound size={14} className="text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">Transfer OTP required</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact your account manager to obtain a one-time code before proceeding.
                </p>
                <Input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="border-border/50 bg-background font-mono tracking-widest text-foreground"
                />
              </div>
              <Button variant="hero" className="w-full" size="lg" onClick={handleExternalConfirm} disabled={sendExternal.isPending || !otpCode.trim()}>
                {sendExternal.isPending ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : `Send ${fmtAmount}`}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Success ── */}
        {extStep === "success" && successData && (
          <motion.div key="ext-success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
            className="rounded border border-border/40 bg-gradient-card p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10"><Clock size={32} className="text-amber-500" /></div>
            <h2 className="font-display text-xl font-bold text-foreground">Transfer Pending Review</h2>
            <p className="text-sm text-muted-foreground">
              {successData.amount} to <span className="font-medium text-foreground">{successData.to}</span>
            </p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">{successData.message || DEFAULT_PENDING_MESSAGE}</p>
            <p className="font-mono text-xs text-muted-foreground">Ref: {successData.ref}</p>
            <div className="flex gap-3 pt-2">
              <Button variant="hero" className="flex-1" onClick={resetAll}>New Transfer</Button>
              <Button variant="heroOutline" className="flex-1" onClick={() => window.history.back()}>Dashboard</Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default TransferPage;
