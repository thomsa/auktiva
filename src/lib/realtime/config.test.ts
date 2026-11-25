import assert from "node:assert/strict";
import test from "node:test";
import { getClientConfig } from "./client";
import { getClientRealtimeConfig, getRealtimeConfig } from "./config";

function clientConfig(env: NodeJS.ProcessEnv) {
  const previousEnv = process.env;
  process.env = env;
  try {
    return {
      client: getClientConfig(),
      publicConfig: getClientRealtimeConfig(),
    };
  } finally {
    process.env = previousEnv;
  }
}

test("both realtime configs accept all supported drivers irrespective of case and whitespace", () => {
  for (const [raw, driver] of [
    [" Pusher ", "pusher"],
    ["SOKETI", "soketi"],
    ["disabled", "disabled"],
  ]) {
    const env = { NEXT_PUBLIC_REALTIME_DRIVER: raw };
    assert.equal(getRealtimeConfig(env).driver, driver);
    assert.equal(clientConfig(env).client.driver, driver);
  }
});

test("the server warns once per unset or unknown setting and both configs disable realtime", (t) => {
  const warn = t.mock.method(process, "emitWarning", () => {});

  for (const raw of [undefined, "unexpected-realtime-driver"]) {
    const env = { NEXT_PUBLIC_REALTIME_DRIVER: raw };
    assert.equal(getRealtimeConfig(env).driver, "disabled");
    assert.equal(getRealtimeConfig(env).driver, "disabled");
    assert.equal(clientConfig(env).client.driver, "disabled");
  }

  assert.equal(warn.mock.callCount(), 2);
  assert.match(warn.mock.calls[0].arguments.join(" "), /unset/i);
  assert.match(
    warn.mock.calls[1].arguments.join(" "),
    /unexpected-realtime-driver/,
  );
});

test("hosted Pusher retains its existing credentials, cluster and TLS settings", () => {
  const env = {
    NEXT_PUBLIC_REALTIME_DRIVER: "pusher",
    PUSHER_APP_ID: "app-id",
    NEXT_PUBLIC_PUSHER_KEY: "public-key",
    PUSHER_SECRET: "test-secret",
    NEXT_PUBLIC_PUSHER_CLUSTER: "us2",
  };

  assert.deepEqual(getRealtimeConfig(env), {
    driver: "pusher",
    appId: "app-id",
    key: "public-key",
    secret: "test-secret",
    cluster: "us2",
    useTLS: true,
  });
  assert.equal(clientConfig(env).client.cluster, "us2");
  assert.equal(clientConfig(env).client.forceTLS, true);
});

test("the server can publish internally while browsers use a public TLS endpoint", () => {
  const env = {
    NEXT_PUBLIC_REALTIME_DRIVER: "soketi",
    SOKETI_HOST: "realtime",
    SOKETI_PORT: "6001",
    SOKETI_USE_TLS: "false",
    SOKETI_APP_ID: "app-id",
    SOKETI_APP_SECRET: "test-secret",
    NEXT_PUBLIC_SOKETI_APP_KEY: "public-key",
    NEXT_PUBLIC_SOKETI_HOST: "push.example.org",
    NEXT_PUBLIC_SOKETI_PORT: "443",
    NEXT_PUBLIC_SOKETI_USE_TLS: "true",
  };

  const server = getRealtimeConfig(env);
  assert.equal(server.host, "realtime");
  assert.equal(server.port, 6001);
  assert.equal(server.useTLS, false);

  const { client, publicConfig } = clientConfig(env);
  assert.equal(client.wsHost, "push.example.org");
  assert.equal(client.wssPort, 443);
  assert.equal(client.forceTLS, true);
  assert.ok(client.enabledTransports.includes("ws"));
  assert.deepEqual(publicConfig, {
    driver: "soketi",
    key: "public-key",
    cluster: "default",
    host: "push.example.org",
    port: 443,
    useTLS: true,
  });
});

test("the server falls back to browser endpoint settings for remote HTTPS", () => {
  const config = getRealtimeConfig({
    NEXT_PUBLIC_REALTIME_DRIVER: "soketi",
    NEXT_PUBLIC_SOKETI_HOST: "push.example.org",
    NEXT_PUBLIC_SOKETI_PORT: "443",
    NEXT_PUBLIC_SOKETI_USE_TLS: "true",
  });
  assert.equal(config.host, "push.example.org");
  assert.equal(config.port, 443);
  assert.equal(config.useTLS, true);
});

test("an existing internal publish endpoint retains its address and transport", () => {
  const config = getRealtimeConfig({
    NEXT_PUBLIC_REALTIME_DRIVER: "soketi",
    SOKETI_HOST: "127.0.0.1",
    NEXT_PUBLIC_SOKETI_PORT: "6001",
    NEXT_PUBLIC_SOKETI_USE_TLS: "false",
  });
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 6001);
  assert.equal(config.useTLS, false);
});

test("invalid server endpoint values fall back to valid browser settings or defaults", () => {
  for (const port of ["undefined", "", "70000", "0", "443abc"]) {
    const env = {
      NEXT_PUBLIC_REALTIME_DRIVER: "soketi",
      SOKETI_PORT: port,
      SOKETI_USE_TLS: "invalid",
    };
    const publicSettings = getRealtimeConfig({
      ...env,
      NEXT_PUBLIC_SOKETI_PORT: "443",
      NEXT_PUBLIC_SOKETI_USE_TLS: "true",
    });
    assert.equal(publicSettings.port, 443);
    assert.equal(publicSettings.useTLS, true);

    const defaults = getRealtimeConfig({
      ...env,
      NEXT_PUBLIC_SOKETI_PORT: "bad",
    });
    assert.equal(defaults.host, "127.0.0.1");
    assert.equal(defaults.port, 6001);
    assert.equal(defaults.useTLS, false);
  }
});
