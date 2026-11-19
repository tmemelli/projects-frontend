import assert from "node:assert/strict";
import { test } from "node:test";
import { probeHealthEndpoint } from "../src/services/healthProbe.js";

const URL = "https://example.com/health";

test("reports ready only for a readable successful response", async () => {
  const modes = [];
  const result = await probeHealthEndpoint(URL, {
    fetchImpl: async (_url, options) => {
      modes.push(options.mode);
      return { ok: true, status: 200 };
    },
  });
  assert.equal(result.status, "ready");
  assert.deepEqual(modes, ["cors"]);
});

test("reports non-2xx responses as unavailable without retrying", async () => {
  let requests = 0;
  const result = await probeHealthEndpoint(URL, {
    fetchImpl: async () => {
      requests += 1;
      return { ok: false, status: 503 };
    },
  });
  assert.equal(result.status, "unavailable");
  assert.match(result.detail, /503/);
  assert.equal(requests, 1);
});

test("falls back to warm-up but never claims an opaque response is ready", async () => {
  const modes = [];
  const result = await probeHealthEndpoint(URL, {
    fetchImpl: async (_url, options) => {
      modes.push(options.mode);
      if (options.mode === "cors") throw new TypeError("Failed to fetch");
      return { type: "opaque", ok: false, status: 0 };
    },
  });
  assert.equal(result.status, "unverified");
  assert.deepEqual(modes, ["cors", "no-cors"]);
});

test("reuses opaque mode when CORS is known to be unavailable", async () => {
  const modes = [];
  const result = await probeHealthEndpoint(URL, {
    preferOpaque: true,
    fetchImpl: async (_url, options) => {
      modes.push(options.mode);
      return { type: "opaque", ok: false, status: 0 };
    },
  });
  assert.equal(result.status, "unverified");
  assert.deepEqual(modes, ["no-cors"]);
});

test("reports unavailable when both CORS and opaque requests fail", async () => {
  const result = await probeHealthEndpoint(URL, {
    fetchImpl: async () => { throw new TypeError("Network unavailable"); },
  });
  assert.equal(result.status, "unavailable");
});

test("does not issue a request when the parent signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await probeHealthEndpoint(URL, {
    signal: controller.signal,
    fetchImpl: async () => { throw new Error("Should not be called"); },
  });
  assert.equal(result.status, "paused");
});

test("aborts an in-flight request when its parent is aborted", async () => {
  const controller = new AbortController();
  const resultPromise = probeHealthEndpoint(URL, {
    signal: controller.signal,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      controller.abort();
    }),
  });
  const result = await resultPromise;
  assert.equal(result.status, "paused");
});

test("marks a timed-out request unavailable", async () => {
  const result = await probeHealthEndpoint(URL, {
    timeoutMs: 10,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }),
  });
  assert.equal(result.status, "unavailable");
  assert.match(result.detail, /timed out/);
});
