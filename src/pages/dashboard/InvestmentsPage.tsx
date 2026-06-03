import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useInvestments } from "@/hooks/useSupabase";
import { formatCurrency } from "@/lib/format";

// Static price data — in Phase 3/4 you can wire this to a live market API
const LIVE_PRICES: Record<string, { price: number; change: number }> = {
  VOO:  { price: 523.40,   change: +1.2 },
  AAPL: { price: 198.50,   change: -0.8 },
  BTC:  { price: 68420.00, change: +3.4 },
  TSLA: { price: 245.60,   change: +2.1 },
  ETH:  { price: 3520.00,  change: -1.5 },
  MSFT: { price: 445.20,   change: +0.6 },
};

const InvestmentsPage = () => {
  const { data: investments, isLoading, error } = useInvestments();

  const holdings = (investments ?? []).map((inv) => {
    const market = LIVE_PRICES[inv.ticker] ?? { price: inv.avg_cost, change: 0 };
    const value     = inv.shares * market.price;
    const costBasis = inv.shares * inv.avg_cost;
    const gainLoss  = value - costBasis;
    return { ...inv, ...market, value, costBasis, gainLoss };
  });

  const totalValue    = holdings.reduce((s, h) => s + h.value, 0);
  const totalCost     = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalReturn   = totalCost > 0 ? ((totalGainLoss / totalCost) * 100).toFixed(1) : "0.0";
  const todayGain     = holdings.reduce((s, h) => s + (h.value * h.change) / 100, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Investments</h1>
        <p className="text-sm text-muted-foreground">Your portfolio at a glance.</p>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load investments. Please refresh.</p>
      )}

      {!isLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded border border-border/40 bg-gradient-card p-6">
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="rounded border border-border/40 bg-gradient-card p-6">
              <p className="text-xs text-muted-foreground">Today's Gain/Loss</p>
              <p className={`mt-1 font-display text-2xl font-bold ${todayGain >= 0 ? "text-primary" : "text-destructive"}`}>
                {todayGain >= 0 ? "+" : ""}{formatCurrency(todayGain)}
              </p>
            </div>
            <div className="rounded border border-border/40 bg-gradient-card p-6">
              <p className="text-xs text-muted-foreground">All-Time Return</p>
              <p className={`mt-1 font-display text-2xl font-bold ${totalGainLoss >= 0 ? "text-primary" : "text-destructive"}`}>
                {totalGainLoss >= 0 ? "+" : ""}{totalReturn}%
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Holdings</h2>
            <div className="rounded border border-border/40 bg-gradient-card">
              <div className="flex items-center border-b border-border/20 px-5 py-3 text-xs font-medium text-muted-foreground">
                <span className="flex-1">Asset</span>
                <span className="w-24 text-right">Price</span>
                <span className="w-20 text-right">Shares</span>
                <span className="w-28 text-right">Value</span>
                <span className="w-20 text-right">Change</span>
              </div>

              {holdings.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center px-5 py-4 ${
                    i !== holdings.length - 1 ? "border-b border-border/20" : ""
                  }`}
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                      {h.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.ticker}</p>
                    </div>
                  </div>
                  <span className="w-24 text-right text-sm text-foreground">
                    {formatCurrency(h.price)}
                  </span>
                  <span className="w-20 text-right text-sm text-muted-foreground">
                    {h.shares}
                  </span>
                  <span className="w-28 text-right text-sm font-semibold text-foreground">
                    {formatCurrency(h.value)}
                  </span>
                  <span className={`flex w-20 items-center justify-end gap-1 text-sm font-medium ${
                    h.change >= 0 ? "text-primary" : "text-destructive"
                  }`}>
                    {h.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {h.change >= 0 ? "+" : ""}{h.change}%
                  </span>
                </motion.div>
              ))}

              {holdings.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">No holdings yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InvestmentsPage;
