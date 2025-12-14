interface PriceDisplayProps {
  amount: number;
  symbol: string;
  decimals?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-3xl",
};

export function PriceDisplay({
  amount,
  symbol,
  decimals = 2,
  size = "md",
  className = "",
}: PriceDisplayProps) {
  return (
    <span className={`font-bold ${sizeClasses[size]} ${className}`}>
      {symbol}
      {amount.toFixed(decimals)}
    </span>
  );
}
