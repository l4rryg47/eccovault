import { useAdminStats, useAdminCardPayments, useRealtimeAdminCardPayments, useRealtimeAdminTransactions } from "@/hooks/useAdmin";
import { formatCurrency, formatDate } from "@/lib/format";
import { Loader2, Users, Wallet, CreditCard, ArrowLeftRight, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const StatCard = ({ label, value, sub, icon: Icon, onClick }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; onClick?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`rounded border border-border/40 bg-gradient-card p-5 ${onClick ? "cursor-pointer hover:border-primary/20 transition-all" : ""}`}>
    <div className="mb-3 flex items-center justify-between">
      <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon size={18} /></div>
    </div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
  </motion.div>
);

const AdminOverview = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useAdminStats();
  const { data: pending } = useAdminCardPayments("pending");
  useRealtimeAdminCardPayments();
  useRealtimeAdminTransactions();

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={28} />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">Platform health at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Users"         value={String(stats?.total_users ?? 0)}      icon={Users}           onClick={() => navigate("/admin/users")} />
        <StatCard label="Total Accounts"      value={String(stats?.total_accounts ?? 0)}   icon={Wallet}          onClick={() => navigate("/admin/accounts")} />
        <StatCard label="Platform Balance"    value={formatCurrency(stats?.total_balance ?? 0)} icon={TrendingUp} />
        <StatCard label="Total Transactions"  value={String(stats?.total_transactions ?? 0)} icon={ArrowLeftRight}  onClick={() => navigate("/admin/transactions")} />
        <StatCard label="Pending Payments"    value={String(stats?.pending_payments ?? 0)}
          sub={stats?.pending_payments ? "Awaiting review" : "All clear"}
          icon={Clock} onClick={() => navigate("/admin/payments")} />
        <StatCard label="Deposits Today"      value={formatCurrency(stats?.deposits_today ?? 0)} icon={CreditCard} />
      </div>

      {/* Pending payments quick view */}
      {(pending?.length ?? 0) > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Pending Card Payments
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {pending!.length}
              </span>
            </h2>
            <button onClick={() => navigate("/admin/payments")}
              className="text-xs text-primary hover:underline">View all →</button>
          </div>
          <div className="space-y-2">
            {pending!.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded border border-yellow-500/20 bg-yellow-500/5 p-4">
                <CreditCard size={16} className="shrink-0 text-yellow-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(p.amount)} · {p.cardholder_name} · {p.card_type.toUpperCase()} ****{p.card_last_four}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                </div>
                <button onClick={() => navigate("/admin/payments")}
                  className="text-xs font-medium text-primary hover:underline shrink-0">
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
