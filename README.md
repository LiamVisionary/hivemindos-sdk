# HivemindOS SDK

`@hivemindos/sdk` is the small, stable, public compatibility layer for building integrations that interoperate with HivemindOS.

It contains only:

- API success and failure envelope types;
- a typed client for the hosted HivemindOS Platform API;
- managed-service, database, credit, wallet, trading, run, approval, artifact, webhook, and API-key contracts;
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
  limits: {
    "*": { requestsPerHour: 1_000, maxConcurrent: 20 },
    "services.invoke.hive-research": { requestsPerMinute: 30, maxConcurrent: 4 },
  },
  idempotencyKey: "production-backend-key-2026-08",
});

if (!issued.ok) throw new Error(issued.error);

const hivemind = new HivemindOSClient({ apiKey: issued.secret });
const services = await hivemind.services.list();
const result = await hivemind.services.invoke(
  "hive-research",
  "/v1/research",
  { question: "What changed in this market?" },
  { idempotencyKey: "research-run-42" },
);
```

API-key policy is immutable and delegated keys may only become narrower. Use `allowedServices` for an explicit service allowlist, or `excludedServices` as creation-time shorthand; the latter is immediately resolved to an allowlist so newly introduced services do not become accessible by accident. A child key inherits its parent's service boundary when neither field is supplied.

Idempotency is isolated per API key, so sibling keys may safely reuse their own idempotency naming scheme without replaying one another's response or managed action. Signed webhooks inherit their creator key's resolved service boundary, receive only matching service events, and stop receiving deliveries if that key or an ancestor is revoked or expires.

Limits are keyed by the exported `HIVEMINDOS_PLATFORM_OPERATION_IDS`. `"*"` caps the whole key, base selectors such as `"services.invoke"` aggregate all matching managed-service calls, and exact selectors such as `hivemindOSServiceInvocationOperationId("hive-research")` cap one service operation. Every matching key and ancestor limit is enforced, so child keys cannot bypass a parent budget. Request limits use fixed minute, hour, and day windows; `maxConcurrent` limits in-flight calls. Rate-limited responses return HTTP `429`, `Retry-After`, and the affected operation id; the client preserves typed `operationId`, `metric`, and `retryAfterSeconds` fields on the failed result.

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

## Compatibility policy

The package follows semantic versioning. Additive contract changes are minor releases. Breaking changes require a major release. The `HIVEMINDOS_COMPATIBILITY_VERSION` constant identifies the current public contract generation.

The public repository is generated from one allowlisted directory in the private HivemindOS mainline. It is intentionally one-way: public SDK changes are reviewed in the mainline and then mirrored without exposing unrelated source or private commit history.

## License and marks

The SDK source is MIT licensed. HivemindOS and associated names, logos, icons, HIVE/Honey marks, badges, domains, and official service identities are trademarks of Rizzma Inc. The MIT license does not grant trademark rights. See [TRADEMARK.md](TRADEMARK.md).
