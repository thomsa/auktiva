import { ReactNode } from "react";
import { useTranslations } from "next-intl";
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
  confirmLabel,
  cancelLabel,
  variant = "error",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const confirm = confirmLabel || t("confirm");
  const cancel = cancelLabel || t("cancel");
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
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <button
          onClick={onCancel}
          className="btn btn-ghost w-full sm:w-auto"
          disabled={isLoading}
        >
          {cancel}
        </button>
        <Button
          onClick={onConfirm}
          variant={variant}
          className="w-full sm:w-auto"
          isLoading={isLoading}
          loadingText={t("loading")}
        >
          {confirm}
        </Button>
      </div>
    </div>
  );
}
