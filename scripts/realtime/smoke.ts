import "dotenv/config";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import Pusher from "pusher";
import PusherClient from "pusher-js";
import {
  REALTIME_PUBLISH_TIMEOUT_MS,
  getPublicSoketiEndpoint,
  getRealtimeConfig,
  parseRealtimePort,
  parseRealtimeTLS,
} from "../../src/lib/realtime/config";

const TIMEOUT_MS = 10_000;
const EVENT = "bid:new";

function readOptions() {
  const { values } = parseArgs({
    options: {
      host: { type: "string" },
      port: { type: "string" },
      tls: { type: "string" },
      origin: { type: "string" },
      "app-id": { type: "string" },
      key: { type: "string" },
      secret: { type: "string" },
    },
  });

  const port = parseRealtimePort(values.port);
  const useTLS = parseRealtimeTLS(values.tls);
  if (
    (values.port !== undefined && port === undefined) ||
    (values.tls !== undefined && useTLS === undefined)
  ) {
    throw new Error("Invalid port or TLS flag");
  }

  const config = getRealtimeConfig({
    ...process.env,
    NEXT_PUBLIC_REALTIME_DRIVER: "soketi",
  });
  const appId = values["app-id"] ?? config.appId;
  const key = values.key ?? config.key;
  const secret = values.secret ?? config.secret;
  if (!appId || !key || !secret) throw new Error("Missing app credentials");

  const endpoint = getPublicSoketiEndpoint(
    values.host ?? (process.env.NEXT_PUBLIC_SOKETI_HOST || config.host),
    values.port ?? process.env.NEXT_PUBLIC_SOKETI_PORT,
    values.tls ?? process.env.NEXT_PUBLIC_SOKETI_USE_TLS,
  );
  const origin = new URL(
    values.origin ??
      (process.env.REALTIME_ALLOWED_ORIGINS?.split(",")[0]?.trim() ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000"),
  );
  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    throw new Error("Invalid browser origin");
  }

  return {
    publish: {
      appId,
      key,
      secret,
      host: values.host?.trim() ?? config.host,
      port: port ?? config.port,
      useTLS: useTLS ?? config.useTLS,
      timeout: REALTIME_PUBLISH_TIMEOUT_MS,
    },
    subscribe: {
      wsHost: endpoint.host,
      wsPort: endpoint.port,
      wssPort: endpoint.port,
      forceTLS: endpoint.useTLS,
    },
    origin: origin.origin,
  };
}

function setNodeWebSocketOrigin(origin: string) {
  const runtime = PusherClient.Runtime;
  // The Node SDK bundles faye-websocket, whose constructor accepts headers.
  const Socket = runtime.getWebSocketAPI() as new (
    url: string,
    protocols: string[],
    options: { headers: { Origin: string } },
  ) => ReturnType<typeof runtime.createWebSocket>;
  runtime.createWebSocket = (url) =>
    new Socket(url, [], { headers: { Origin: origin } });
}

async function smoke() {
  let step = "configuration";
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let client: PusherClient | undefined;

  try {
    const options = readOptions();
    const publisher = new Pusher(options.publish);
    const nonce = randomUUID();
    const channelName = `private-item-smoke-${nonce}`;
    const started = performance.now();
    step = "subscribe";

    setNodeWebSocketOrigin(options.origin);
    client = new PusherClient(options.publish.key, {
      cluster: "default",
      ...options.subscribe,
      enabledTransports: ["ws", "wss"],
      enableStats: false,
      channelAuthorization: {
        customHandler: ({ socketId, channelName }, callback) => {
          callback(null, publisher.authorizeChannel(socketId, channelName));
        },
      },
    });

    const channel = client.subscribe(channelName);
    const roundTrip = async () => {
      await new Promise<void>((resolve, reject) => {
        channel.bind("pusher:subscription_succeeded", () => resolve());
        channel.bind("pusher:subscription_error", () =>
          reject(new Error("Subscription rejected")),
        );
      });

      const delivered = new Promise<void>((resolve) => {
        channel.bind(EVENT, (payload: { nonce?: string } | null) => {
          if (payload?.nonce === nonce) resolve();
        });
      });

      step = "publish";
      await publisher.trigger(channelName, EVENT, { nonce });
      step = "delivery";
      await delivered;
    };

    await Promise.race([
      roundTrip(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Smoke check timed out")),
          TIMEOUT_MS,
        );
      }),
    ]);
    console.log(
      `Realtime smoke check passed in ${Math.round(performance.now() - started)} ms.`,
    );
  } catch {
    // SDK errors and invalid arguments can include raw credentials.
    console.error(`Realtime smoke check failed at ${step}.`);
    if (step === "configuration") {
      console.error(
        "Set the SOKETI_* and NEXT_PUBLIC_SOKETI_* variables or pass --host, --port, --tls true|false, --app-id, --key and --secret. Set --origin to an allowed browser origin when needed.",
      );
    }
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    client?.disconnect();
  }
}

void smoke();
