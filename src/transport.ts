import type { ApiEnvelope } from "./index.ts";

/**
 * How the SuperAgent API client sends one request: a deadline per attempt,
 * opt-in retries for failures that are worth retrying, and a failure that
 * says what happened (HTTP status, code, upstream status, Retry-After) so a
 * caller can tell "fix the request" (4xx) from "try again later" (429/5xx).
 */

/** Each attempt gets this long before it is abandoned with `code: "timeout"`. */
export const HIVEMINDOS_DEFAULT_TIMEOUT_MS = 60_000;
/** First retry waits about this long; each later one doubles it (with jitter). */
export const HIVEMINDOS_DEFAULT_RETRY_DELAY_MS = 500;
/** No single wait is longer. A Retry-After beyond it is returned, not slept through. */
export const HIVEMINDOS_DEFAULT_MAX_RETRY_DELAY_MS = 30_000;
/** HTTP statuses retried when `retries` is set. Timeouts and network errors are retried too. */
export const HIVEMINDOS_RETRYABLE_STATUSES = [429, 502, 503, 504] as const;
/** Header that scopes a request to one of your own end users. */
export const HIVEMINDOS_END_USER_HEADER = "x-hivemindos-end-user" as const;

const RETRYABLE = new Set<number>(HIVEMINDOS_RETRYABLE_STATUSES);
const MAX_RETRIES = 10;

export type HivemindOSRetryOptions = {
  /** Deadline for each attempt, in milliseconds. Default 60 000. */
  timeoutMs?: number;
  /** Extra attempts after a 429, 502, 503, 504, timeout or network error. Default 0. */
  retries?: number;
  /** Base backoff before the first retry, in milliseconds. Default 500. */
  retryDelayMs?: number;
  /** Longest single wait, in milliseconds. Default 30 000. */
  maxRetryDelayMs?: number;
};

export type HivemindOSTransportErrorCode = "timeout" | "network_error";

/** What every failed result carries, whichever endpoint produced it. */
export type HivemindOSResponseMeta = {
  /** Machine-readable reason, such as `rate_limited`, `upstream_unavailable` or `timeout`. */
  code?: string;
  /** HTTP status of the response. 504 for a client-side timeout, 0 when no response arrived. */
  status?: number;
  /** A managed service's own status, when the failure came from one. */
  upstreamStatus?: number;
  /** Seconds to wait before retrying, from `Retry-After` or the body's `retryAfterSeconds`. */
  retryAfter?: number;
  retryAfterSeconds?: number;
  /** True for 429, 502, 503, 504, timeouts and network errors. */
  retryable?: boolean;
  /** How many attempts were made, including the first. */
  attempts?: number;
  /** The idempotency key every attempt used. Retry later with this same key. */
  idempotencyKey?: string;
};

/** Thrown only where a raw `Response` is returned (downloads) and none arrived. */
export class HivemindOSRequestError extends Error {
  readonly code: HivemindOSTransportErrorCode;
  readonly status: number;
  readonly attempts: number;
  readonly retryable = true;
  constructor(code: HivemindOSTransportErrorCode, message: string, attempts: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HivemindOSRequestError";
    this.code = code;
    this.status = code === "timeout" ? 504 : 0;
    this.attempts = attempts;
  }
}

export type ResolvedRetryPolicy = Required<HivemindOSRetryOptions>;

export function resolveRetryPolicy(...layers: Array<HivemindOSRetryOptions | undefined>): ResolvedRetryPolicy {
  const pick = <K extends keyof HivemindOSRetryOptions>(key: K) => {
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const value = layers[index]?.[key];
      if (value !== undefined) return value;
    }
    return undefined;
  };
  const policy = {
    timeoutMs: pick("timeoutMs") ?? HIVEMINDOS_DEFAULT_TIMEOUT_MS,
    retries: pick("retries") ?? 0,
    retryDelayMs: pick("retryDelayMs") ?? HIVEMINDOS_DEFAULT_RETRY_DELAY_MS,
    maxRetryDelayMs: pick("maxRetryDelayMs") ?? HIVEMINDOS_DEFAULT_MAX_RETRY_DELAY_MS,
  };
  if (!Number.isFinite(policy.timeoutMs) || policy.timeoutMs <= 0) throw new Error("timeoutMs must be a positive number of milliseconds.");
  if (!Number.isInteger(policy.retries) || policy.retries < 0 || policy.retries > MAX_RETRIES) throw new Error(`retries must be a whole number from 0 to ${MAX_RETRIES}.`);
  if (!Number.isFinite(policy.retryDelayMs) || policy.retryDelayMs < 0) throw new Error("retryDelayMs must be zero or more milliseconds.");
  if (!Number.isFinite(policy.maxRetryDelayMs) || policy.maxRetryDelayMs < 0) throw new Error("maxRetryDelayMs must be zero or more milliseconds.");
  return policy;
}

