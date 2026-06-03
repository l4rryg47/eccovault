import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, PiggyBank, TrendingUp, CreditCard,
  Loader2, Plus, X, ArrowDownLeft, Copy, ChevronDown,
  Building2, Hash, Check,
} from "lucide-react";
import { useAccounts } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "@/hooks/useSupabase";
import { formatCurrency } from "@/lib/format";
import {
  generateAccountNumber,
  maskAccountNumber,
  partialAccountNumber,
  formatRoutingNumber,
  VAULT_ROUTING_NUMBER,
} from "@/lib/accountNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────

type AccountType = "checking" | "savings" | "investment" | "credit";

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string }[] = [
  { value: "checking",   label: "Checking",   desc: "Day-to-day spending and transfers" },
  { value: "savings",    label: "Savings",     desc: "High-yield savings at 4.5% APY" },
  { value: "investment", label: "Investment",  desc: "Brokerage account for stocks & ETFs" },
  { value: "credit",     label: "Credit",      desc: "Revolving credit line" },
];

const accountIcon = (type: string) => {
  switch (type) {
    case "savings":    return PiggyBank;
    case "investment": return TrendingUp;
    case "credit":     return CreditCard;
    default:           return DollarSign;
  }
};

// ─── Copy-to-clipboard helper ──────────────────────────────

const CopyButton = ({ value, label }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label ?? value}`}
      className="ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

// ─── Account detail drawer ─────────────────────────────────

const AccountDetails = ({
  account,
}: {
  account: {
    id: string;
    name: string;
    type: string;
    account_number: string;
    routing_number?: string | null;
    balance: number;
    status: string;
  };
}) => {
  const routing = account.routing_number ?? VAULT_ROUTING_NUMBER;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/30 bg-muted/20 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Account Details
      </p>

      {/* Account number */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Hash size={12} />
          Account Number
        </div>
        <div className="flex items-center font-mono text-sm text-foreground">
          {partialAccountNumber(account.account_number)}
          <CopyButton value={account.account_number} label="account number" />
        </div>
      </div>

      {/* Routing number */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 size={12} />
          Routing Number
        </div>
        <div className="flex items-center font-mono text-sm text-foreground">
          {formatRoutingNumber(routing)}
          <CopyButton value={routing} label="routing number" />
        </div>
      </div>

      {/* Account type */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Account Type</span>
        <span className="text-sm capitalize text-foreground">{account.type}</span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Status</span>
        <span className={`text-sm capitalize font-medium ${
          account.status === "active" ? "text-primary" : "text-muted-foreground"
        }`}>
          {account.status}
        </span>
      </div>

      <p className="pt-1 text-xs text-muted-foreground">
        Use these details to receive wire transfers or set up direct deposit.
      </p>
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────

const AccountsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc       = useQueryClient();
  const { data: accounts, isLoading, error } = useAccounts();

  const [showNew, setShowNew]         = useState(false);
  const [newName, setNewName]         = useState("");
  const [newType, setNewType]         = useState<AccountType>("checking");
  const [creating, setCreating]       = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setCreating(true);

    // Generate a Luhn-valid 10-digit account number client-side.
    // The DB has a UNIQUE constraint — if there's a collision (astronomically
    // rare) the create_account function retries server-side up to 5 times.
    const candidateNumber = generateAccountNumber(newType);

    const { data, error } = await supabase.rpc("create_account", {
      p_user_id:          user.id,
      p_name:             newName.trim(),
      p_type:             newType,
      p_candidate_number: candidateNumber,
    });

    setCreating(false);

    if (error) {
      toast.error("Failed to create account. Please try again.");
      return;
    }

    const result = data as { ok: boolean; error?: string; account_number?: string };

    if (!result.ok) {
      toast.error(result.error ?? "Failed to create account.");
      return;
    }

    toast.success(`${newName} account opened!`, {
      description: `Account number: ${maskAccountNumber(result.account_number ?? "")}`,
    });

    qc.invalidateQueries({ queryKey: keys.accounts(user.id) });
    setShowNew(false);
    setNewName("");
    setNewType("checking");
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage all your accounts in one place.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={16} /> Open Account
        </button>
      </div>

      {/* New Account Form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded border border-primary/30 bg-gradient-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">
                Open New Account
              </h2>
              <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Account Name</Label>
                <Input
                  placeholder="e.g. My Emergency Fund"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                  className="border-border/50 bg-muted/50 text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Account Type</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACCOUNT_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setNewType(t.value)}
                      className={`rounded border p-3 text-left transition-all ${
                        newType === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border/40 hover:border-primary/30"
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview of what will be assigned */}
              <div className="rounded-lg border border-border/30 bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Will be assigned
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Hash size={11} /> Account Number
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    10-digit unique number
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building2 size={11} /> Routing Number
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {formatRoutingNumber(VAULT_ROUTING_NUMBER)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded bg-muted/40 p-3 text-xs text-muted-foreground">
                <DollarSign size={13} className="shrink-0" />
                New accounts start at $0.00. Use{" "}
                <span className="mx-1 font-medium text-foreground">Transfers → Deposit</span> to fund it.
              </div>

              <div className="flex gap-3">
                <Button type="submit" variant="hero" disabled={creating || !newName.trim()}>
                  {creating ? (
                    <><Loader2 size={14} className="animate-spin" /> Opening…</>
                  ) : (
                    "Open Account"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load accounts. Please refresh.</p>
      )}

      {/* Empty state */}
      {!isLoading && accounts?.length === 0 && (
        <div className="rounded border border-dashed border-border/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No accounts yet. Click "Open Account" to get started.
          </p>
        </div>
      )}

      {/* Account list */}
      {!isLoading && (
        <div className="space-y-3">
          {accounts?.map((account, i) => {
            const Icon       = accountIcon(account.type);
            const isNeg      = account.balance < 0;
            const isExpanded = expandedId === account.id;

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded border border-border/40 bg-gradient-card transition-all hover:border-primary/20"
              >
                {/* Main row */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground capitalize font-mono">
                        {account.type} · {maskAccountNumber(account.account_number)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-display text-lg font-bold ${
                        isNeg ? "text-destructive" : "text-foreground"
                      }`}>
                        {formatCurrency(account.balance)}
                      </p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                        {account.status}
                      </span>
                    </div>

                    {/* Deposit shortcut */}
                    <button
                      onClick={() => navigate("/dashboard/transfer")}
                      title="Deposit funds"
                      className="rounded-lg border border-border/40 p-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      <ArrowDownLeft size={16} />
                    </button>

                    {/* Expand / collapse account details */}
                    <button
                      onClick={() => toggleExpand(account.id)}
                      title="View account details"
                      className={`rounded-lg border border-border/40 p-2 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary ${
                        isExpanded ? "bg-primary/5 text-primary border-primary/30" : ""
                      }`}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expandable detail panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-border/20 px-5 pb-5"
                    >
                      <AccountDetails account={account} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
