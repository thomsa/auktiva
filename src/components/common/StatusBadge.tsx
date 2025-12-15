interface StatusBadgeProps {
  status: "winning" | "won" | "outbid" | "lost" | "ended" | "active";
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
}

const statusConfig = {
  winning: {
    color: "badge-success",
    icon: "icon-[tabler--trophy]",
    label: "Winning",
  },
  won: { color: "badge-success", icon: "icon-[tabler--trophy]", label: "Won" },
  outbid: {
    color: "badge-warning",
    icon: "icon-[tabler--arrow-up]",
    label: "Outbid",
  },
  lost: { color: "badge-ghost", icon: null, label: "Lost" },
  ended: {
    color: "badge-error",
    icon: "icon-[tabler--flag-filled]",
    label: "Ended",
  },
  active: { color: "badge-success", icon: null, label: "Active" },
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
  const config = statusConfig[status];

  return (
    <span className={`badge ${config.color} ${sizeClasses[size]} gap-1`}>
      {showIcon && config.icon && (
        <span className={`${config.icon} size-3`}></span>
      )}
      {config.label}
    </span>
  );
}
