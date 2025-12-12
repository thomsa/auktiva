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
    <div className="card bg-base-100 shadow">
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className={`${colors.bg} p-2 rounded-lg`}>
            <span className={`${icon} size-6 ${colors.text}`}></span>
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-base-content/60">{label}</div>
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
  const colors = colorClasses[iconColor];

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className={`${colors.bg} p-2 rounded-lg`}>
            <span className={`${icon} size-6 ${colors.text}`}></span>
          </div>
          <div>
            {currencyTotals.length > 0 ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {currencyTotals[0].symbol}
                  {currencyTotals[0].total.toFixed(decimals)}
                </span>
                {currencyTotals.length > 1 && (
                  <div className="dropdown dropdown-hover dropdown-top">
                    <span
                      tabIndex={0}
                      className="text-xs text-base-content/60 cursor-help underline decoration-dotted"
                    >
                      +{currencyTotals.length - 1} more
                    </span>
                    <div
                      tabIndex={0}
                      className="dropdown-content z-10 bg-base-100 shadow-lg rounded-lg p-3 w-48 mb-2"
                    >
                      <div className="text-xs font-semibold mb-2">
                        All Currencies
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
                    </div>
                  </div>
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
