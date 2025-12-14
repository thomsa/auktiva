/**
 * Date and currency formatting utilities
 */

export function formatDate(dateStr: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "No end date";
  return new Date(dateStr).toLocaleDateString("en-US", options ?? {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "No end date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function formatCurrency(amount: number, symbol: string, decimals = 2): string {
  return `${symbol}${amount.toFixed(decimals)}`;
}

export function formatCurrencyCompact(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(0)}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
