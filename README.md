# HivemindOS SDK

`@hivemindos/sdk` is the small, stable, public compatibility layer for building integrations that interoperate with HivemindOS.

It contains only:

- API success and failure envelope types;
- a typed client for the hosted HivemindOS Platform API;
- managed-service capability, project, usage, file, connection, database, credit, wallet, trading, run, approval, artifact, webhook, and API-key contracts;
- governed action risk, side-effect, confirmation, and descriptor contracts;
- connector manifest contracts; and
- Agent Plugins compatibility identifiers and manifest types.

It does **not** contain the HivemindOS application, orchestration engine, hosted-service implementation, commercial policy, credentials, or private product source.

## Install

```bash
npm install @hivemindos/sdk
```

## Example

```ts
import { defineHiveActionDescriptor } from "@hivemindos/sdk";

export const readExample = defineHiveActionDescriptor({
  id: "example.read",
  title: "Read example",
  description: "Reads one example resource.",
  inputSchema: { type: "object", additionalProperties: false },
  sideEffects: ["read", "network"],
  risk: "low",
  tags: ["example"],
  readOnly: true,
});
```

## Platform API

Create the first scoped API key from an existing HivemindOS credit account, then use that key with the client:

```ts
import {
  createHivemindOSApiKey,
  HivemindOSClient,
} from "@hivemindos/sdk";

const issued = await createHivemindOSApiKey({
  creditToken: process.env.HIVEMINDOS_CREDIT_TOKEN!,
  label: "Production backend",
  scopes: ["services:read", "services:invoke", "credits:read", "databases:read", "databases:write"],
  allowedServices: ["hive-research", "hivemind-database"],
  allowedOperations: [
    "capabilities.list",
    "services.invoke.hive-research.analyses.create",
    "databases.account.read",
    "databases.query",
  ],
  limits: {
    "*": { requestsPerHour: 1_000, maxConcurrent: 20 },
    "services.invoke.hive-research.analyses.create": { requestsPerMinute: 30, maxConcurrent: 4 },
  },
  idempotencyKey: "production-backend-key-2026-08",
});

if (!issued.ok) throw new Error(issued.error);

const hivemind = new HivemindOSClient({
  apiKey: issued.secret,
  projectId: process.env.HIVEMINDOS_PROJECT_ID,
});
const services = await hivemind.services.list({ probe: true });
const capabilities = await hivemind.services.capabilities("hive-research");
const result = await hivemind.services.invokeOperation(
  "hive-research",
  "analyses.create",
  { question: "What changed in this market?" },
  { idempotencyKey: "research-run-42" },
);
```

API-key policy is immutable and delegated keys may only become narrower. Use `allowedServices` or `excludedServices` for the managed-service boundary and `allowedOperations` or `excludedOperations` for the exact endpoint and capability boundary. Exclusions are immediately resolved to allowlists so newly introduced services and operations do not become accessible by accident. Project-bound keys are permanently isolated to one project and all descendants inherit that binding.

Idempotency is isolated per API key, so sibling keys may safely reuse their own idempotency naming scheme without replaying one another's response or managed action. Signed webhooks inherit their creator key's resolved service boundary, receive only matching service events, and stop receiving deliveries if that key or an ancestor is revoked or expires.

Limits are keyed by the exported `HIVEMINDOS_PLATFORM_OPERATION_IDS`. `"*"` caps the whole key, base selectors such as `"services.invoke"` aggregate matching calls, service selectors cap one managed service, and `hivemindOSServiceInvocationOperationId("hive-research", "analyses.create")` selects one exact capability. Every matching key and ancestor limit is enforced, so child keys cannot bypass a parent budget. Request limits use fixed minute, hour, and day windows; `maxConcurrent` limits in-flight calls. Rate-limited responses return HTTP `429`, `Retry-After`, and the affected operation id; the client preserves typed `operationId`, `metric`, and `retryAfterSeconds` fields on the failed result.

`creditsPerDay` is available on the operations in `HIVEMINDOS_PLATFORM_CREDIT_METERED_OPERATION_IDS`: managed-wallet creation, wallet execution, signing, and managed-trading execution. It reserves the maximum quoted charge before work begins and reconciles the limit to the final charge. Other managed services continue to debit the same authenticated HivemindOS credit account through their owning service.

Managed database access uses dedicated least-privilege scopes and exact confirmations:

```ts
import { HIVEMINDOS_DATABASE_CONFIRMATIONS } from "@hivemindos/sdk";

await hivemind.databases.provision(
  { confirmation: HIVEMINDOS_DATABASE_CONFIRMATIONS.provision },
  { idempotencyKey: "database-workspace-v1" },
);

const workspaces = await hivemind.databases.query({ action: "list-workspaces" });
if (!workspaces.ok) throw new Error(workspaces.error);
```

The default base URL is `https://api.hivemindos.app/v1`. Mutations require an idempotency key. Use separate least-privilege keys for execution and approvals. HivemindOS credits pay for metered managed-service usage; managed database capacity is included with eligible subscriptions. Wallet assets remain separate and fund transfers or trades.

The client also exposes project CRUD, usage and audit queries, 25 MB managed file uploads, protected connection metadata, input-bound service-action approvals, asynchronous runs, wallet and order history, and webhook update, secret-rotation, delivery-receipt, and replay methods.

Hive Compute and testnet faucet operations use the same client and account balance. Invoke their registered operation ids through `services.invokeOperation`; successful responses include the exact `chargedCredits`. Confidential compute inputs can be uploaded as managed ciphertext files and attached to the `artifacts.upload` binary capability with `fileIds`.

## Compatibility policy

The package follows semantic versioning. Additive contract changes are minor releases. Breaking changes require a major release. The `HIVEMINDOS_COMPATIBILITY_VERSION` constant identifies the current public contract generation.

The public repository is generated from one allowlisted directory in the private HivemindOS mainline. It is intentionally one-way: public SDK changes are reviewed in the mainline and then mirrored without exposing unrelated source or private commit history.

## License and marks

The SDK source is MIT licensed. HivemindOS and associated names, logos, icons, HIVE/Honey marks, badges, domains, and official service identities are trademarks of Rizzma Inc. The MIT license does not grant trademark rights. See [TRADEMARK.md](TRADEMARK.md).
