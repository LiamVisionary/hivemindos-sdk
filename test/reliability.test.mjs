import assert from "node:assert/strict";
import test from "node:test";

import {
  HIVEMINDOS_DEFAULT_TIMEOUT_MS,
  HIVEMINDOS_END_USER_HEADER,
  HIVEMINDOS_RETRYABLE_STATUSES,
  HivemindOSClient,
  HivemindOSRequestError,
  createHivemindOSApiKey,
  retryAfterSecondsFrom,
} from "../dist/index.js";

// The API's own rule for an Idempotency-Key (platform-api requireIdempotencyKey).
const API_IDEMPOTENCY_KEY = /^[a-zA-Z0-9:._-]{8,200}$/;

/** A fetch that answers each call with the next scripted step and records what it was sent. */
function scriptedFetch(steps) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init, headers: new Headers(init.headers), body: init.body });
    const step = steps[Math.min(calls.length, steps.length) - 1];
    if (step === "hang") {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
      });
    }
    if (step === "hang-ignoring-signal") return new Promise(() => {});
    if (step instanceof Error) throw step;
    return typeof step === "function" ? step() : step.clone();
  };
  return { fetch, calls };
}

const ok = (body = {}) => Response.json({ ok: true, ...body });
const unavailable = (headers = {}) => Response.json({
  ok: false,
  serviceId: "hive-research",
  operationId: "analyses.create",
  status: 503,
  upstreamStatus: 503,
  chargedCredits: 0,
  result: {},
  error: "The service is busy.",
  code: "upstream_unavailable",
}, { status: 503, headers });

test("exports the reliability defaults", () => {
  assert.equal(HIVEMINDOS_DEFAULT_TIMEOUT_MS, 60_000);
  assert.deepEqual(HIVEMINDOS_RETRYABLE_STATUSES, [429, 502, 503, 504]);
  assert.equal(HIVEMINDOS_END_USER_HEADER, "x-hivemindos-end-user");
});

test("a call that never answers returns a typed timeout with a key to retry with", async () => {
  const { fetch, calls } = scriptedFetch(["hang"]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch, timeoutMs: 25 });
  const started = Date.now();
  const result = await client.services.invoke("hive-research", "/v1/research", { topic: "x" });
  assert.ok(Date.now() - started < 2_000);
  assert.equal(result.ok, false);
  assert.equal(result.code, "timeout");
  assert.equal(result.status, 504);
  assert.equal(result.retryable, true);
  assert.equal(result.attempts, 1);
  assert.equal(calls.length, 1);
  assert.equal(result.idempotencyKey, calls[0].headers.get("idempotency-key"));
  assert.match(result.error, /did not answer within/);
});

test("the deadline holds even when a custom fetch ignores its abort signal", async () => {
  const { fetch } = scriptedFetch(["hang-ignoring-signal"]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch });
  const result = await client.request("GET", "/services", undefined, { timeoutMs: 20 });
  assert.equal(result.code, "timeout");
  assert.equal(result.status, 504);
  assert.equal(result.idempotencyKey, undefined);
});

test("a per-call timeout overrides the client's", async () => {
  const { fetch } = scriptedFetch(["hang"]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch, timeoutMs: 60_000 });
  const result = await client.runs.cancel("run_1", { timeoutMs: 15 });
  assert.equal(result.code, "timeout");
});

