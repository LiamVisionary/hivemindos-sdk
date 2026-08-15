# HivemindOS SDK

`@hivemindos/sdk` is the small, stable, public compatibility layer for building integrations that interoperate with HivemindOS.

It contains only:

- API success and failure envelope types;
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

## Compatibility policy

The package follows semantic versioning. Additive contract changes are minor releases. Breaking changes require a major release. The `HIVEMINDOS_COMPATIBILITY_VERSION` constant identifies the current public contract generation.

The public repository is generated from one allowlisted directory in the private HivemindOS mainline. It is intentionally one-way: public SDK changes are reviewed in the mainline and then mirrored without exposing unrelated source or private commit history.

## License and marks

The SDK source is MIT licensed. HivemindOS and associated names, logos, icons, HIVE/Honey marks, badges, domains, and official service identities are trademarks of Rizzma Inc. The MIT license does not grant trademark rights. See [TRADEMARK.md](TRADEMARK.md).
