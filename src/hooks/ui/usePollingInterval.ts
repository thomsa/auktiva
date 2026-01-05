import { useEffect, useState } from "react";

/**
 * Polling priority levels for different interaction contexts
 * - critical: Active bidding/real-time interaction (3s)
 * - high: Viewing auction/item details (5s)
 * - medium: Dashboard/overview pages (15s)
 * - low: Background/inactive pages (30s)
 * - off: No polling (0)
 */
export type PollingPriority = "critical" | "high" | "medium" | "low" | "off";

const POLLING_INTERVALS: Record<PollingPriority, number> = {
  critical: 2000,
  high: 5000,
  medium: 15000,
  low: 30000,
  off: 0,
};

interface UsePollingIntervalOptions {
  /** Base priority level */
  priority: PollingPriority;
  /** Disable polling when condition is true (e.g., item ended) */
  disabled?: boolean;
  /** Pause polling when tab is not visible */
  pauseOnHidden?: boolean;
}

/**
 * Hook that returns a polling interval based on priority and visibility state.
 * Automatically pauses polling when the tab is hidden to save resources.
 *
 * @example
 * const refreshInterval = usePollingInterval({ priority: "high", disabled: isEnded });
 * const { data } = useSWR(key, fetcher, { refreshInterval });
 */
export function usePollingInterval(options: UsePollingIntervalOptions): number {
  const { priority, disabled = false, pauseOnHidden = true } = options;
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  useEffect(() => {
    if (!pauseOnHidden) return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseOnHidden]);

  // Return 0 (no polling) if disabled or tab is hidden
  if (disabled || (pauseOnHidden && !isVisible)) {
    return 0;
  }

  return POLLING_INTERVALS[priority];
}

/**
 * Get polling interval without visibility tracking (for SSR or simple cases)
 */
export function getPollingInterval(
  priority: PollingPriority,
  disabled = false,
): number {
  if (disabled) return 0;
  return POLLING_INTERVALS[priority];
}

export { POLLING_INTERVALS };
