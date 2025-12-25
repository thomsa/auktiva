"use client";

import { useSyncExternalStore, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";

interface VersionData {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  releaseName: string | null;
  isDeploymentAdmin: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DISMISSED_VERSIONS_KEY = "auktiva_dismissed_versions";

function getDismissedVersions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DISMISSED_VERSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function dismissVersion(version: string): void {
  const dismissed = getDismissedVersions();
  if (!dismissed.includes(version)) {
    dismissed.push(version);
    localStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissed));
  }
}

// Custom hook to check if a version is dismissed using useSyncExternalStore
function useIsDismissed(version: string | null): boolean {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const getSnapshot = useCallback(() => {
    if (!version) return true;
    return getDismissedVersions().includes(version);
  }, [version]);

  const getServerSnapshot = useCallback(() => true, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function UpdateBanner() {
  const t = useTranslations("update");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const { data } = useSWR<VersionData>("/api/version", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
    dedupingInterval: 3600000, // 1 hour
  });

  const isDismissed = useIsDismissed(data?.latestVersion ?? null);

  const handleDismiss = () => {
    if (data?.latestVersion) {
      dismissVersion(data.latestVersion);
      // Trigger a re-render by dispatching a storage event
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch("/api/system/update", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setUpdateSuccess(true);
        // The app will restart, so show a success message
      } else {
        setUpdateError(result.message || t("updateFailed"));
      }
    } catch {
      setUpdateError(t("updateFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't render anything if no update or dismissed
  if (!data?.updateAvailable || isDismissed || !data.latestVersion) {
    return null;
  }

  // Show success state
  if (updateSuccess) {
    return (
      <div className="fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
        <div className="card bg-success/95 backdrop-blur-sm shadow-xl border border-success/20">
          <div className="card-body p-4">
            <div className="flex items-start gap-3">
              <span className="icon-[tabler--check] size-5 text-success-content shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-success-content">
                  {t("updateStarted")}
                </p>
                <p className="text-sm text-success-content/80 mt-1">
                  {t("appRestarting")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      <div className="card bg-base-100/95 backdrop-blur-sm shadow-xl border border-base-content/10">
        <div className="card-body p-4">
          {/* Header with dismiss button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="icon-[tabler--sparkles] size-5 text-primary shrink-0" />
              <h3 className="font-semibold text-sm">{t("newVersion", { version: data.latestVersion })}</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-xs btn-circle -mr-1 -mt-1"
              aria-label={t("dismiss")}
            >
              <span className="icon-[tabler--x] size-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-base-content/70 mt-2">
            {data.isDeploymentAdmin ? t("clickToUpdate") : t("contactAdmin")}
          </p>

          {/* Error message */}
          {updateError && (
            <p className="text-sm text-error mt-2">{updateError}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {data.isDeploymentAdmin && (
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="btn btn-primary btn-sm flex-1"
              >
                {isUpdating ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    {t("updating")}
                  </>
                ) : (
                  <>
                    <span className="icon-[tabler--download] size-4" />
                    {t("installUpdate")}
                  </>
                )}
              </button>
            )}
            {data.releaseUrl && (
              <a
                href={data.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn-ghost btn-sm ${data.isDeploymentAdmin ? "" : "flex-1"}`}
              >
                <span className="icon-[tabler--external-link] size-4" />
                {t("viewRelease")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
