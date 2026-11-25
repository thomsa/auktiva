import assert from "node:assert/strict";
import { test } from "node:test";
import { buildConnectSrc } from "./csp";

const previousConnectSrc =
  "connect-src 'self' https://www.google.com https: ws://127.0.0.1:* wss://127.0.0.1:* ws://localhost:* wss://localhost:* wss://*.pusher.com";

const selfHosted = {
  NEXT_PUBLIC_REALTIME_DRIVER: " Soketi ",
  NEXT_PUBLIC_SOKETI_HOST: "push.example.org",
};

test("allows the self-hosted TLS origin with and without the default port", () => {
  const directive = buildConnectSrc({
    ...selfHosted,
    NEXT_PUBLIC_SOKETI_PORT: "443",
    NEXT_PUBLIC_SOKETI_USE_TLS: "true",
  });

  assert.equal(
    directive,
    `${previousConnectSrc} wss://push.example.org:443 wss://push.example.org`,
  );
});

test("allows a self-hosted TLS origin on a custom port", () => {
  const directive = buildConnectSrc({
    ...selfHosted,
    NEXT_PUBLIC_SOKETI_PORT: "8443",
    NEXT_PUBLIC_SOKETI_USE_TLS: "true",
  });

  assert.equal(directive, `${previousConnectSrc} wss://push.example.org:8443`);
});

test("uses the plain WebSocket scheme and default public port without TLS", () => {
  assert.equal(
    buildConnectSrc(selfHosted),
    `${previousConnectSrc} ws://push.example.org:6001`,
  );
});

test("preserves connect-src for other drivers and when the public host is unset", () => {
  for (const driver of [undefined, "disabled", " Pusher ", "unknown"]) {
    assert.equal(
      buildConnectSrc({ ...selfHosted, NEXT_PUBLIC_REALTIME_DRIVER: driver }),
      previousConnectSrc,
    );
  }

  assert.equal(
    buildConnectSrc({ NEXT_PUBLIC_REALTIME_DRIVER: "soketi" }),
    previousConnectSrc,
  );
});

test("does not treat malformed hosts as CSP source expressions", () => {
  for (const host of [
    "push.example.org *",
    "push.example.org; script-src *",
    "push.example.org:6001",
    "https://push.example.org",
    "[::1]",
  ]) {
    assert.equal(
      buildConnectSrc({ ...selfHosted, NEXT_PUBLIC_SOKETI_HOST: host }),
      previousConnectSrc,
    );
  }
});

test("normalizes internationalized host names to ASCII for CSP", () => {
  assert.equal(
    buildConnectSrc({
      ...selfHosted,
      NEXT_PUBLIC_SOKETI_HOST: "bücher.example.org",
    }),
    `${previousConnectSrc} ws://xn--bcher-kva.example.org:6001`,
  );
});
