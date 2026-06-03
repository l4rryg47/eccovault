import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTransactions, useRealtimeTransactions } from "@/hooks/useSupabase";
import { formatCurrency, formatDate } from "@/lib/format";

const filters = ["All", "Income", "Expenses", "Transfers"] as const;
type Filter = (typeof filters)[number];

const TransactionsPage = () => {
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const { data: transactions, isLoading, error } = useTransactions();

  // New transactions appear instantly after a transfer
  useRealtimeTransactions();

  const filtered = (transactions ?? []).filter((tx) => {
    const matchesSearch  = tx.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter  =
      activeFilter === "All" ||
      (activeFilter === "Income"    && tx.type === "credit") ||
      (activeFilter === "Expenses"  && tx.type === "debit" && tx.category !== "Transfer") ||
      (activeFilter === "Transfers" && tx.category === "Transfer");
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground">View and search all your transactions.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search transactions..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border/50 bg-muted/50 pl-10 text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">Failed to load transactions. Please refresh.</p>}

      {!isLoading && (
        <div className="rounded border border-border/40 bg-gradient-card">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No transactions found.</p>
          ) : (
            filtered.map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== filtered.length - 1 ? "border-b border-border/20" : ""
                }`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    tx.type === "credit" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {tx.type === "credit" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tx.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category === "Admin" ? "Internal Systems" : tx.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-primary" : "text-foreground"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