test("failures carry the HTTP status, code, upstream status and Retry-After", async () => {
  const { fetch } = scriptedFetch([unavailable({ "retry-after": "5" })]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch });
  const busy = await client.services.invokeOperation("hive-research", "analyses.create", {}, { idempotencyKey: "research-0001" });
  assert.equal(busy.ok, false);
  assert.equal(busy.status, 503);
  assert.equal(busy.upstreamStatus, 503);
  assert.equal(busy.code, "upstream_unavailable");
  assert.equal(busy.serviceId, "hive-research");
  assert.equal(busy.retryAfter, 5);
  assert.equal(busy.retryable, true);
  assert.equal(busy.idempotencyKey, "research-0001");

  const rejected = await new HivemindOSClient({
    apiKey: "hmos_live_t",
    fetch: async () => Response.json({ ok: false, status: 400, upstreamStatus: 400, error: "Missing topic.", code: "upstream_rejected" }, { status: 400 }),
  }).services.invoke("hive-research", "/v1/research", {});
  assert.equal(rejected.status, 400);
  assert.equal(rejected.code, "upstream_rejected");
  assert.equal(rejected.retryable, false);

  const bare = await new HivemindOSClient({
    apiKey: "hmos_live_t",
    fetch: async () => new Response("<html>Bad gateway</html>", { status: 502 }),
  }).projects.list();
  assert.deepEqual({ ok: bare.ok, status: bare.status, code: bare.code, retryable: bare.retryable }, { ok: false, status: 502, code: "bad_gateway", retryable: true });
  assert.equal(bare.error, "HivemindOS request failed with HTTP 502.");

  const noCode = await new HivemindOSClient({
    apiKey: "hmos_live_t",
    fetch: async () => Response.json({ ok: false, error: "Not found." }, { status: 404 }),
  }).runs.get("run_x");
  assert.equal(noCode.status, 404);
  assert.equal(noCode.code, "not_found");
});

test("successful results are passed through untouched", async () => {
  const route = { ok: true, routeId: "r1", status: "filled", filled: true, destinationTransactionHash: null };
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch: async () => Response.json(route) });
  assert.deepEqual(await client.swaps.routeStatus("r1"), route);
});

test("retries are off by default", async () => {
  const { fetch, calls } = scriptedFetch([unavailable(), ok()]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch });
  const result = await client.services.invoke("hive-research", "/v1/research", {});
  assert.equal(result.ok, false);
  assert.equal(calls.length, 1);
});

test("opt-in retries resend the same body under the same generated idempotency key", async () => {
  const { fetch, calls } = scriptedFetch([unavailable(), new Response("", { status: 502 }), ok({ status: 200, result: { done: true } })]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch, retries: 2, retryDelayMs: 1 });
  const result = await client.services.invoke("hive-research", "/v1/research", { topic: "bees" });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 3);
  const keys = calls.map((call) => call.headers.get("idempotency-key"));
  assert.match(keys[0], API_IDEMPOTENCY_KEY);
  assert.deepEqual(new Set(keys).size, 1);
  assert.deepEqual(new Set(calls.map((call) => call.body)).size, 1);

  const second = scriptedFetch([ok()]);
  await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: second.fetch }).services.invoke("hive-research", "/v1/research", { topic: "bees" });
  assert.notEqual(second.calls[0].headers.get("idempotency-key"), keys[0], "a new call gets a new key");
});

test("a caller's idempotency key is reused on every attempt, and exhausted retries report their attempts", async () => {
  const { fetch, calls } = scriptedFetch([unavailable()]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch });
  const result = await client.wallets.create({ name: "Ops", network: "base" }, { idempotencyKey: "wallet-ops-0001", retries: 2, retryDelayMs: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.attempts, 3);
  assert.deepEqual(calls.map((call) => call.headers.get("idempotency-key")), ["wallet-ops-0001", "wallet-ops-0001", "wallet-ops-0001"]);
});

test("a caller's mistake is never retried", async () => {
  for (const status of [400, 401, 402, 403, 404, 409, 422]) {
    const { fetch, calls } = scriptedFetch([Response.json({ ok: false, error: "No." }, { status })]);
    const result = await new HivemindOSClient({ apiKey: "hmos_live_t", fetch, retries: 3, retryDelayMs: 1 }).projects.create({ name: "p" });
    assert.equal(result.status, status);
    assert.equal(calls.length, 1, `HTTP ${status} must not be retried`);
  }
});

