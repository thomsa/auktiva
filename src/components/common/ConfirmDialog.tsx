import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "error" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "error",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const bgColor = {
    error: "bg-error/10",
    warning: "bg-warning/10",
    primary: "bg-primary/10",
  }[variant];

  return (
    <div className={`mt-4 p-4 ${bgColor} rounded-lg`}>
      <p className="font-semibold mb-3">{title}</p>
      {message && (
        <div className="text-sm text-base-content/60 mb-3">{message}</div>
      )}
      <div className="flex gap-2">
        <Button
          onClick={onConfirm}
          variant={variant}
          isLoading={isLoading}
          loadingText="Processing..."
        >
          {confirmLabel}
        </Button>
        <button
          onClick={onCancel}
          className="btn btn-ghost"
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