/** A fresh key in the format the API accepts (8-200 of `A-Za-z0-9:._-`). */
export function generateIdempotencyKey(): string {
  const random = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `hmos_sdk_${random}`;
}

/** Seconds from a `Retry-After` header (delta-seconds or an HTTP date), else from a body's `retryAfterSeconds`. */
export function retryAfterSecondsFrom(headers: Headers | null, body?: unknown): number | undefined {
  const header = headers?.get("retry-after")?.trim() ?? "";
  if (/^\d{1,9}$/u.test(header)) return Number(header);
  if (header) {
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }
  const fromBody = body && typeof body === "object" ? (body as { retryAfterSeconds?: unknown }).retryAfterSeconds : undefined;
  return typeof fromBody === "number" && Number.isFinite(fromBody) && fromBody >= 0 ? fromBody : undefined;
}

const STATUS_CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  402: "payment_required",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  413: "payload_too_large",
  429: "rate_limited",
  502: "bad_gateway",
  503: "unavailable",
  504: "gateway_timeout",
};

function codeForStatus(status: number) {
  return STATUS_CODES[status] ?? (status >= 500 ? "server_error" : "http_error");
}

function backoffMs(policy: ResolvedRetryPolicy, retryNumber: number) {
  const ceiling = Math.min(policy.maxRetryDelayMs, policy.retryDelayMs * 2 ** (retryNumber - 1));
  return ceiling / 2 + Math.random() * (ceiling / 2);
}

function abortReason(signal: AbortSignal) {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortReason(signal));
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal as AbortSignal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener("abort", onAbort); resolve(value); },
      (error: unknown) => { signal.removeEventListener("abort", onAbort); reject(error); },
    );
  });
}

export type TransportRequest = {
  fetcher: typeof globalThis.fetch;
  url: string;
  method: string;
  headers: Headers;
  /** Resent unchanged on every attempt, so it must not be a one-shot stream. */
  body?: string | Uint8Array<ArrayBuffer>;
  policy: ResolvedRetryPolicy;
  /** The caller's own cancel. Aborting it throws its reason, as fetch does; it is never retried. */
  signal?: AbortSignal;
};

type Attempt<T> =
  | { kind: "response"; response: Response; value: T; attempts: number }
  | { kind: "error"; code: HivemindOSTransportErrorCode; cause: unknown; attempts: number };

/**
 * Send with a deadline per attempt and the policy's retries. `read` runs while
 * the deadline still applies, so a response whose body stalls also times out.
 */
async function sendWithRetries<T>(request: TransportRequest, read: (response: Response) => Promise<T>, bodyOf: (value: T) => unknown): Promise<Attempt<T>> {
  const { policy, signal } = request;
  for (let attempt = 1; ; attempt += 1) {
    if (signal?.aborted) throw abortReason(signal);
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException("The request timed out.", "TimeoutError"));
    }, policy.timeoutMs);
    const onAbort = () => controller.abort(abortReason(signal as AbortSignal));
    signal?.addEventListener("abort", onAbort, { once: true });
    let outcome: Attempt<T>;
    try {
      // Raced against the deadline too, so a custom fetch that ignores its signal cannot hang the call.
      const { response, value } = await untilAborted((async () => {
        // Called unbound: a browser's fetch refuses any `this` but the window (or none).
        const fetcher = request.fetcher;
        const response = await fetcher(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        });
        return { response, value: await read(response) };
      })(), controller.signal);
      outcome = { kind: "response", response, value, attempts: attempt };
    } catch (error) {
      if (signal?.aborted) throw abortReason(signal);
      outcome = { kind: "error", code: timedOut ? "timeout" : "network_error", cause: error, attempts: attempt };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
    const retryable = outcome.kind === "error" || RETRYABLE.has(outcome.response.status);
    if (!retryable || attempt > policy.retries) return outcome;
    const retryAfter = outcome.kind === "response" ? retryAfterSecondsFrom(outcome.response.headers, bodyOf(outcome.value)) : undefined;
    const retryAfterMs = retryAfter === undefined ? 0 : retryAfter * 1000;
    // A wait longer than the caller allowed is theirs to schedule: return it with `retryAfter`.
    if (retryAfterMs > policy.maxRetryDelayMs) return outcome;
    if (outcome.kind === "response") await outcome.response.body?.cancel().catch(() => undefined);
    await sleep(Math.max(backoffMs(policy, attempt), retryAfterMs), signal);
  }
}

