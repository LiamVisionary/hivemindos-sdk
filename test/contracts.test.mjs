import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_PLUGIN_SCHEMA_ID,
  HIVE_ACTION_RISKS,
  HIVE_ACTION_SIDE_EFFECTS,
  HIVEMINDOS_COMPATIBILITY_VERSION,
  HIVEMINDOS_PLATFORM_API_BASE_URL,
  HIVEMINDOS_PLATFORM_API_VERSION,
  HIVEMINDOS_PLATFORM_CREDIT_METERED_OPERATION_IDS,
  HIVEMINDOS_PLATFORM_OPERATION_IDS,
  HIVEMINDOS_PLATFORM_SCOPES,
  HIVEMINDOS_PLATFORM_SERVICE_IDS,
  HIVEMINDOS_DATABASE_CONFIRMATIONS,
  HivemindOSClient,
  createHivemindOSApiKey,
  defineConnectorManifest,
  defineHiveActionDescriptor,
  hivemindOSRunCreateOperationId,
  hivemindOSServiceInvocationOperationId,
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

test("publishes the headless SuperAgent API contract", () => {
  assert.equal(HIVEMINDOS_PLATFORM_API_VERSION, "v1");
  assert.equal(HIVEMINDOS_PLATFORM_API_BASE_URL, "https://api.hivemindos.app/v1");
  assert.ok(HIVEMINDOS_PLATFORM_SCOPES.includes("wallets:transact"));
  assert.ok(HIVEMINDOS_PLATFORM_SCOPES.includes("trading:execute"));
  assert.ok(HIVEMINDOS_PLATFORM_SCOPES.includes("databases:read"));
  assert.ok(HIVEMINDOS_PLATFORM_SCOPES.includes("databases:write"));
  assert.ok(HIVEMINDOS_PLATFORM_SCOPES.includes("projects:write"));
  assert.ok(HIVEMINDOS_PLATFORM_SCOPES.includes("files:write"));
  assert.ok(HIVEMINDOS_PLATFORM_SERVICE_IDS.includes("hive-research"));
  assert.ok(HIVEMINDOS_PLATFORM_SERVICE_IDS.includes("managed-wallets"));
  assert.ok(HIVEMINDOS_PLATFORM_SERVICE_IDS.includes("hivemind-database"));
  assert.ok(HIVEMINDOS_PLATFORM_SERVICE_IDS.includes("integration-broker"));
  assert.ok(HIVEMINDOS_PLATFORM_SERVICE_IDS.includes("hive-compute"));
  assert.ok(HIVEMINDOS_PLATFORM_SERVICE_IDS.includes("testnet-faucet"));
  assert.ok(HIVEMINDOS_PLATFORM_OPERATION_IDS.includes("*"));
  assert.ok(HIVEMINDOS_PLATFORM_OPERATION_IDS.includes("wallets.create"));
  assert.ok(HIVEMINDOS_PLATFORM_OPERATION_IDS.includes("services.invoke.hive-research"));
  assert.ok(HIVEMINDOS_PLATFORM_OPERATION_IDS.includes("runs.create.hive-research"));
  assert.equal(hivemindOSServiceInvocationOperationId("hive-research"), "services.invoke.hive-research");
  assert.equal(hivemindOSRunCreateOperationId("hive-research"), "runs.create.hive-research");
  assert.equal(hivemindOSServiceInvocationOperationId("hive-research", "analyses.create"), "services.invoke.hive-research.analyses.create");
  assert.deepEqual(HIVEMINDOS_PLATFORM_CREDIT_METERED_OPERATION_IDS, [
    "wallets.create",
    "wallets.transactions.create",
    "wallets.signatures.create",
    "trading.orders.create",
  ]);
  assert.equal(HIVEMINDOS_DATABASE_CONFIRMATIONS.migrateToCloud, "MOVE DATABASE TO CLOUD");
});

