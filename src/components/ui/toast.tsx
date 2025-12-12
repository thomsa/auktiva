import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  const getAlertClass = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "alert-success";
      case "error":
        return "alert-error";
      case "warning":
        return "alert-warning";
      case "info":
        return "alert-info";
      default:
        return "alert-success";
    }
  };

  const getIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "icon-[tabler--check]";
      case "error":
        return "icon-[tabler--alert-circle]";
      case "warning":
        return "icon-[tabler--alert-triangle]";
      case "info":
        return "icon-[tabler--info-circle]";
      default:
        return "icon-[tabler--check]";
    }
  };

  return (
    <div className="toast toast-end toast-bottom z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`alert ${getAlertClass(toast.type)} shadow-lg cursor-pointer`}
          onClick={() => removeToast(toast.id)}
        >
          <span className={`${getIcon(toast.type)} size-5`}></span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