test("timeouts and network errors are retried with the same key", async () => {
  const timeout = scriptedFetch(["hang", ok()]);
  const afterTimeout = await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: timeout.fetch, timeoutMs: 20, retries: 1, retryDelayMs: 1 })
    .runs.create({ serviceId: "swarm" });
  assert.equal(afterTimeout.ok, true);
  assert.equal(timeout.calls[0].headers.get("idempotency-key"), timeout.calls[1].headers.get("idempotency-key"));

  const network = scriptedFetch([new TypeError("fetch failed"), ok()]);
  const afterNetwork = await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: network.fetch, retries: 1, retryDelayMs: 1 }).credits.balance();
  assert.equal(afterNetwork.ok, true);
  assert.equal(network.calls.length, 2);

  const down = await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: scriptedFetch([new TypeError("fetch failed")]).fetch }).credits.balance();
  assert.deepEqual({ code: down.code, status: down.status, retryable: down.retryable, attempts: down.attempts }, { code: "network_error", status: 0, retryable: true, attempts: 1 });
});

test("retries wait for Retry-After, and leave a longer wait to the caller", async () => {
  const limited = () => Response.json({ ok: false, code: "rate_limit_exceeded", error: "Slow down.", retryAfterSeconds: 1 }, { status: 429, headers: { "retry-after": "1" } });
  const waited = scriptedFetch([limited, ok()]);
  const started = Date.now();
  const result = await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: waited.fetch, retries: 1, retryDelayMs: 1 }).projects.list();
  assert.equal(result.ok, true);
  assert.ok(Date.now() - started >= 950, "the retry waited for Retry-After");

  const daily = () => Response.json({ ok: false, code: "rate_limit_exceeded", error: "Daily limit.", retryAfterSeconds: 3600 }, { status: 429 });
  const refused = scriptedFetch([daily, ok()]);
  const tooLong = await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: refused.fetch, retries: 3, retryDelayMs: 1 }).projects.list();
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.retryAfter, 3600);
  assert.equal(tooLong.retryAfterSeconds, 3600);
  assert.equal(refused.calls.length, 1);
});

test("Retry-After is read as seconds or as an HTTP date", () => {
  assert.equal(retryAfterSecondsFrom(new Headers({ "retry-after": "7" })), 7);
  const inTenSeconds = new Date(Date.now() + 10_000).toUTCString();
  const fromDate = retryAfterSecondsFrom(new Headers({ "retry-after": inTenSeconds }));
  assert.ok(fromDate >= 8 && fromDate <= 11);
  assert.equal(retryAfterSecondsFrom(new Headers(), { retryAfterSeconds: 4 }), 4);
  assert.equal(retryAfterSecondsFrom(new Headers()), undefined);
});

test("the caller's abort signal cancels the call and is never retried", async () => {
  const { fetch, calls } = scriptedFetch(["hang"]);
  const controller = new AbortController();
  const pending = new HivemindOSClient({ apiKey: "hmos_live_t", fetch, retries: 3, retryDelayMs: 1 }).projects.create({ name: "p" }, { signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls.length, 1);
});

test("reads carry no idempotency key; mutations always do", async () => {
  const { fetch, calls } = scriptedFetch([ok()]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch });
  await client.runs.list();
  await client.projects.archive("project_1");
  await client.databases.uploadPart("transfer_1", 1, new Uint8Array([1, 2, 3]));
  await client.files.upload({ name: "a.txt", contentType: "text/plain", bytes: new Uint8Array([65]) });
  assert.equal(calls[0].headers.get("idempotency-key"), null);
  for (const call of calls.slice(1)) assert.match(call.headers.get("idempotency-key"), API_IDEMPOTENCY_KEY);
});

