import { useState } from "react";
import { Search, ArrowUpRight, ArrowDownLeft, Loader2, ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminAllTransactions, useRealtimeAdminTransactions } from "@/hooks/useAdmin";
import { formatCurrency, formatDate } from "@/lib/format";
import { motion } from "framer-motion";

const FILTERS = ["All", "Income", "Expenses", "Transfers", "Deposit", "Admin"] as const;
type Filter = (typeof FILTERS)[number];

const AdminTransactions = () => {
  const { data: txns, isLoading } = useAdminAllTransactions();
  useRealtimeAdminTransactions();

  const [search, setSearch]           = useState("");
  const [activeFilter, setFilter]     = useState<Filter>("All");

  const filtered = (txns ?? []).filter((tx) => {
    const matchSearch =
      tx.name.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase()) ||
      tx.user_id.includes(search);
    const matchFilter =
      activeFilter === "All"      ||
      (activeFilter === "Income"   && tx.type === "credit"  && tx.category !== "Deposit" && tx.category !== "Admin") ||
      (activeFilter === "Expenses" && tx.type === "debit"   && tx.category !== "Transfer" && tx.category !== "Admin") ||
      (activeFilter === "Transfers"&& tx.category === "Transfer") ||
      (activeFilter === "Deposit"  && tx.category === "Deposit") ||
      (activeFilter === "Admin"    && tx.category === "Admin");
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">All Transactions</h1>
        <p className="text-sm text-muted-foreground">{txns?.length ?? 0} transactions across all users.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, category, user ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="border-border/50 bg-muted/50 pl-10 text-foreground" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-dashed border-border/50 p-10 text-center">
          <ArrowLeftRight size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No transactions found.</p>
        </div>
      ) : (
        <div className="rounded border border-border/40 overflow-hidden">
          <div className="grid grid-cols-5 gap-4 border-b border-border/20 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="col-span-2">Transaction</span>
            <span>Category</span>
            <span>Date</span>
            <span className="text-right">Amount</span>
          </div>
          {filtered.map((tx, i) => (
            <motion.div key={tx.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.3) }}
              className={`grid grid-cols-5 gap-4 items-center px-4 py-3 ${
                i !== filtered.length - 1 ? "border-b border-border/20" : ""
              }`}>
              <div className="col-span-2 flex items-center gap-3 min-w-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  tx.type === "credit" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tx.type === "credit" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{tx.user_id.slice(0, 8)}…</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{tx.category}</span>
              <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
              <p className={`text-right text-sm font-semibold ${tx.type === "credit" ? "text-primary" : "text-foreground"}`}>
                {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
