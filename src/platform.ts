import type { ApiEnvelope, JsonValue } from "./index.ts";

export const HIVEMINDOS_PLATFORM_API_VERSION = "v1" as const;
export const HIVEMINDOS_PLATFORM_API_BASE_URL = "https://api.hivemindos.app/v1" as const;
export const HIVEMINDOS_SUPERAGENT_MCP_URL = "https://api.hivemindos.app/mcp" as const;

export const HIVEMINDOS_PLATFORM_SCOPES = [
  "services:read",
  "services:invoke",
  "credits:read",
  "credits:write",
  "projects:read",
  "projects:write",
  "usage:read",
  "audit:read",
  "files:read",
  "files:write",
  "connections:read",
  "connections:write",
  "databases:read",
  "databases:write",
  "wallets:read",
  "wallets:create",
  "wallets:sign",
  "wallets:transact",
  "trading:read",
  "trading:execute",
  "runs:read",
  "runs:write",
  "approvals:read",
  "approvals:write",
  "artifacts:read",
  "webhooks:read",
  "webhooks:write",
  "api_keys:manage",
] as const;

export type HivemindOSPlatformScope = (typeof HIVEMINDOS_PLATFORM_SCOPES)[number];

export const HIVEMINDOS_PLATFORM_SERVICE_IDS = [
  "hive-research",
  "answer-engine",
  "swarm",
  "x-studio",
  "distill",
  "x-api",
  "x-transcript",
  "reddit-voc",
  "media-studio",
  "photo-keyworder",
  "app-hosting",
  "hive-compute",
  "gpu-rentals",
  "managed-bookings",
  "managed-socials",
  "hivemind-analytics",
  "hivemind-database",
  "token-autopsy",
  "wallet-risk",
  "copy-trading",
  "hive-bridge",
  "outbound-email",
  "integration-broker",
  "testnet-faucet",
  "miroshark",
  "managed-models",
  "cloud-superbrain",
  "leadgen-data",
  "managed-wallets",
  "managed-trading",
  "managed-agents",
  "managed-workflows",
] as const;

export type HivemindOSPlatformServiceId = (typeof HIVEMINDOS_PLATFORM_SERVICE_IDS)[number];

const HIVEMINDOS_PLATFORM_STATIC_OPERATION_IDS = [
  "services.list",
  "capabilities.list",
  "actions.list",
  "services.invoke",
  "credits.balance.read",
  "credits.x402.topUp",
  "projects.list",
  "projects.create",
  "projects.read",
  "projects.update",
  "projects.archive",
  "usage.read",
  "auditEvents.list",
  "files.list",
  "files.create",
  "files.read",
  "files.delete",
  "connections.list",
  "connections.create",
  "connections.read",
  "connections.update",
  "connections.delete",
  "apiKeys.list",
  "apiKeys.create",
  "apiKeys.revoke",
  "databases.account.read",
  "databases.account.provision",
  "databases.account.deprovision",
  "databases.query",
  "databases.actions",
  "databases.transfers.create",
  "databases.transfers.part.upload",
  "databases.transfers.complete",
  "databases.transfers.archive",
  "databases.transfers.read",
  "databases.transfers.cancel",
  "wallets.list",
  "wallets.create",
  "wallets.read",
  "wallets.balances.read",
  "wallets.policy.update",
  "wallets.transactions.quote",
  "wallets.transactions.create",
  "wallets.transactions.list",
  "wallets.transactions.read",
  "wallets.signatures.quote",
  "wallets.signatures.create",
  "trading.quotes.create",
  "trading.orders.create",
  "trading.orders.list",
  "trading.orders.read",
  "trading.positions.list",
  "runs.list",
  "runs.create",
  "runs.read",
  "runs.cancel",
  "approvals.list",
  "approvals.create",
  "approvals.decide",
  "artifacts.list",
  "artifacts.content.read",
  "webhooks.list",
  "webhooks.create",
  "webhooks.update",
  "webhooks.rotate",
  "webhooks.disable",
  "webhookDeliveries.list",
  "webhookDeliveries.replay",
] as const;

export type HivemindOSPlatformOperationId =
  | "*"
  | (typeof HIVEMINDOS_PLATFORM_STATIC_OPERATION_IDS)[number]
  | `services.invoke.${HivemindOSPlatformServiceId}`
  | `services.invoke.${HivemindOSPlatformServiceId}.${string}`
  | `runs.create.${HivemindOSPlatformServiceId}`
  | `runs.create.${HivemindOSPlatformServiceId}.${string}`;

export function hivemindOSServiceInvocationOperationId(
  serviceId: HivemindOSPlatformServiceId,
  operationId?: string,
): `services.invoke.${HivemindOSPlatformServiceId}` | `services.invoke.${HivemindOSPlatformServiceId}.${string}` {
  return operationId ? `services.invoke.${serviceId}.${operationId}` : `services.invoke.${serviceId}`;
}

