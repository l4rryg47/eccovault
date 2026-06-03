import { useState } from "react";
import { motion } from "framer-motion";
import { PiggyBank, Plus, TrendingUp, Trash2, Loader2, X } from "lucide-react";
import { useSavingsGoals, useInsertSavingsGoal, useDeleteSavingsGoal } from "@/hooks/useSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const SavingsPage = () => {
  const { data: goals, isLoading, error } = useSavingsGoals();
  const insertGoal = useInsertSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const totalSavings = goals?.reduce((sum, g) => sum + g.current, 0) ?? 0;

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTarget) return;
    insertGoal.mutate(
      { name: newName, target: parseFloat(newTarget) },
      {
        onSuccess: () => {
          toast.success("Savings goal created!");
          setNewName("");
          setNewTarget("");
          setShowForm(false);
        },
        onError: () => toast.error("Failed to create goal."),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    deleteGoal.mutate(id, {
      onSuccess: () => toast.success(`"${name}" deleted.`),
      onError: () => toast.error("Failed to delete goal."),
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Savings</h1>
          <p className="text-sm text-muted-foreground">Track your savings goals and earn 4.5% APY.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* New Goal Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded border border-primary/30 bg-gradient-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-foreground">New Savings Goal</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleAddGoal} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-foreground">Goal Name</Label>
              <Input
                placeholder="e.g. Emergency Fund"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="border-border/50 bg-muted/50 text-foreground"
              />
            </div>
            <div className="w-40 space-y-2">
              <Label className="text-foreground">Target ($)</Label>
              <Input
                type="number"
                placeholder="10000"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                required
                min="1"
                className="border-border/50 bg-muted/50 text-foreground"
              />
            </div>
            <Button type="submit" variant="hero" disabled={insertGoal.isPending}>
              {insertGoal.isPending ? <Loader2 size={16} className="animate-spin" /> : "Create"}
            </Button>
          </form>
        </motion.div>
      )}

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-border/40 bg-gradient-card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><PiggyBank size={20} /></div>
              <p className="text-sm text-muted-foreground">Total Savings</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">
              {formatCurrency(totalSavings)}
            </p>
          </div>
          <div className="rounded border border-border/40 bg-gradient-card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><TrendingUp size={20} /></div>
              <p className="text-sm text-muted-foreground">Active Goals</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-primary">
              {goals?.length ?? 0}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load savings goals. Please refresh.</p>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {goals?.map((goal, i) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded border border-border/40 bg-gradient-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">{goal.apy}% APY</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-display text-lg font-bold text-foreground">
                      {formatCurrency(goal.current)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        / {formatCurrency(goal.target)}
                      </span>
                    </p>
                    <button
                      onClick={() => handleDelete(goal.id, goal.name)}
                      disabled={deleteGoal.isPending}
                      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">{pct}% complete</p>
              </motion.div>
            );
          })}

          {goals?.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No savings goals yet. Click "New Goal" to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SavingsPage;