test("SuperAgent API client uses stable routes and never leaks its key into payloads", async () => {
  const calls = [];
  const client = new HivemindOSClient({
    apiKey: "hmos_live_test",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true, wallet: { id: "wallet_1" } }), {
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.wallets.create({ name: "Treasury", network: "base" }, { idempotencyKey: "wallet-create-1" });
  await client.apiKeys.create({
    label: "Research worker",
    scopes: ["services:read", "services:invoke"],
    allowedServices: ["hive-research"],
    allowedOperations: ["services.invoke.hive-research.analyses.create"],
    limits: {
      "*": { requestsPerHour: 500 },
      "services.invoke.hive-research": { requestsPerMinute: 10, maxConcurrent: 2 },
    },
  }, { idempotencyKey: "research-worker-key-1" });
  assert.equal(calls[0].url, "https://api.hivemindos.app/v1/wallets");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer hmos_live_test");
  assert.equal(new Headers(calls[0].init.headers).get("idempotency-key"), "wallet-create-1");
  assert.equal(String(calls[0].init.body).includes("hmos_live_test"), false);
  assert.equal(calls[1].url, "https://api.hivemindos.app/v1/api-keys");
  assert.equal(new Headers(calls[1].init.headers).get("idempotency-key"), "research-worker-key-1");
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    label: "Research worker",
    scopes: ["services:read", "services:invoke"],
    allowedServices: ["hive-research"],
    allowedOperations: ["services.invoke.hive-research.analyses.create"],
    limits: {
      "*": { requestsPerHour: 500 },
      "services.invoke.hive-research": { requestsPerMinute: 10, maxConcurrent: 2 },
    },
  });
  assert.equal(String(calls[1].init.body).includes("hmos_live_test"), false);
});

test("SuperAgent API key bootstrap sends the credit credential only in its protected header", async () => {
  const calls = [];
  const result = await createHivemindOSApiKey({
    creditToken: "hmos_credit_test",
    label: "Backend",
    scopes: ["services:read", "wallets:create"],
    excludedServices: ["managed-trading"],
    projectId: "project_backend",
    excludedOperations: ["trading.orders.create"],
    limits: {
      "*": { requestsPerDay: 10_000 },
      "wallets.create": { requestsPerMinute: 2, creditsPerDay: 100 },
    },
    idempotencyKey: "bootstrap-key-0001",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ ok: true, apiKey: { id: "key_1" }, secret: "hmos_live_created" });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls[0].url, "https://api.hivemindos.app/v1/api-keys");
  assert.equal(new Headers(calls[0].init.headers).get("x-hivemindos-credit-token"), "hmos_credit_test");
  assert.equal(new Headers(calls[0].init.headers).get("idempotency-key"), "bootstrap-key-0001");
  assert.equal(String(calls[0].init.body).includes("hmos_credit_test"), false);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    label: "Backend",
    scopes: ["services:read", "wallets:create"],
    excludedServices: ["managed-trading"],
    projectId: "project_backend",
    excludedOperations: ["trading.orders.create"],
    limits: {
      "*": { requestsPerDay: 10_000 },
      "wallets.create": { requestsPerMinute: 2, creditsPerDay: 100 },
    },
  });
});

test("SuperAgent API client preserves actionable endpoint-limit failures", async () => {
  const client = new HivemindOSClient({
    apiKey: "hmos_live_limited",
    fetch: async () => Response.json({
      ok: false,
      code: "rate_limit_exceeded",
      error: "This API key has reached its request limit for this operation.",
      operationId: "services.invoke.hive-research",
      metric: "requestsPerMinute",
      retryAfterSeconds: 27,
    }, { status: 429, headers: { "retry-after": "27" } }),
  });
  const result = await client.services.invoke("hive-research", "/v1/research", {});
  assert.equal(result.ok, false);
  assert.equal(result.operationId, "services.invoke.hive-research");
  assert.equal(result.metric, "requestsPerMinute");
  assert.equal(result.retryAfterSeconds, 27);
});

test("SuperAgent API client exposes confirmed database writes and binary workspace transfers", async () => {
  const calls = [];
  const client = new HivemindOSClient({
    apiKey: "hmos_live_database_test",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ ok: true, active: true, partNumber: 1, bytes: 4 });
    },
  });

  await client.databases.provision(
    { confirmation: HIVEMINDOS_DATABASE_CONFIRMATIONS.provision },
    { idempotencyKey: "database-provision-1" },
  );
  await client.databases.mutate(
    {
      action: "create-record",
      tableId: 42,
      fields: { Email: "person@example.com" },
      confirmation: HIVEMINDOS_DATABASE_CONFIRMATIONS.createRecord,
    },
    { idempotencyKey: "database-record-1" },
  );
  await client.databases.uploadPart(
    "transfer_1",
    1,
    new Uint8Array([1, 2, 3, 4]),
    { idempotencyKey: "database-part-1" },
  );
  await client.databases.downloadArchive("transfer_1");

  assert.equal(calls[0].url, "https://api.hivemindos.app/v1/databases/account");
  assert.equal(new Headers(calls[0].init.headers).get("idempotency-key"), "database-provision-1");
  assert.match(String(calls[1].init.body), /CREATE DATABASE RECORD/);
  assert.equal(String(calls[1].init.body).includes("hmos_live_database_test"), false);
  assert.equal(calls[2].url, "https://api.hivemindos.app/v1/databases/transfers/transfer_1/parts/1");
  assert.equal(new Headers(calls[2].init.headers).get("content-type"), "application/zip");
  assert.equal(new Headers(calls[2].init.headers).get("content-length"), "4");
  assert.equal(calls[3].url, "https://api.hivemindos.app/v1/databases/transfers/transfer_1/archive");
  assert.equal(new Headers(calls[3].init.headers).get("accept"), "application/zip");
});

