import { useState, useCallback } from "react";

export interface UseImageGalleryReturn {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  next: () => void;
  previous: () => void;
}

export function useImageGallery(totalImages: number): UseImageGalleryReturn {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const next = useCallback(() => {
    setSelectedIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  }, [totalImages]);

  const previous = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  }, [totalImages]);

  return {
    selectedIndex,
    setSelectedIndex,
    next,
    previous,
  };
}
