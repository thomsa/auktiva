import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { inspect } from "node:util";
import { logger } from "../logger";
import { Channels, Events } from "./events";

test("realtime publishes fail safely", async (t) => {
  const secret = "test-app-secret-reflected-by-server";
  let requests = 0;
  let responseMode: "hang" | "reject" | "hang-after-headers" = "hang";
  let stalledSocketClosed: Promise<unknown[]> | undefined;
  const server = createServer((request, response) => {
    assert.equal(request.method, "POST");
    requests++;
    if (responseMode === "reject") {
      response.writeHead(401).end(secret);
    } else if (responseMode === "hang-after-headers") {
      stalledSocketClosed = once(request.socket, "close");
      response.writeHead(401).flushHeaders();
    }
  });

  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const previousEnv = process.env;
  process.env = {
    ...previousEnv,
    NEXT_PUBLIC_REALTIME_DRIVER: "soketi",
    NEXT_PUBLIC_SOKETI_APP_KEY: "test-app-key",
    NEXT_PUBLIC_SOKETI_PORT: String(address.port),
    NEXT_PUBLIC_SOKETI_USE_TLS: "false",
    SOKETI_HOST: "127.0.0.1",
    SOKETI_PORT: String(address.port),
    SOKETI_USE_TLS: "false",
    SOKETI_APP_ID: "test-app-id",
    SOKETI_APP_SECRET: secret,
  };
  t.after(() => {
    process.env = previousEnv;
  });

  const child = t.mock.method(logger, "child");
  const { publish, publishToMany } = await import("./server");
  const realtimeLogger = child.mock.calls[0].result;
  assert.ok(realtimeLogger);
  const error = t.mock.method(realtimeLogger, "error", () => {});
  const channel = Channels.item("item-id");
  const event = Events.ITEM_UPDATED;
  const data = { itemId: "item-id", auctionId: "auction-id", changes: {} };

  await t.test(
    "resolves within six seconds if the server never responds",
    { timeout: 6200 },
    async () => {
      const start = performance.now();
      await publish(channel, event, data);
      assert.equal(requests, 1);
      assert.ok(performance.now() - start < 6000);
    },
  );

  await t.test(
    "a 401 response cannot fail a publish or expose the secret",
    async () => {
      responseMode = "reject";
      error.mock.resetCalls();
      await publish(channel, event, data);
      await publishToMany([channel], event, data);
      assert.equal(requests, 3);
      assert.equal(error.mock.callCount(), 2);
      const logs = inspect(error.mock.calls.map(({ arguments: args }) => args));
      assert.match(logs, /401/);
      assert.ok(!logs.includes(secret));
    },
  );

  await t.test(
    "resolves and closes the request within six seconds if an error response stalls after its headers",
    { timeout: 6200 },
    async () => {
      responseMode = "hang-after-headers";
      const start = performance.now();
      await publish(channel, event, data);
      assert.equal(requests, 4);
      assert.ok(stalledSocketClosed);
      await stalledSocketClosed;
      assert.ok(performance.now() - start < 6000);
    },
  );
});
