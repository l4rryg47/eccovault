import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight, ArrowDownLeft, TrendingUp,
  DollarSign, CreditCard, PiggyBank, Loader2,
  Plus, RefreshCw,
} from "lucide-react";
import {
  useAccounts, useTransactions,
  useRealtimeAccounts, useRealtimeTransactions,
} from "@/hooks/useSupabase";
import { formatCurrency, formatDate } from "@/lib/format";

const accountIcon = (type: string) => {
  switch (type) {
    case "savings":    return PiggyBank;
    case "investment": return TrendingUp;
    case "credit":     return CreditCard;
    default:           return DollarSign;
  }
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item      = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const DashboardOverview = () => {
  const navigate = useNavigate();

  const {
    data: accounts,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useAccounts();

  const {
    data: transactions,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTx,
  } = useTransactions();

  // Live updates — no polling needed
  useRealtimeAccounts();
  useRealtimeTransactions();

  // ── Loading state ───────────────────────────────────────────
  // Only show spinner on the very first load (data === undefined).
  // After that, stale data stays visible while a background refetch runs.
  if (accountsLoading || txLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────
  if (accountsError || txError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>
        <button
          onClick={() => { refetchAccounts(); refetchTx(); }}
          className="flex items-center gap-2 rounded-lg border border-border/50 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/40"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    );
  }

  const recentTx     = transactions?.slice(0, 8) ?? [];
  const hasAccounts  = (accounts?.length ?? 0) > 0;

  const quickActions = [
    { label: "Send Money",    icon: ArrowUpRight, url: "/dashboard/transfer" },
    { label: "Accounts",      icon: DollarSign,   url: "/dashboard/accounts" },
    { label: "Savings",       icon: PiggyBank,     url: "/dashboard/savings" },
    { label: "Investments",   icon: TrendingUp,    url: "/dashboard/investments" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening with your money today.</p>
      </div>

      {/* ── Account Cards ── */}
      {hasAccounts ? (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accounts!.map((account) => {
            const Icon  = accountIcon(account.type);
            const isNeg = account.balance < 0;
            return (
              <motion.div key={account.id} variants={item}
                className="rounded border border-border/40 bg-gradient-card p-5 transition-all hover:border-primary/20 hover:shadow-card cursor-pointer"
                onClick={() => navigate("/dashboard/accounts")}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon size={18} /></div>
                  <span className={`text-xs font-medium capitalize ${account.status === "active" ? "text-primary" : "text-muted-foreground"}`}>
                    {account.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{account.name}</p>
                <p className={`mt-1 font-display text-xl font-bold ${isNeg ? "text-destructive" : "text-foreground"}`}>
                  {formatCurrency(account.balance)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        // ── Empty state for brand new users ──
        <div className="rounded border border-dashed border-border/50 bg-gradient-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <DollarSign size={26} className="text-primary" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">Welcome to Eccovault</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open your first account to get started. It only takes a few seconds.
          </p>
          <button
            onClick={() => navigate("/dashboard/accounts")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={16} /> Open an Account
          </button>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <button key={action.label} onClick={() => navigate(action.url)}
              className="flex flex-col items-center gap-2 rounded border border-border/40 bg-gradient-card p-4 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary">
              <div className="rounded-lg bg-muted/50 p-3"><action.icon size={20} /></div>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Transactions</h2>
        <div className="rounded border border-border/40 bg-gradient-card">
          {recentTx.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
              {hasAccounts && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Make your first transfer or deposit to see activity here.
                </p>
              )}
            </div>
          ) : (
            recentTx.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between px-5 py-4 ${
                i !== recentTx.length - 1 ? "border-b border-border/20" : ""
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    tx.type === "credit" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {tx.type === "credit" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.category === "Admin" ? (tx.type === "credit" ? "Credit" : "Debit") : tx.name}
                    </p>
                    {tx.category !== "Admin" && (
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-primary" : "text-foreground"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