test("SuperAgent API client exposes project-scoped capabilities, files, approvals, and webhook delivery controls", async () => {
  const calls = [];
  const client = new HivemindOSClient({
    apiKey: "hmos_live_project_test",
    projectId: "project_product",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ ok: true, capabilities: [], file: { id: "file_1" }, approval: { id: "approval_1" }, deliveries: [] });
    },
  });

  await client.services.list({ probe: true });
  await client.services.invokeOperation("app-hosting", "sites.publish", { siteId: "site_1" }, {
    approvalId: "approval_1",
    connectionId: "connection_hosting",
    idempotencyKey: "invoke-site-publish",
  });
  await client.files.upload({
    name: "brief.txt",
    contentType: "text/plain",
    bytes: new TextEncoder().encode("hello"),
  }, { idempotencyKey: "file-upload-1" });
  await client.approvals.createServiceAction({
    serviceId: "app-hosting",
    operationId: "sites.publish",
    input: { siteId: "site_1" },
    connectionId: "connection_hosting",
  }, { idempotencyKey: "approval-create-1" });
  await client.connections.create({
    name: "Hosting access",
    kind: "api_key",
    serviceId: "app-hosting",
    credentials: { apiKey: "service-credential" },
    metadata: { authMode: "header", credentialField: "apiKey", targetName: "x-service-key" },
  }, { idempotencyKey: "connection-create-1" });
  await client.webhooks.deliveries({ webhookId: "webhook_1", status: "failed", limit: 25 });
  await client.webhooks.rotateSecret("webhook_1", { idempotencyKey: "webhook-rotate-1" });
  await client.services.invokeOperation("hive-compute", "artifacts.upload", {
    encryptedMimeType: "application/json",
    encryptionPublicKeySha256: "a".repeat(64),
    encryptedKey: "ZW5jcnlwdGVkLWtleQ==",
    chunkSize: 5,
    chunks: 1,
  }, {
    pathParameters: { jobId: "job_1", artifactId: "artifact_1" },
    fileIds: ["file_1"],
    idempotencyKey: "compute-artifact-upload-1",
  });

  assert.equal(calls[0].url, "https://api.hivemindos.app/v1/services?probe=true");
  assert.equal(calls[1].url, "https://api.hivemindos.app/v1/services/app-hosting/invoke");
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    operationId: "sites.publish",
    input: { siteId: "site_1" },
    approvalId: "approval_1",
    connectionId: "connection_hosting",
  });
  assert.equal(calls[2].url, "https://api.hivemindos.app/v1/files");
  assert.equal(new Headers(calls[2].init.headers).get("x-file-name"), "brief.txt");
  assert.equal(new Headers(calls[2].init.headers).get("content-length"), "5");
  assert.equal(calls[4].url, "https://api.hivemindos.app/v1/connections");
  assert.equal(JSON.parse(calls[4].init.body).credentials.apiKey, "service-credential");
  assert.equal(calls[5].url, "https://api.hivemindos.app/v1/webhook-deliveries?webhookId=webhook_1&status=failed&limit=25");
  assert.equal(calls[6].url, "https://api.hivemindos.app/v1/webhooks/webhook_1/rotate-secret");
  assert.equal(calls[7].url, "https://api.hivemindos.app/v1/services/hive-compute/invoke");
  assert.deepEqual(JSON.parse(calls[7].init.body), {
    operationId: "artifacts.upload",
    input: {
      encryptedMimeType: "application/json",
      encryptionPublicKeySha256: "a".repeat(64),
      encryptedKey: "ZW5jcnlwdGVkLWtleQ==",
      chunkSize: 5,
      chunks: 1,
    },
    pathParameters: { jobId: "job_1", artifactId: "artifact_1" },
    files: [{ fileId: "file_1" }],
  });
  for (const call of calls) {
    assert.equal(new Headers(call.init?.headers).get("x-hivemindos-project"), "project_product");
    assert.equal(String(call.init?.body || "").includes("hmos_live_project_test"), false);
  }
});
