import { useTranslations } from "next-intl";

interface StatusBadgeProps {
  status: "winning" | "won" | "outbid" | "lost" | "ended" | "active";
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
}

const statusConfig = {
  winning: {
    color: "badge-success",
    icon: "icon-[tabler--trophy]",
    labelKey: "winning",
  },
  won: { color: "badge-success", icon: "icon-[tabler--trophy]", labelKey: "won" },
  outbid: {
    color: "badge-warning",
    icon: "icon-[tabler--arrow-up]",
    labelKey: "outbid",
  },
  lost: { color: "badge-ghost", icon: null, labelKey: "lost" },
  ended: {
    color: "badge-error",
    icon: "icon-[tabler--flag-filled]",
    labelKey: "ended",
  },
  active: { color: "badge-success", icon: null, labelKey: "active" },
};

const sizeClasses = {
  xs: "badge-xs",
  sm: "badge-sm",
  md: "",
};

export function StatusBadge({
  status,
  size = "sm",
  showIcon = true,
}: StatusBadgeProps) {
  const t = useTranslations("status");
  const config = statusConfig[status];

  return (
    <span className={`badge ${config.color} ${sizeClasses[size]} gap-1`}>
      {showIcon && config.icon && (
        <span className={`${config.icon} size-3`}></span>
      )}
      {t(config.labelKey)}
    </span>
  );
}
