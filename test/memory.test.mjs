import assert from "node:assert/strict";
import test from "node:test";

import { HivemindOSClient, collectMemoryAnswer, memoryAnswerEvents } from "../dist/index.js";

function recordingFetch(respond) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init.headers), body: init.body ? JSON.parse(init.body) : undefined });
    return respond(calls.at(-1));
  };
  return { fetch, calls };
}

function sse(events, { pieces = 1, hold = false } = {}) {
  const bytes = new TextEncoder().encode(events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join(""));
  const size = Math.ceil(bytes.length / pieces);
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      for (let start = 0; start < bytes.length; start += size) controller.enqueue(bytes.slice(start, start + size));
      if (!hold) controller.close();
    },
    cancel() { cancelled = true; },
  });
  return { body, wasCancelled: () => cancelled };
}

test("memory.erase invokes memory.erase for the client's or the call's end user", async () => {
  const { fetch, calls } = recordingFetch(() => Response.json({ ok: true, serviceId: "cloud-superbrain", operationId: "memory.erase", status: 200, chargedCredits: 0, result: { ok: true, erased: true, complete: true, memoriesErased: 4 } }));
  const client = new HivemindOSClient({ apiKey: "hmos_test_key", endUserId: "user-1", fetch });
  const erased = await client.memory.erase();
  assert.equal(erased.ok, true);
  assert.equal(erased.result.memoriesErased, 4);
  assert.equal(erased.chargedCredits, 0);
  assert.equal(calls[0].url, "https://api.hivemindos.app/v1/services/cloud-superbrain/invoke");
  assert.deepEqual(calls[0].body, { operationId: "memory.erase", input: {} });
  assert.equal(calls[0].headers.get("x-hivemindos-end-user"), "user-1");
  assert.ok(calls[0].headers.get("idempotency-key"));
  await client.memory.erase({ endUserId: "user-2" });
  assert.equal(calls[1].headers.get("x-hivemindos-end-user"), "user-2");
});

test("memory.answerStream yields meta, the answer in parts and done, with the charge settled up front", async () => {
  const stream = sse([
    ["meta", { ok: true, stream: true, chargedCredits: 5, citedMemoryIds: ["m1"] }],
    ["delta", { text: "It was " }],
    ["delta", { text: "Tuesday [1]." }],
    ["done", { answer: "It was Tuesday [1].", chargedCredits: 5 }],
  ], { pieces: 9 });
  const { fetch, calls } = recordingFetch(() => new Response(stream.body, { headers: { "content-type": "text/event-stream", "x-hivemindos-credits-charged": "5" } }));
  const client = new HivemindOSClient({ apiKey: "hmos_test_key", fetch });
  const started = await client.memory.answerStream({ query: "when was it?" }, { endUserId: "user-1" });
  assert.equal(started.ok, true);
  assert.equal(started.chargedCredits, 5);
  assert.deepEqual(calls[0].body, { operationId: "memory.answer", input: { query: "when was it?", stream: true } });
  assert.match(calls[0].headers.get("accept"), /text\/event-stream/);
  const types = [];
  let text = "";
  for await (const event of started.events) {
    types.push(event.type);
    if (event.type === "delta") text += event.text;
  }
  assert.deepEqual(types, ["meta", "delta", "delta", "done"]);
  assert.equal(text, "It was Tuesday [1].");
});

test("collectMemoryAnswer reads it whole, and reports an answer cut off by an error", async () => {
  const complete = await collectMemoryAnswer({ events: memoryAnswerEvents(sse([["meta", { ok: true, stream: true, chargedCredits: 5 }], ["delta", { text: "Yes [1]." }], ["done", { answer: "Yes [1].", chargedCredits: 5 }]]).body) });
  assert.deepEqual({ answer: complete.answer, complete: complete.complete, chargedCredits: complete.chargedCredits }, { answer: "Yes [1].", complete: true, chargedCredits: 5 });
  const cut = await collectMemoryAnswer({ events: memoryAnswerEvents(sse([["meta", { ok: true, stream: true, chargedCredits: 5 }], ["delta", { text: "Ye" }], ["error", { error: "stopped", chargedCredits: 5 }]]).body) });
  assert.equal(cut.complete, false);
  assert.equal(cut.answer, "Ye");
  assert.equal(cut.error, "stopped");
});

test("memory.answerStream returns the API's refusal as a failure, and cancel stops a stream mid-read", async () => {
  const refusing = recordingFetch(() => Response.json({ ok: false, error: "No relevant managed memory was found. You were not charged.", status: 404, chargedCredits: 0 }, { status: 404 }));
  const refused = await new HivemindOSClient({ apiKey: "hmos_test_key", fetch: refusing.fetch }).memory.answerStream({ query: "nothing" });
  assert.equal(refused.ok, false);
  assert.equal(refused.status, 404);
  assert.match(refused.error, /not charged/);

  const held = sse([["meta", { ok: true, stream: true, chargedCredits: 5 }], ["delta", { text: "one " }]], { hold: true });
  const streaming = recordingFetch(() => new Response(held.body, { headers: { "content-type": "text/event-stream", "x-hivemindos-credits-charged": "5" } }));
  const started = await new HivemindOSClient({ apiKey: "hmos_test_key", fetch: streaming.fetch }).memory.answerStream({ query: "q" });
  assert.equal(started.ok, true);
  const iterator = started.events[Symbol.asyncIterator]();
  assert.equal((await iterator.next()).value.type, "meta");
  assert.equal((await iterator.next()).value.text, "one ");
  const pending = iterator.next();
  await started.cancel();
  assert.equal((await pending).done, true);
  assert.equal(held.wasCancelled(), true);
});
