import { useLocale } from "next-intl";

export function useFormatters() {
  const locale = useLocale();

  const formatDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      ...options,
    }).format(dateObj);
  };

  const formatShortDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(dateObj);
  };

  const formatLongDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
    }).format(dateObj);
  };

  const formatRelativeTime = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor(
      (dateObj.getTime() - now.getTime()) / 1000,
    );

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    const intervals: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] =
      [
        { unit: "year", seconds: 31536000 },
        { unit: "month", seconds: 2592000 },
        { unit: "week", seconds: 604800 },
        { unit: "day", seconds: 86400 },
        { unit: "hour", seconds: 3600 },
        { unit: "minute", seconds: 60 },
        { unit: "second", seconds: 1 },
      ];

    for (const interval of intervals) {
      const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
      if (count >= 1) {
        return rtf.format(diffInSeconds > 0 ? count : -count, interval.unit);
      }
    }

    return rtf.format(0, "second");
  };

  const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(num);
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatCompactNumber = (num: number) => {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
    }).format(num);
  };

  const formatPercent = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  return {
    formatDate,
    formatShortDate,
    formatLongDate,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatCompactNumber,
    formatPercent,
  };
}

// Server-side formatting functions that accept locale as parameter
export function formatDateServer(
  date: Date | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(dateObj);
}

export function formatCurrencyServer(
  amount: number,
  locale: string,
  currency: string = "USD",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatNumberServer(
  num: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(num);
}