export function hivemindOSRunCreateOperationId(
  serviceId: HivemindOSPlatformServiceId,
  operationId?: string,
): `runs.create.${HivemindOSPlatformServiceId}` | `runs.create.${HivemindOSPlatformServiceId}.${string}` {
  return operationId ? `runs.create.${serviceId}.${operationId}` : `runs.create.${serviceId}`;
}

export const HIVEMINDOS_PLATFORM_OPERATION_IDS: readonly HivemindOSPlatformOperationId[] = Object.freeze([
  "*",
  ...HIVEMINDOS_PLATFORM_STATIC_OPERATION_IDS,
  ...HIVEMINDOS_PLATFORM_SERVICE_IDS.flatMap((serviceId) => [
    hivemindOSServiceInvocationOperationId(serviceId),
    hivemindOSRunCreateOperationId(serviceId),
  ]),
]);

export const HIVEMINDOS_PLATFORM_CREDIT_METERED_OPERATION_IDS = [
  "wallets.create",
  "wallets.transactions.create",
  "wallets.signatures.create",
  "trading.orders.create",
] as const satisfies readonly HivemindOSPlatformOperationId[];

export type HivemindOSEndpointLimit = {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  maxConcurrent?: number;
  creditsPerDay?: number;
};

export type HivemindOSApiKeyLimits = Partial<Record<HivemindOSPlatformOperationId, HivemindOSEndpointLimit>>;

export type HivemindOSPlatformFailure = {
  code?: string;
  operationId?: HivemindOSPlatformOperationId;
  metric?: keyof HivemindOSEndpointLimit;
  retryAfterSeconds?: number;
};

export type HivemindOSApiKeyServiceSelection =
  | { allowedServices?: HivemindOSPlatformServiceId[]; excludedServices?: never }
  | { allowedServices?: never; excludedServices?: HivemindOSPlatformServiceId[] };

export type HivemindOSApiKeyOperationSelection =
  | { allowedOperations?: HivemindOSPlatformOperationId[]; excludedOperations?: never }
  | { allowedOperations?: never; excludedOperations?: HivemindOSPlatformOperationId[] };

export type HivemindOSApiKeyCreate = {
  label: string;
  scopes: HivemindOSPlatformScope[];
  expiresAt?: string;
  projectId?: string;
  limits?: HivemindOSApiKeyLimits;
} & HivemindOSApiKeyServiceSelection & HivemindOSApiKeyOperationSelection;

export type HivemindOSPlatformService = {
  id: HivemindOSPlatformServiceId;
  name: string;
  description: string;
  category: "agent" | "app" | "data" | "finance" | "integration" | "media" | "platform";
  status: "available" | "coming-soon" | "setup-required" | "unavailable";
  operationCount: number;
  capabilitiesUrl: string;
  operations: Array<{
    id: string;
    method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
    path: string;
    scope: HivemindOSPlatformScope;
    limitOperationId: HivemindOSPlatformOperationId;
    description: string;
  }>;
};

export type HivemindOSManagedCapability = {
  id: string;
  operationId: HivemindOSPlatformOperationId;
  runOperationId: HivemindOSPlatformOperationId | null;
  serviceId: HivemindOSPlatformServiceId;
  name: string;
  description: string;
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
  mode: "read" | "write" | "execute";
  idempotent: boolean;
  approval: "never" | "policy" | "always";
  asynchronous: boolean;
  requestFormat: "json" | "multipart" | "binary";
};

export type HivemindOSPlatformAction = {
  actionId: HivemindOSPlatformOperationId;
  operationId: string;
  serviceId: HivemindOSPlatformServiceId | null;
  kind: "rest" | "service" | "run";
  name: string;
  description: string;
  mode: "read" | "write" | "execute";
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
  requiredScope: HivemindOSPlatformScope | null;
  idempotent: boolean;
  destructive: boolean;
  approval: "never" | "policy" | "always";
  asynchronous: boolean;
  requestFormat: "json" | "multipart" | "binary";
  invocation: Record<string, unknown>;
  input: Record<string, unknown>;
};

export type HivemindOSManagedInvocation<TResult = JsonValue> = {
  serviceId: HivemindOSPlatformServiceId;
  operationId: string | null;
  status: number;
  chargedCredits: number;
  result: TResult;
};

export type HivemindOSProject = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type HivemindOSUsage = {
  projectId: string | null;
  requests: number;
  failures: number;
  chargedCredits: number;
  averageDurationMs: number;
  operations: Array<{
    operationId: HivemindOSPlatformOperationId;
    requests: number;
    failures: number;
    chargedCredits: number;
    averageDurationMs: number;
  }>;
};

export type HivemindOSAuditEvent = {
  id: string;
  projectId: string | null;
  apiKeyId: string;
  operationId: HivemindOSPlatformOperationId;
  serviceId: HivemindOSPlatformServiceId | null;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  chargedCredits: number;
  createdAt: string;
};

export type HivemindOSFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  purpose: string | null;
  status: "active" | "deleted";
  createdAt: string;
  updatedAt: string;
  downloadUrl: string | null;
};

