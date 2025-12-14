import { useState, useCallback } from "react";

export interface UseConfirmDialogReturn {
  isOpen: boolean;
  isLoading: boolean;
  open: () => void;
  close: () => void;
  confirm: (action: () => Promise<void>) => Promise<void>;
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    if (!isLoading) setIsOpen(false);
  }, [isLoading]);

  const confirm = useCallback(async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isOpen,
    isLoading,
    open,
    close,
    confirm,
  };
}