test("end users are scoped per client or per call, and keys can be bound to one", async () => {
  const { fetch, calls } = scriptedFetch([ok()]);
  const client = new HivemindOSClient({ apiKey: "hmos_live_t", fetch, endUserId: "customer-42" });
  await client.runs.list();
  await client.services.invoke("hive-research", "/v1/research", {}, { endUserId: "customer-7" });
  await client.apiKeys.create({ label: "Customer 7", scopes: ["services:invoke"], endUserId: "customer-7" }, { idempotencyKey: "customer-7-key-1" });
  assert.equal(calls[0].headers.get(HIVEMINDOS_END_USER_HEADER), "customer-42");
  assert.equal(calls[1].headers.get(HIVEMINDOS_END_USER_HEADER), "customer-7");
  assert.equal(JSON.parse(calls[2].body).endUserId, "customer-7");

  const unscoped = scriptedFetch([ok()]);
  await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: unscoped.fetch }).runs.list();
  assert.equal(unscoped.calls[0].headers.get(HIVEMINDOS_END_USER_HEADER), null);

  const bootstrap = scriptedFetch([ok({ apiKey: { id: "key_1", endUserId: "customer-9" }, secret: "hmos_live_s" })]);
  const created = await createHivemindOSApiKey({
    creditToken: "hmos_credit_t",
    label: "Customer 9",
    scopes: ["services:invoke"],
    endUserId: "customer-9",
    idempotencyKey: "customer-9-key-1",
    fetch: bootstrap.fetch,
  });
  assert.equal(created.ok, true);
  assert.equal(JSON.parse(bootstrap.calls[0].body).endUserId, "customer-9");
});

test("key bootstrap retries under its own idempotency key and reports failures", async () => {
  const { fetch, calls } = scriptedFetch([unavailable(), ok({ apiKey: { id: "key_1" }, secret: "hmos_live_s" })]);
  const result = await createHivemindOSApiKey({
    creditToken: "hmos_credit_t",
    label: "Worker",
    scopes: ["services:read"],
    idempotencyKey: "worker-key-0001",
    retries: 1,
    retryDelayMs: 1,
    fetch,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls.map((call) => call.headers.get("idempotency-key")), ["worker-key-0001", "worker-key-0001"]);

  const failed = await createHivemindOSApiKey({
    creditToken: "hmos_credit_t",
    label: "Worker",
    scopes: ["services:read"],
    idempotencyKey: "worker-key-0002",
    fetch: async () => new Response("", { status: 503 }),
  });
  assert.deepEqual({ ok: failed.ok, status: failed.status, code: failed.code }, { ok: false, status: 503, code: "unavailable" });
});

test("downloads keep returning the raw response and throw a typed error on timeout", async () => {
  const served = await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: async () => new Response("bytes") }).files.download("file_1");
  assert.equal(await served.text(), "bytes");

  const { fetch } = scriptedFetch(["hang"]);
  await assert.rejects(
    new HivemindOSClient({ apiKey: "hmos_live_t", fetch, timeoutMs: 15 }).artifacts.download("artifact_1"),
    (error) => error instanceof HivemindOSRequestError && error.code === "timeout" && error.status === 504 && error.attempts === 1,
  );
});

test("invalid reliability options are refused up front", () => {
  assert.throws(() => new HivemindOSClient({ apiKey: "hmos_live_t", fetch: async () => ok(), retries: -1 }), /retries must be/);
  assert.throws(() => new HivemindOSClient({ apiKey: "hmos_live_t", fetch: async () => ok(), retries: 1.5 }), /retries must be/);
  assert.throws(() => new HivemindOSClient({ apiKey: "hmos_live_t", fetch: async () => ok(), timeoutMs: 0 }), /timeoutMs must be/);
});

test("fetch is called unbound, as a browser's window.fetch requires", async () => {
  const receivers = [];
  function strictFetch() {
    receivers.push(this);
    return Promise.resolve(Response.json({ ok: true }));
  }
  await new HivemindOSClient({ apiKey: "hmos_live_t", fetch: strictFetch }).runs.list();
  await createHivemindOSApiKey({ creditToken: "hmos_credit_t", label: "k", scopes: ["services:read"], idempotencyKey: "unbound-key-0001", fetch: strictFetch });
  assert.deepEqual(receivers, [undefined, undefined]);
});
