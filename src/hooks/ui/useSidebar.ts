import { useState, useCallback } from "react";

export interface UseSidebarReturn {
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

export function useSidebar(
  initialCollapsed = false,
  onToggle?: (collapsed: boolean) => void
): UseSidebarReturn {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      onToggle?.(newValue);
      return newValue;
    });
  }, [onToggle]);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    onToggle?.(true);
  }, [onToggle]);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    onToggle?.(false);
  }, [onToggle]);

  return {
    isCollapsed,
    toggle,
    collapse,
    expand,
  };
}
