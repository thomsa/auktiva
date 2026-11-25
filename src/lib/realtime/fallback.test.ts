import assert from "node:assert/strict";
import test from "node:test";
import { resolveRealtimeSWRConfig } from "./fallback";

test("a connected realtime client disables polling and automatic revalidation", () => {
  assert.deepEqual(
    resolveRealtimeSWRConfig({
      isEnabled: true,
      isConnected: true,
      baseInterval: 2000,
    }),
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  );
});

test("a disconnected realtime client polls at the base interval", () => {
  assert.deepEqual(
    resolveRealtimeSWRConfig({
      isEnabled: true,
      isConnected: false,
      baseInterval: 2000,
    }),
    {
      refreshInterval: 2000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
    },
  );
});

test("disabling realtime preserves the existing polling and revalidation defaults", () => {
  assert.deepEqual(
    resolveRealtimeSWRConfig({
      isEnabled: false,
      isConnected: false,
      baseInterval: 2000,
    }),
    {
      refreshInterval: 2000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
    },
  );
});

test("a page that requests no polling stays paused during a realtime outage", () => {
  assert.equal(
    resolveRealtimeSWRConfig({
      isEnabled: true,
      isConnected: false,
      baseInterval: 0,
    }).refreshInterval,
    0,
  );
});
