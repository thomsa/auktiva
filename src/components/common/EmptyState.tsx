import { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <span className={`${icon} size-16 text-base-content/20`}></span>
      <h2 className="card-title mt-4 justify-center">{title}</h2>
      {description && (
        <p className="text-base-content/60 max-w-md mx-auto mt-2">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
