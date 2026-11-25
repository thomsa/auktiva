export interface RealtimeSWRConfig {
  refreshInterval: number;
  revalidateOnFocus: boolean;
  revalidateOnReconnect: boolean;
  revalidateIfStale: boolean;
}

export function resolveRealtimeSWRConfig({
  isEnabled,
  isConnected,
  baseInterval,
}: {
  isEnabled: boolean;
  isConnected: boolean;
  baseInterval: number;
}): RealtimeSWRConfig {
  const live = isEnabled && isConnected;

  return {
    refreshInterval: live ? 0 : baseInterval,
    revalidateOnFocus: !live,
    revalidateOnReconnect: !live,
    revalidateIfStale: isEnabled && !isConnected,
  };
}