export type HivemindOSConnection = {
  id: string;
  name: string;
  kind: "api_key" | "oauth" | "wallet" | "database" | "mcp" | "custom";
  serviceId: HivemindOSPlatformServiceId | null;
  status: "active" | "disabled" | "deleted";
  credentialFields: string[];
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
};

export type HivemindOSCreditsBalance = {
  accountId: string;
  balanceCredits: number;
  totalCreditedCredits: number;
  totalDebitedCredits: number;
  updatedAt: string;
};

export type HivemindOSCreditTopUp = {
  creditedUsd: number;
  creditedCredits: number;
  receiptId: string | null;
  credits: HivemindOSCreditsBalance;
};

export const HIVEMINDOS_DATABASE_CONFIRMATIONS = {
  provision: "CREATE MANAGED DATABASE",
  deprovision: "DELETE MANAGED DATABASE",
  createRecord: "CREATE DATABASE RECORD",
  updateRecord: "UPDATE DATABASE RECORD",
  deleteRecord: "DELETE DATABASE RECORD",
  createDatabase: "CREATE DATABASE",
  createTable: "CREATE DATABASE TABLE",
  createField: "CREATE DATABASE FIELD",
  deleteDatabase: "DELETE DATABASE",
  deleteTable: "DELETE DATABASE TABLE",
  deleteField: "DELETE DATABASE FIELD",
  migrateToCloud: "MOVE DATABASE TO CLOUD",
  migrateToLocal: "MOVE DATABASE TO THIS DEVICE",
} as const;

export type HivemindOSDatabaseLimits = {
  workspaces: number;
  databases: number;
  tables: number;
  rows: number;
  storageMb: number;
  transferBytesPerMonth: number;
  operationsPerMonth: number;
};

export type HivemindOSDatabaseUsage = {
  month: string;
  databases: number;
  tables: number;
  rows: number;
  storageMb: number;
  operations: number;
  transferBytes: number;
  limits: HivemindOSDatabaseLimits;
};

export type HivemindOSDatabaseAccount = {
  active: boolean;
  tier: "plus" | "pro" | "max";
  limits: HivemindOSDatabaseLimits;
  usage: HivemindOSDatabaseUsage | null;
  portability: { localToCloud: true; cloudToLocal: true; sourcePreserved: true };
};

export type HivemindOSDatabaseQuery =
  | { action: "list-workspaces" }
  | { action: "list-databases"; workspaceId: number }
  | { action: "list-tables"; databaseId: number }
  | { action: "list-fields"; tableId: number }
  | { action: "list-records"; tableId: number; page?: number; pageSize?: number; search?: string; orderBy?: string }
  | { action: "get-record"; tableId: number; recordId: number };

export type HivemindOSDatabaseAction =
  | { action: "create-database"; workspaceId: number; name: string; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.createDatabase }
  | { action: "create-table"; databaseId: number; name: string; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.createTable }
  | { action: "create-field"; tableId: number; name: string; fieldType: "text" | "long_text" | "number" | "boolean" | "date" | "url" | "email" | "phone_number" | "file"; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.createField }
  | { action: "delete-database"; databaseId: number; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.deleteDatabase }
  | { action: "delete-table"; tableId: number; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.deleteTable }
  | { action: "delete-field"; fieldId: number; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.deleteField }
  | { action: "create-record"; tableId: number; fields: Record<string, JsonValue>; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.createRecord }
  | { action: "update-record"; tableId: number; recordId: number; fields: Record<string, JsonValue>; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.updateRecord }
  | { action: "delete-record"; tableId: number; recordId: number; confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.deleteRecord };

export type HivemindOSDatabaseTransfer = {
  id: string;
  direction: "to-cloud" | "to-local";
  state: "uploading" | "processing" | "ready" | "complete" | "failed" | "cancelled";
  fileName: string;
  expectedBytes: number | null;
  actualBytes: number;
  sha256: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  archiveReady: boolean;
};

