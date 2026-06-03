/**
 * Shared formatting helpers used across all dashboard pages.
 */

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};