async function readJson(response: Response): Promise<unknown> {
  // text() rather than json(): a body cut off by the deadline must reject, not read as "invalid".
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isEnvelope(value: unknown): value is { ok: boolean } & Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && typeof (value as { ok?: unknown }).ok === "boolean";
}

function transportFailureMessage(code: HivemindOSTransportErrorCode, policy: ResolvedRetryPolicy) {
  return code === "timeout"
    ? `HivemindOS did not answer within ${Math.round(policy.timeoutMs / 1000)} seconds. It is safe to retry with the same idempotency key.`
    : "HivemindOS could not be reached. Check the connection and retry with the same idempotency key.";
}

/**
 * One JSON API call. Never throws for an HTTP failure, a timeout or a network
 * error: each comes back as `{ ok: false, error, code, status, ... }`. Only the
 * caller's own abort signal throws.
 */
export async function requestEnvelope<TSuccess extends Record<string, unknown>, TFailure extends Record<string, unknown>>(
  request: TransportRequest,
): Promise<ApiEnvelope<TSuccess, TFailure & HivemindOSResponseMeta>> {
  type Result = ApiEnvelope<TSuccess, TFailure & HivemindOSResponseMeta>;
  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  const outcome = await sendWithRetries(request, readJson, (value) => value);
  if (outcome.kind === "error") {
    return {
      ok: false,
      error: transportFailureMessage(outcome.code, request.policy),
      code: outcome.code,
      status: outcome.code === "timeout" ? 504 : 0,
      retryable: true,
      attempts: outcome.attempts,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    } as unknown as Result;
  }
  const { response, value, attempts } = outcome;
  if (isEnvelope(value) && value.ok) return value as unknown as Result;
  const payload = isEnvelope(value) ? value : null;
  const status = typeof payload?.status === "number" ? payload.status : response.status;
  const retryAfter = retryAfterSecondsFrom(response.headers, payload);
  return {
    ...(payload ?? {}),
    ok: false,
    error: typeof payload?.error === "string" && payload.error
      ? payload.error
      : response.ok ? "HivemindOS returned an invalid response." : `HivemindOS request failed with HTTP ${response.status}.`,
    code: typeof payload?.code === "string" && payload.code ? payload.code : payload || !response.ok ? codeForStatus(status) : "invalid_response",
    // A payload may use `status` for its own meaning; only a number is the HTTP status.
    ...(payload && "status" in payload && typeof payload.status !== "number" ? {} : { status }),
    ...(retryAfter !== undefined ? { retryAfter } : {}),
    retryable: RETRYABLE.has(status) || RETRYABLE.has(response.status),
    attempts,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  } as unknown as Result;
}

/**
 * One call whose response is passed through as it is (a download). The
 * deadline covers the wait for the response to start; retries apply as above.
 * A timeout or network error throws `HivemindOSRequestError`.
 */
export async function requestRaw(request: TransportRequest): Promise<Response> {
  const outcome = await sendWithRetries(request, async (response) => response, () => undefined);
  if (outcome.kind === "error") {
    throw new HivemindOSRequestError(outcome.code, transportFailureMessage(outcome.code, request.policy), outcome.attempts, { cause: outcome.cause });
  }
  return outcome.response;
}
