import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface StatsCardProps {
  icon: string;
  iconColor:
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "warning"
    | "error";
  value: React.ReactNode;
  label: string;
}

const colorClasses = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  secondary: { bg: "bg-secondary/10", text: "text-secondary" },
  accent: { bg: "bg-accent/10", text: "text-accent" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  error: { bg: "bg-error/10", text: "text-error" },
};

export function StatsCard({ icon, iconColor, value, label }: StatsCardProps) {
  const colors = colorClasses[iconColor];

  return (
    <div className="card bg-base-100 shadow min-w-0 overflow-hidden">
      <div className="card-body p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`${colors.bg} p-2 rounded-lg shrink-0`}>
            <span className={`${icon} size-6 ${colors.text}`}></span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold truncate">{value}</div>
            <div className="text-xs text-base-content/60 truncate">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CurrencyTotal {
  code: string;
  symbol: string;
  total: number;
}

interface CurrencyStatsCardProps {
  icon: string;
  iconColor:
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "warning"
    | "error";
  currencyTotals: CurrencyTotal[];
  label: string;
  decimals?: number;
}

export function CurrencyStatsCard({
  icon,
  iconColor,
  currencyTotals,
  label,
  decimals = 0,
}: CurrencyStatsCardProps) {
  const t = useTranslations("stats");
  const colors = colorClasses[iconColor];
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 192; // w-48 = 12rem = 192px
      let left = rect.left;

      // Ensure popup doesn't go off right edge
      if (left + popupWidth > window.innerWidth - 8) {
        left = window.innerWidth - popupWidth - 8;
      }
      // Ensure popup doesn't go off left edge
      if (left < 8) left = 8;

      setPosition({
        top: rect.bottom + 4,
        left,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <div className={`${colors.bg} p-2 rounded-lg`}>
            <span className={`${icon} size-6 ${colors.text}`}></span>
          </div>
          <div>
            {currencyTotals.length > 0 ? (
              <div className="flex items-baseline gap-1 flex-col sm:flex-row">
                <span className="text-2xl font-bold">
                  {currencyTotals[0].symbol}
                  {currencyTotals[0].total.toFixed(decimals)}
                </span>
                {currencyTotals.length > 1 && (
                  <>
                    <span
                      ref={triggerRef}
                      onClick={() => setIsOpen(!isOpen)}
                      className="text-xs text-base-content/60 cursor-pointer underline decoration-dotted"
                    >
                      {t("more", { count: currencyTotals.length - 1 })}
                    </span>
                    {isOpen &&
                      typeof window !== "undefined" &&
                      createPortal(
                        <div
                          ref={popupRef}
                          className="fixed z-50 bg-base-100 shadow-lg rounded-lg p-3 w-48 border border-base-content/10"
                          style={{ top: position.top, left: position.left }}
                        >
                          <div className="text-xs font-semibold mb-2">
                            {t("allCurrencies")}
                          </div>
                          <div className="space-y-1">
                            {currencyTotals.map((ct) => (
                              <div
                                key={ct.code}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-base-content/70">
                                  {ct.code}
                                </span>
                                <span className="font-medium">
                                  {ct.symbol}
                                  {ct.total.toFixed(decimals)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>,
                        document.body,
                      )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-2xl font-bold">-</div>
            )}
            <div className="text-xs text-base-content/60">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
