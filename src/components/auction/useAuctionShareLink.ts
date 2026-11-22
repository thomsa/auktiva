import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";

/**
 * Copy an auction's public join link, with a toast and a short-lived
 * "copied" flag. Shared by the sidebar and the phone action row.
 */
export function useAuctionShareLink(auctionId: string) {
  const t = useTranslations("auction");
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyShareLink = useCallback(async () => {
    const shareUrl = `${window.location.origin}/a/${auctionId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopied(true);
    showToast(t("sidebar.linkCopied"), "success");
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  }, [auctionId, showToast, t]);

  return { copied, copyShareLink };
}
