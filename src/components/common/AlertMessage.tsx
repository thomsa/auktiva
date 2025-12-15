import { ReactNode } from "react";

interface AlertMessageProps {
  type: "error" | "success" | "warning" | "info";
  children: ReactNode;
  className?: string;
}

const alertConfig = {
  error: { class: "alert-error", icon: "icon-[tabler--alert-circle]" },
  success: { class: "alert-success", icon: "icon-[tabler--check]" },
  warning: { class: "alert-warning", icon: "icon-[tabler--alert-triangle]" },
  info: { class: "alert-info", icon: "icon-[tabler--info-circle]" },
};

export function AlertMessage({
  type,
  children,
  className = "",
}: AlertMessageProps) {
  const config = alertConfig[type];

  return (
    <div className={`alert ${config.class} ${className}`}>
      <span className={`${config.icon} size-5`}></span>
      <span>{children}</span>
    </div>
  );
}
