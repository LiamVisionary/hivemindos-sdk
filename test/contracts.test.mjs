import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_PLUGIN_SCHEMA_ID,
  HIVE_ACTION_RISKS,
  HIVE_ACTION_SIDE_EFFECTS,
  HIVEMINDOS_COMPATIBILITY_VERSION,
  defineConnectorManifest,
  defineHiveActionDescriptor,
  isApiFailure,
} from "../dist/index.js";

test("publishes a stable compatibility version and plugin schema", () => {
  assert.equal(HIVEMINDOS_COMPATIBILITY_VERSION, "1.0.0");
  assert.equal(
    AGENT_PLUGIN_SCHEMA_ID,
    "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  );
});

test("exposes governed action vocabulary", () => {
  assert.deepEqual(HIVE_ACTION_RISKS, ["low", "medium", "high", "critical"]);
  assert.ok(HIVE_ACTION_SIDE_EFFECTS.includes("payment"));
  assert.ok(HIVE_ACTION_SIDE_EFFECTS.includes("public-message"));

  const descriptor = defineHiveActionDescriptor({
    id: "example.read",
    title: "Read example",
    description: "Reads one example resource.",
    inputSchema: { type: "object", additionalProperties: false },
    sideEffects: ["read", "network"],
    risk: "low",
    tags: ["example"],
    readOnly: true,
  });
  assert.equal(descriptor.id, "example.read");
});

test("exposes connector and API-envelope helpers", () => {
  const manifest = defineConnectorManifest({
    key: "example",
    label: "Example",
    detail: "Example connector.",
    tags: ["example"],
    auth: {
      mode: "api-token",
      tokenEnvKey: "EXAMPLE_TOKEN",
      tokenHint: "Create a scoped token.",
      tokenPlaceholder: "token_...",
    },
    operations: [{
      id: "read-example",
      label: "Read example",
      description: "Reads provider data.",
      methods: ["GET"],
      sideEffects: ["read", "network"],
      risk: "low",
      readOnly: true,
    }],
  });

  assert.equal(manifest.key, "example");
  assert.equal(isApiFailure({ ok: false, error: "failed" }), true);
  assert.equal(isApiFailure({ ok: true }), false);
});
