import { domainToASCII } from "node:url";
import { getPublicSoketiEndpoint, parseRealtimeDriver } from "./config";

const DEFAULT_CONNECT_SRC =
  "connect-src 'self' https://www.google.com https: ws://127.0.0.1:* wss://127.0.0.1:* ws://localhost:* wss://localhost:* wss://*.pusher.com";

const CSP_HOST_NAME = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.?$/i;

export function buildConnectSrc(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const rawHost = env.NEXT_PUBLIC_SOKETI_HOST?.trim();
  if (
    parseRealtimeDriver(env.NEXT_PUBLIC_REALTIME_DRIVER) !== "soketi" ||
    !rawHost ||
    /[\s/:\\?#@%]/u.test(rawHost)
  ) {
    return DEFAULT_CONNECT_SRC;
  }

  const { host, port, useTLS } = getPublicSoketiEndpoint(
    rawHost,
    env.NEXT_PUBLIC_SOKETI_PORT,
    env.NEXT_PUBLIC_SOKETI_USE_TLS,
  );
  const asciiHost = domainToASCII(host);
  if (!CSP_HOST_NAME.test(asciiHost)) return DEFAULT_CONNECT_SRC;

  const origin = `${useTLS ? "wss" : "ws"}://${asciiHost}`;
  const defaultTlsOrigin = useTLS && port === 443 ? ` ${origin}` : "";
  return `${DEFAULT_CONNECT_SRC} ${origin}:${port}${defaultTlsOrigin}`;
}