export type HivemindOSApiKey = {
  id: string;
  label: string;
  prefix: string;
  scopes: HivemindOSPlatformScope[];
  status: "active" | "revoked";
  parentKeyId: string | null;
  projectId: string | null;
  allowedServices: HivemindOSPlatformServiceId[] | null;
  allowedOperations: HivemindOSPlatformOperationId[] | null;
  limits: HivemindOSApiKeyLimits;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ManagedWalletNetwork = "base" | "base-sepolia" | "ethereum" | "ethereum-sepolia" | "solana" | "solana-devnet";

export type ManagedWalletPolicy = {
  enabled: boolean;
  allowedNetworks: ManagedWalletNetwork[];
  allowedAssets: string[];
  allowedRecipients: string[];
  allowedContracts: string[];
  maxTransactionUsd: number;
  maxDailyUsd: number;
  requireApprovalAboveUsd: number;
};

export type HivemindOSManagedWallet = {
  id: string;
  name: string;
  address: string;
  network: ManagedWalletNetwork;
  kind: "agent" | "user";
  status: "active" | "disabled";
  policy: ManagedWalletPolicy;
  createdAt: string;
  updatedAt: string;
};

export type ManagedWalletBalance = {
  asset: string;
  amount: string;
  amountUsd: number | null;
  network: ManagedWalletNetwork;
};

export type ManagedWalletTransactionRequest = {
  kind: "send" | "swap";
  network: ManagedWalletNetwork;
  asset?: string;
  amount?: string;
  recipient?: string;
  fromAsset?: string;
  toAsset?: string;
  slippageBps?: number;
};

export type ManagedWalletTransactionQuote = {
  id: string;
  walletId: string;
  request: ManagedWalletTransactionRequest;
  maximumDebitCredits: number;
  estimatedNetworkFeeUsd: number | null;
  expiresAt: string;
  approvalRequired: boolean;
  approvalId: string | null;
};

export type ManagedWalletSignatureQuote = {
  id: string;
  walletId: string;
  message: string;
  maximumDebitCredits: number;
  expiresAt: string;
  approvalRequired: true;
  approvalId: string;
};

export type ManagedWalletSignature = {
  id: string;
  walletId: string;
  quoteId: string;
  signature: string;
  chargedCredits: number;
  createdAt: string;
};

export type ManagedWalletTransaction = {
  id: string;
  walletId: string;
  kind: ManagedWalletTransactionRequest["kind"];
  status: "approval_required" | "broadcast" | "confirmed" | "failed" | "rejected";
  transactionHash: string | null;
  approvalId: string | null;
  chargedCredits: number;
  createdAt: string;
  updatedAt: string;
};

export type ManagedTradingQuoteRequest = {
  walletId: string;
  market: string;
  side: "buy" | "sell";
  amount: string;
  amountType: "asset" | "quote";
  orderType?: "market" | "limit";
  limitPrice?: string;
  slippageBps?: number;
};

export type ManagedTradingQuote = {
  id: string;
  request: ManagedTradingQuoteRequest;
  estimatedFillPrice: string | null;
  estimatedOutputAmount: string | null;
  maximumDebitCredits: number;
  expiresAt: string;
  approvalRequired: boolean;
  approvalId: string | null;
};

export type ManagedTradingOrder = {
  id: string;
  quoteId: string;
  walletId: string;
  market: string;
  side: "buy" | "sell";
  status: "approval_required" | "submitted" | "filled" | "partially_filled" | "cancelled" | "failed";
  providerOrderId: string | null;
  approvalId: string | null;
  chargedCredits: number;
  createdAt: string;
  updatedAt: string;
};

export type ManagedTradingPosition = {
  walletId: string;
  market: string;
  quantity: string;
  averageEntryPrice: string | null;
  currentPrice: string | null;
  unrealizedPnlUsd: number | null;
};

export type HivemindOSRun = {
  id: string;
  serviceId: HivemindOSPlatformServiceId;
  operation: string;
  operationId: string | null;
  status: "queued" | "running" | "approval_required" | "succeeded" | "failed" | "cancelled";
  progress: number | null;
  output: JsonValue | null;
  error: string | null;
  maximumDebitCredits: number;
  chargedCredits: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type HivemindOSApproval = {
  id: string;
  kind: "trade" | "wallet_transaction" | "service_action";
  status: "pending" | "approved" | "rejected" | "expired" | "consumed";
  summary: string;
  consequence: string;
  expiresAt: string;
  createdAt: string;
};

export type HivemindOSArtifact = {
  id: string;
  runId: string;
  name: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  createdAt: string;
};

export type HivemindOSWebhook = {
  id: string;
  url: string;
  events: string[];
  status: "active" | "disabled";
  allowedServices: HivemindOSPlatformServiceId[] | null;
  createdAt: string;
};

export type HivemindOSWebhookDelivery = {
  id: string;
  webhookId: string;
  eventId: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  responseStatus: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HivemindOSClientOptions = {
  apiKey: string;
  projectId?: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
};

export type HivemindOSRequestOptions = {
  idempotencyKey?: string;
  headers?: HeadersInit;
};

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function queryPath(path: string, values: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const rendered = query.toString();
  return rendered ? `${path}?${rendered}` : path;
}

export class HivemindOSClient {
  readonly apiKeys = {
    list: () => this.request<{ apiKeys: HivemindOSApiKey[] }>("GET", "/api-keys"),
    create: (input: HivemindOSApiKeyCreate, options?: HivemindOSRequestOptions) =>
      this.request<{ apiKey: HivemindOSApiKey; secret: string }>("POST", "/api-keys", input, options),
    revoke: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ apiKey: HivemindOSApiKey }>("DELETE", `/api-keys/${encoded(id)}`, undefined, options),
  };

  readonly services = {
    list: (options: { probe?: boolean } = {}) => this.request<{ services: HivemindOSPlatformService[] }>("GET", queryPath("/services", options)),
    pricing: (serviceId?: HivemindOSPlatformServiceId) =>
      this.request<Record<string, unknown>>("GET", queryPath("/pricing", { service: serviceId })),
    capabilities: (serviceId?: HivemindOSPlatformServiceId) => this.request<{ capabilities: HivemindOSManagedCapability[] }>(
      "GET", serviceId ? `/capabilities/${encoded(serviceId)}` : "/capabilities",
    ),
    invoke: (serviceId: HivemindOSPlatformServiceId, path: string, input?: Record<string, unknown>, options?: HivemindOSRequestOptions & {
      method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
      connectionId?: string;
    }) => this.request<HivemindOSManagedInvocation>("POST", `/services/${encoded(serviceId)}/invoke`, {
      path,
      input,
      method: options?.method,
      connectionId: options?.connectionId,
    }, options),
    invokeOperation: <TResult = JsonValue>(serviceId: HivemindOSPlatformServiceId, operationId: string, input?: Record<string, unknown>, options?: HivemindOSRequestOptions & {
      pathParameters?: Record<string, string>;
      query?: Record<string, string | number | boolean>;
      approvalId?: string;
      fileIds?: string[];
      connectionId?: string;
    }) => this.request<HivemindOSManagedInvocation<TResult>>("POST", `/services/${encoded(serviceId)}/invoke`, {
      operationId,
      input,
      pathParameters: options?.pathParameters,
      query: options?.query,
      approvalId: options?.approvalId,
      files: options?.fileIds?.map((fileId) => ({ fileId })),
      connectionId: options?.connectionId,
    }, options),
  };

  readonly actions = {
    search: (query: {
      query?: string;
      actionId?: HivemindOSPlatformOperationId;
      serviceId?: HivemindOSPlatformServiceId;
      mode?: HivemindOSPlatformAction["mode"];
      limit?: number;
    } = {}) => this.request<{ actions: HivemindOSPlatformAction[]; count: number }>("GET", queryPath("/actions", query)),
  };

  readonly projects = {
    list: () => this.request<{ projects: HivemindOSProject[] }>("GET", "/projects"),
    create: (input: { name: string; description?: string | null }, options?: HivemindOSRequestOptions) =>
      this.request<{ project: HivemindOSProject }>("POST", "/projects", input, options),
    get: (id: string) => this.request<{ project: HivemindOSProject }>("GET", `/projects/${encoded(id)}`),
    update: (id: string, input: { name?: string; description?: string | null }, options?: HivemindOSRequestOptions) =>
      this.request<{ project: HivemindOSProject }>("PATCH", `/projects/${encoded(id)}`, input, options),
    archive: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ project: HivemindOSProject }>("DELETE", `/projects/${encoded(id)}`, undefined, options),
  };

  readonly usage = {
    get: (query: { since?: string; until?: string; operationId?: string; serviceId?: string } = {}) =>
      this.request<{ usage: HivemindOSUsage }>("GET", queryPath("/usage", query)),
    auditEvents: (query: { since?: string; until?: string; operationId?: string; serviceId?: string; limit?: number } = {}) =>
      this.request<{ auditEvents: HivemindOSAuditEvent[] }>("GET", queryPath("/audit-events", query)),
  };

  readonly files = {
    list: () => this.request<{ files: HivemindOSFile[] }>("GET", "/files"),
    upload: (input: { name: string; contentType: string; bytes: Uint8Array<ArrayBuffer> | ArrayBuffer; purpose?: string; sha256?: string }, options?: HivemindOSRequestOptions) =>
      this.uploadFile(input, options),
    download: (id: string) => this.rawRequest("GET", `/files/${encoded(id)}`, { accept: "*/*" }),
    remove: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ file: HivemindOSFile }>("DELETE", `/files/${encoded(id)}`, undefined, options),
  };

  readonly connections = {
    list: () => this.request<{ connections: HivemindOSConnection[] }>("GET", "/connections"),
    create: (input: {
      name: string;
      kind: HivemindOSConnection["kind"];
      serviceId?: HivemindOSPlatformServiceId | null;
      credentials: Record<string, string>;
      metadata?: Record<string, string>;
    }, options?: HivemindOSRequestOptions) => this.request<{ connection: HivemindOSConnection }>("POST", "/connections", input, options),
    get: (id: string) => this.request<{ connection: HivemindOSConnection }>("GET", `/connections/${encoded(id)}`),
    update: (id: string, input: {
      name?: string;
      status?: "active" | "disabled";
      credentials?: Record<string, string>;
      metadata?: Record<string, string>;
    }, options?: HivemindOSRequestOptions) => this.request<{ connection: HivemindOSConnection }>("PATCH", `/connections/${encoded(id)}`, input, options),
    remove: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ connection: HivemindOSConnection }>("DELETE", `/connections/${encoded(id)}`, undefined, options),
  };

  readonly credits = {
    balance: () => this.request<{ credits: HivemindOSCreditsBalance }>("GET", "/credits/balance"),
    topUp: (input: { amountUsd: number }, options?: HivemindOSRequestOptions) =>
      this.request<HivemindOSCreditTopUp>("POST", "/credits/x402/top-up", input, options),
  };

  readonly databases = {
    account: () => this.request<HivemindOSDatabaseAccount>("GET", "/databases/account"),
    provision: (input: { confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.provision }, options?: HivemindOSRequestOptions) =>
      this.request<HivemindOSDatabaseAccount>("POST", "/databases/account", input, options),
    deprovision: (input: { confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.deprovision }, options?: HivemindOSRequestOptions) =>
      this.request<{ active: false }>("DELETE", "/databases/account", input, options),
    query: (input: HivemindOSDatabaseQuery) =>
      this.request<{ location: "cloud"; data: JsonValue }>("POST", "/databases/query", input),
    mutate: (input: HivemindOSDatabaseAction, options?: HivemindOSRequestOptions) =>
      this.request<{ location: "cloud"; data: JsonValue }>("POST", "/databases/actions", input, options),
    beginUpload: (input: {
      fileName: string;
      expectedBytes: number;
      sha256: string;
      confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.migrateToCloud;
    }, options?: HivemindOSRequestOptions) => this.request<{ migration: HivemindOSDatabaseTransfer; partSize: number }>(
      "POST", "/databases/transfers", { direction: "to-cloud", ...input }, options,
    ),
    beginDownload: (input: { confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.migrateToLocal }, options?: HivemindOSRequestOptions) =>
      this.request<{ migration: HivemindOSDatabaseTransfer }>("POST", "/databases/transfers", { direction: "to-local", ...input }, options),
    uploadPart: (transferId: string, partNumber: number, bytes: Uint8Array<ArrayBuffer> | ArrayBuffer, options?: HivemindOSRequestOptions) =>
      this.uploadDatabasePart(transferId, partNumber, bytes, options),
    completeUpload: (transferId: string, options?: HivemindOSRequestOptions) =>
      this.request<{ migration: HivemindOSDatabaseTransfer }>("POST", `/databases/transfers/${encoded(transferId)}/complete`, {}, options),
    getTransfer: (transferId: string) =>
      this.request<{ migration: HivemindOSDatabaseTransfer }>("GET", `/databases/transfers/${encoded(transferId)}`),
    downloadArchive: (transferId: string) => this.rawRequest("GET", `/databases/transfers/${encoded(transferId)}/archive`, { accept: "application/zip" }),
    cancelTransfer: (transferId: string, options?: HivemindOSRequestOptions) =>
      this.request<{ migration: HivemindOSDatabaseTransfer }>("DELETE", `/databases/transfers/${encoded(transferId)}`, undefined, options),
  };

  readonly wallets = {
    list: () => this.request<{ wallets: HivemindOSManagedWallet[] }>("GET", "/wallets"),
    create: (input: { name: string; network: ManagedWalletNetwork; kind?: "agent" | "user"; policy?: Partial<ManagedWalletPolicy> }, options?: HivemindOSRequestOptions) =>
      this.request<{ wallet: HivemindOSManagedWallet }>("POST", "/wallets", input, options),
    get: (id: string) => this.request<{ wallet: HivemindOSManagedWallet }>("GET", `/wallets/${encoded(id)}`),
    balances: (id: string) => this.request<{ balances: ManagedWalletBalance[] }>("GET", `/wallets/${encoded(id)}/balances`),
    updatePolicy: (id: string, policy: Partial<ManagedWalletPolicy>, options?: HivemindOSRequestOptions) =>
      this.request<{ wallet: HivemindOSManagedWallet }>("PATCH", `/wallets/${encoded(id)}/policy`, policy, options),
    quoteTransaction: (id: string, input: ManagedWalletTransactionRequest, options?: HivemindOSRequestOptions) =>
      this.request<{ quote: ManagedWalletTransactionQuote }>("POST", `/wallets/${encoded(id)}/transactions/quote`, input, options),
    submitTransaction: (id: string, input: { quoteId: string; approvalId?: string }, options?: HivemindOSRequestOptions) =>
      this.request<{ transaction: ManagedWalletTransaction }>("POST", `/wallets/${encoded(id)}/transactions`, input, options),
    quoteSignature: (id: string, input: { message: string }, options?: HivemindOSRequestOptions) =>
      this.request<{ quote: ManagedWalletSignatureQuote; approval: HivemindOSApproval }>("POST", `/wallets/${encoded(id)}/signatures/quote`, input, options),
    sign: (id: string, input: { quoteId: string; approvalId: string }, options?: HivemindOSRequestOptions) =>
      this.request<{ signature: ManagedWalletSignature }>("POST", `/wallets/${encoded(id)}/signatures`, input, options),
    transactions: (id: string) =>
      this.request<{ transactions: ManagedWalletTransaction[] }>("GET", `/wallets/${encoded(id)}/transactions`),
    transaction: (id: string, transactionId: string) =>
      this.request<{ transaction: ManagedWalletTransaction }>("GET", `/wallets/${encoded(id)}/transactions/${encoded(transactionId)}`),
  };

  readonly trading = {
    quote: (input: ManagedTradingQuoteRequest, options?: HivemindOSRequestOptions) =>
      this.request<{ quote: ManagedTradingQuote }>("POST", "/trading/quotes", input, options),
    createOrder: (input: { quoteId: string; approvalId?: string }, options?: HivemindOSRequestOptions) =>
      this.request<{ order: ManagedTradingOrder }>("POST", "/trading/orders", input, options),
    orders: () => this.request<{ orders: ManagedTradingOrder[] }>("GET", "/trading/orders"),
    order: (id: string) => this.request<{ order: ManagedTradingOrder }>("GET", `/trading/orders/${encoded(id)}`),
    positions: (walletId?: string) => this.request<{ positions: ManagedTradingPosition[] }>(
      "GET",
      walletId ? `/trading/positions?walletId=${encoded(walletId)}` : "/trading/positions",
    ),
  };

  readonly runs = {
    list: () => this.request<{ runs: HivemindOSRun[] }>("GET", "/runs"),
    create: (input: {
      serviceId: HivemindOSPlatformServiceId;
      operationId?: string;
      path?: string;
      pathParameters?: Record<string, string>;
      query?: Record<string, string | number | boolean>;
      approvalId?: string;
      connectionId?: string;
      files?: Array<{ fileId: string; field?: string }>;
      input?: Record<string, unknown>;
      method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
    }, options?: HivemindOSRequestOptions) =>
      this.request<{ run: HivemindOSRun }>("POST", "/runs", input, options),
    get: (id: string) => this.request<{ run: HivemindOSRun }>("GET", `/runs/${encoded(id)}`),
    cancel: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ run: HivemindOSRun }>("POST", `/runs/${encoded(id)}/cancel`, {}, options),
  };

  readonly approvals = {
    list: () => this.request<{ approvals: HivemindOSApproval[] }>("GET", "/approvals"),
    createServiceAction: (input: {
      serviceId: HivemindOSPlatformServiceId;
      operationId: string;
      pathParameters?: Record<string, string>;
      query?: Record<string, string | number | boolean>;
      input?: Record<string, unknown>;
      connectionId?: string;
      files?: Array<{ fileId: string; field?: string }>;
    }, options?: HivemindOSRequestOptions) =>
      this.request<{ approval: HivemindOSApproval }>("POST", "/approvals/service-actions", input, options),
    decide: (id: string, decision: "approve" | "reject", options?: HivemindOSRequestOptions) =>
      this.request<{ approval: HivemindOSApproval }>("POST", `/approvals/${encoded(id)}`, { decision }, options),
  };

  readonly artifacts = {
    list: (runId?: string) => this.request<{ artifacts: HivemindOSArtifact[] }>(
      "GET",
      runId ? `/artifacts?runId=${encoded(runId)}` : "/artifacts",
    ),
    download: (id: string) => this.rawRequest("GET", `/artifacts/${encoded(id)}/content`, { accept: "*/*" }),
  };

  readonly webhooks = {
    list: () => this.request<{ webhooks: HivemindOSWebhook[] }>("GET", "/webhooks"),
    create: (input: { url: string; events: string[]; allowedServices?: HivemindOSPlatformServiceId[] }, options?: HivemindOSRequestOptions) =>
      this.request<{ webhook: HivemindOSWebhook; signingSecret: string }>("POST", "/webhooks", input, options),
    update: (id: string, input: {
      url?: string;
      events?: string[];
      status?: "active" | "disabled";
      allowedServices?: HivemindOSPlatformServiceId[] | null;
    }, options?: HivemindOSRequestOptions) =>
      this.request<{ webhook: HivemindOSWebhook }>("PATCH", `/webhooks/${encoded(id)}`, input, options),
    rotateSecret: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ webhook: HivemindOSWebhook; signingSecret: string }>("POST", `/webhooks/${encoded(id)}/rotate-secret`, {}, options),
    deliveries: (query: { webhookId?: string; status?: HivemindOSWebhookDelivery["status"]; limit?: number } = {}) =>
      this.request<{ deliveries: HivemindOSWebhookDelivery[] }>("GET", queryPath("/webhook-deliveries", query)),
    replayDelivery: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ delivery: HivemindOSWebhookDelivery }>("POST", `/webhook-deliveries/${encoded(id)}/replay`, {}, options),
    remove: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ webhook: HivemindOSWebhook }>("DELETE", `/webhooks/${encoded(id)}`, undefined, options),
  };

  private readonly apiKey: string;
  private readonly projectId: string | null;
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(options: HivemindOSClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) throw new Error("A HivemindOS API key is required.");
    this.apiKey = apiKey;
    this.projectId = options.projectId?.trim() || null;
    this.baseUrl = (options.baseUrl?.trim() || HIVEMINDOS_PLATFORM_API_BASE_URL).replace(/\/+$/u, "");
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher) throw new Error("A fetch implementation is required.");
  }

  async request<TSuccess extends Record<string, unknown>>(
    method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT",
    path: string,
    body?: Record<string, unknown>,
    options: HivemindOSRequestOptions = {},
  ): Promise<ApiEnvelope<TSuccess, HivemindOSPlatformFailure>> {
    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");
    headers.set("authorization", `Bearer ${this.apiKey}`);
    if (this.projectId) headers.set("x-hivemindos-project", this.projectId);
    if (body !== undefined) headers.set("content-type", "application/json");
    if (options.idempotencyKey) headers.set("idempotency-key", options.idempotencyKey);
    const response = await this.fetcher(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null) as ApiEnvelope<TSuccess, HivemindOSPlatformFailure> | null;
    if (payload && typeof payload === "object" && "ok" in payload) return payload;
    return {
      ok: false,
      error: response.ok ? "HivemindOS returned an invalid response." : `HivemindOS request failed with HTTP ${response.status}.`,
    };
  }

  private async uploadDatabasePart(
    transferId: string,
    partNumber: number,
    value: Uint8Array<ArrayBuffer> | ArrayBuffer,
    options: HivemindOSRequestOptions = {},
  ): Promise<ApiEnvelope<{ partNumber: number; bytes: number }, HivemindOSPlatformFailure>> {
    if (!Number.isSafeInteger(partNumber) || partNumber < 1 || partNumber > 10_000) throw new Error("A valid database transfer part number is required.");
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    if (bytes.byteLength < 1 || bytes.byteLength > 8 * 1024 * 1024) throw new Error("Database transfer parts must be between 1 byte and 8 MB.");
    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");
    headers.set("authorization", `Bearer ${this.apiKey}`);
    if (this.projectId) headers.set("x-hivemindos-project", this.projectId);
    headers.set("content-type", "application/zip");
    headers.set("content-length", String(bytes.byteLength));
    if (options.idempotencyKey) headers.set("idempotency-key", options.idempotencyKey);
    const response = await this.fetcher(`${this.baseUrl}/databases/transfers/${encoded(transferId)}/parts/${partNumber}`, {
      method: "PUT",
      headers,
      body: bytes,
    });
    const payload = await response.json().catch(() => null) as ApiEnvelope<{ partNumber: number; bytes: number }, HivemindOSPlatformFailure> | null;
    return payload && typeof payload === "object" && "ok" in payload
      ? payload
      : { ok: false, error: `HivemindOS request failed with HTTP ${response.status}.` };
  }

  private async uploadFile(
    input: { name: string; contentType: string; bytes: Uint8Array<ArrayBuffer> | ArrayBuffer; purpose?: string; sha256?: string },
    options: HivemindOSRequestOptions = {},
  ): Promise<ApiEnvelope<{ file: HivemindOSFile }, HivemindOSPlatformFailure>> {
    const name = input.name.trim();
    if (!name || name.length > 180) throw new Error("A file name up to 180 characters is required.");
    const bytes = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes);
    if (bytes.byteLength < 1 || bytes.byteLength > 25 * 1024 * 1024) throw new Error("Files must be between 1 byte and 25 MB.");
    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");
    headers.set("authorization", `Bearer ${this.apiKey}`);
    headers.set("content-type", input.contentType);
    headers.set("content-length", String(bytes.byteLength));
    headers.set("x-file-name", name);
    if (input.purpose) headers.set("x-hivemindos-file-purpose", input.purpose);
    if (input.sha256) headers.set("x-content-sha256", input.sha256);
    if (this.projectId) headers.set("x-hivemindos-project", this.projectId);
    if (options.idempotencyKey) headers.set("idempotency-key", options.idempotencyKey);
    const response = await this.fetcher(`${this.baseUrl}/files`, { method: "POST", headers, body: bytes });
    const payload = await response.json().catch(() => null) as ApiEnvelope<{ file: HivemindOSFile }, HivemindOSPlatformFailure> | null;
    return payload && typeof payload === "object" && "ok" in payload
      ? payload
      : { ok: false, error: `HivemindOS request failed with HTTP ${response.status}.` };
  }

  private rawRequest(method: "GET", path: string, input: { accept: string }) {
    const headers = new Headers({ accept: input.accept, authorization: `Bearer ${this.apiKey}` });
    if (this.projectId) headers.set("x-hivemindos-project", this.projectId);
    return this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers,
    });
  }
}

export async function createHivemindOSApiKey(input: HivemindOSApiKeyCreate & {
  creditToken: string;
  idempotencyKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}) {
  const fetcher = input.fetch ?? globalThis.fetch;
  if (!fetcher) throw new Error("A fetch implementation is required.");
  const baseUrl = (input.baseUrl?.trim() || HIVEMINDOS_PLATFORM_API_BASE_URL).replace(/\/+$/u, "");
  const response = await fetcher(`${baseUrl}/api-keys`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
      "x-hivemindos-credit-token": input.creditToken,
    },
    body: JSON.stringify({
      label: input.label,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
      projectId: input.projectId,
      allowedServices: input.allowedServices,
      excludedServices: input.excludedServices,
      allowedOperations: input.allowedOperations,
      excludedOperations: input.excludedOperations,
      limits: input.limits,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "ok" in payload) {
    return payload as ApiEnvelope<{ apiKey: HivemindOSApiKey; secret: string }, HivemindOSPlatformFailure>;
  }
  return { ok: false, error: `HivemindOS request failed with HTTP ${response.status}.` } as const;
}
