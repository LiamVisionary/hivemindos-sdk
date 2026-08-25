export const HIVEMINDOS_COMPATIBILITY_VERSION = "1.0.0" as const;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ApiSuccess<T extends Record<string, unknown> = Record<string, never>> = {
  ok: true;
} & T;

export type ApiFailure<T extends Record<string, unknown> = Record<string, never>> = {
  ok: false;
  error: string;
} & T;

export type ApiEnvelope<
  TSuccess extends Record<string, unknown> = Record<string, never>,
  TFailure extends Record<string, unknown> = Record<string, never>,
> = ApiSuccess<TSuccess> | ApiFailure<TFailure>;

export function isApiFailure(value: unknown): value is ApiFailure {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as { ok?: unknown }).ok === false
    && typeof (value as { error?: unknown }).error === "string";
}

export const HIVE_ACTION_SIDE_EFFECTS = [
  "read",
  "write",
  "filesystem",
  "network",
  "remote-machine",
  "wallet",
  "payment",
  "credential",
  "public-message",
] as const;

export type HiveActionSideEffect = (typeof HIVE_ACTION_SIDE_EFFECTS)[number];

export const HIVE_ACTION_RISKS = ["low", "medium", "high", "critical"] as const;

export type HiveActionRisk = (typeof HIVE_ACTION_RISKS)[number];

export type HiveActionConfirmation =
  | false
  | {
      token?: string;
      tokens?: string[];
      reason: string;
      when?: "always" | "unless-auto-policy-allows";
    };

export type HiveActionLoadHint = {
  type: "file" | "api" | "none";
  target?: string;
  note?: string;
};

export type HiveActionMcpConfig = {
  expose: boolean;
  compact?: boolean;
  toolName?: string;
};

export type HiveActionContextIndexConfig = {
  summary: string;
  retrievalText: string;
  route?: string;
  methods?: string[];
  load?: HiveActionLoadHint;
};

export type HiveActionDescriptor = {
  id: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  sideEffects: HiveActionSideEffect[];
  risk: HiveActionRisk;
  tags: string[];
  aliases?: string[];
  readOnly?: boolean;
  mcp?: HiveActionMcpConfig;
  contextIndex?: HiveActionContextIndexConfig;
  confirmation?: HiveActionConfirmation;
  requiredClaims?: string[];
};

export function defineHiveActionDescriptor<const TDescriptor extends HiveActionDescriptor>(
  descriptor: TDescriptor,
): TDescriptor {
  return descriptor;
}

export type ConnectorAuthMode = "api-token" | "oauth-refresh-token" | "oauth-user-token";

export type ConnectorSetupField = {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  required: boolean;
  envKey: string;
};

export type ConnectorAuthManifest = {
  mode: ConnectorAuthMode;
  tokenEnvKey: string;
  tokenEnvAliases?: string[];
  tokenHint: string;
  tokenPlaceholder: string;
  oauthClientEnvKeys?: string[];
  setupFields?: ConnectorSetupField[];
};

export type ConnectorOperationManifest = {
  id: string;
  label: string;
  description: string;
  methods: string[];
  sideEffects: HiveActionSideEffect[];
  risk: HiveActionRisk;
  readOnly?: boolean;
  requiredClaims?: string[];
};

export type ConnectorManifest<TProviderKey extends string = string> = {
  key: TProviderKey;
  label: string;
  detail: string;
  tags: string[];
  auth: ConnectorAuthManifest;
  operations: ConnectorOperationManifest[];
};

export function defineConnectorManifest<
  const TProviderKey extends string,
  const TManifest extends ConnectorManifest<TProviderKey>,
>(manifest: TManifest): TManifest {
  return manifest;
}

export * from "./platform.js";

export const AGENT_PLUGINS_VERSION = "1.0.0" as const;
export const AGENT_PLUGIN_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json" as const;
export const AGENT_PLUGIN_MCP_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json" as const;

export type AgentPluginManifest = {
  $schema: typeof AGENT_PLUGIN_SCHEMA_ID;
  name: string;
  version?: string;
  description?: string;
  author?: { name?: string; email?: string; url?: string };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  extensions?: Record<string, unknown>;
};
