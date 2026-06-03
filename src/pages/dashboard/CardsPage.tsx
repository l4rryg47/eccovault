import { motion } from "framer-motion";
import { CreditCard, Snowflake, Eye, EyeOff, Settings, Loader2 } from "lucide-react";
import { useState } from "react";
import { useCards, useToggleCardFreeze } from "@/hooks/useSupabase";
import { toast } from "sonner";

const cardGradient = (index: number, frozen: boolean) => {
  if (frozen) return "from-muted-foreground/20 to-muted/30";
  const gradients = [
    "from-primary/80 to-accent",
    "from-muted-foreground/30 to-muted/50",
    "from-primary/40 to-primary/10",
  ];
  return gradients[index % gradients.length];
};

const CardsPage = () => {
  const { data: cards, isLoading, error } = useCards();
  const toggleFreeze = useToggleCardFreeze();
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleFreeze = (id: string, currentlyFrozen: boolean) => {
    toggleFreeze.mutate(
      { id, frozen: !currentlyFrozen },
      {
        onSuccess: () =>
          toast.success(currentlyFrozen ? "Card unfrozen" : "Card frozen"),
        onError: () => toast.error("Failed to update card. Please try again."),
      }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cards</h1>
          <p className="text-sm text-muted-foreground">Manage your physical and virtual cards.</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load cards. Please refresh.</p>
      )}

      {!isLoading && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards?.map((card, i) => {
            const isFrozen = card.frozen;
            const isRevealed = revealedCards.has(card.id);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="space-y-4"
              >
                {/* Card Visual */}
                <div className={`relative overflow-hidden rounded bg-gradient-to-br ${cardGradient(i, isFrozen)} p-6 ${isFrozen ? "opacity-60" : ""}`}>
                  {isFrozen && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <Snowflake size={20} />
                        <span className="text-sm font-semibold">Frozen</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <CreditCard size={28} className="text-foreground/70" />
                    <span className="text-xs font-medium uppercase text-foreground/60">{card.card_type}</span>
                  </div>
                  <p className="mt-8 font-mono text-lg tracking-widest text-foreground/90">
                    {isRevealed
                      ? `•••• •••• •••• ${card.last_four}`
                      : `•••• •••• •••• ${card.last_four}`}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-foreground/50">Card Name</p>
                      <p className="text-sm font-medium text-foreground/80">{card.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-foreground/50">Expires</p>
                      <p className="text-sm font-medium text-foreground/80">{card.expiry}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleReveal(card.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/40 bg-muted/30 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isRevealed ? "Hide" : "Reveal"}
                  </button>
                  <button
                    onClick={() => handleToggleFreeze(card.id, isFrozen)}
                    disabled={toggleFreeze.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/40 bg-muted/30 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <Snowflake size={14} />
                    {isFrozen ? "Unfreeze" : "Freeze"}
                  </button>
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/40 bg-muted/30 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                    <Settings size={14} /> Manage
                  </button>
                </div>

                {/* Limit info */}
                {card.credit_limit && (
                  <div className="flex justify-between rounded-lg border border-border/20 bg-muted/20 px-4 py-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Kind</p>
                      <p className="font-semibold capitalize text-foreground">{card.kind}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Limit</p>
                      <p className="font-semibold text-foreground">
                        ${card.credit_limit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {cards?.length === 0 && (
            <p className="col-span-3 py-12 text-center text-sm text-muted-foreground">No cards found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CardsPage;
