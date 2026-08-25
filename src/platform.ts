import type { ApiEnvelope, JsonValue } from "./index.js";

export const HIVEMINDOS_PLATFORM_API_VERSION = "v1" as const;
export const HIVEMINDOS_PLATFORM_API_BASE_URL = "https://api.hivemindos.app/v1" as const;

export const HIVEMINDOS_PLATFORM_SCOPES = [
  "services:read",
  "services:invoke",
  "credits:read",
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
  "swarm",
  "x-studio",
  "distill",
  "x-api",
  "x-transcript",
  "reddit-voc",
  "media-studio",
  "app-hosting",
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
  "services.invoke",
  "credits.balance.read",
  "apiKeys.list",
  "apiKeys.create",
  "apiKeys.revoke",
  "databases.account.read",
  "databases.account.provision",
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
  "wallets.signatures.quote",
  "wallets.signatures.create",
  "trading.quotes.create",
  "trading.orders.create",
  "trading.positions.list",
  "runs.list",
  "runs.create",
  "runs.read",
  "runs.cancel",
  "approvals.list",
  "approvals.decide",
  "artifacts.list",
  "artifacts.content.read",
  "webhooks.list",
  "webhooks.create",
  "webhooks.disable",
] as const;

export type HivemindOSPlatformOperationId =
  | "*"
  | (typeof HIVEMINDOS_PLATFORM_STATIC_OPERATION_IDS)[number]
  | `services.invoke.${HivemindOSPlatformServiceId}`
  | `runs.create.${HivemindOSPlatformServiceId}`;

export function hivemindOSServiceInvocationOperationId(
  serviceId: HivemindOSPlatformServiceId,
): `services.invoke.${HivemindOSPlatformServiceId}` {
  return `services.invoke.${serviceId}`;
}

export function hivemindOSRunCreateOperationId(
  serviceId: HivemindOSPlatformServiceId,
): `runs.create.${HivemindOSPlatformServiceId}` {
  return `runs.create.${serviceId}`;
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

export type HivemindOSApiKeyCreate = {
  label: string;
  scopes: HivemindOSPlatformScope[];
  expiresAt?: string;
  limits?: HivemindOSApiKeyLimits;
} & HivemindOSApiKeyServiceSelection;

export type HivemindOSPlatformService = {
  id: HivemindOSPlatformServiceId;
  name: string;
  description: string;
  category: "agent" | "app" | "data" | "finance" | "integration" | "media" | "platform";
  status: "available" | "coming-soon" | "setup-required" | "unavailable";
  operations: Array<{
    id: string;
    method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
    path: string;
    scope: HivemindOSPlatformScope;
    limitOperationId: HivemindOSPlatformOperationId;
    description: string;
  }>;
};

export type HivemindOSCreditsBalance = {
  accountId: string;
  balanceCredits: number;
  totalCreditedCredits: number;
  totalDebitedCredits: number;
  updatedAt: string;
};

export const HIVEMINDOS_DATABASE_CONFIRMATIONS = {
  provision: "CREATE MANAGED DATABASE",
  createRecord: "CREATE DATABASE RECORD",
  updateRecord: "UPDATE DATABASE RECORD",
  deleteRecord: "DELETE DATABASE RECORD",
  createDatabase: "CREATE DATABASE",
  createTable: "CREATE DATABASE TABLE",
  createField: "CREATE DATABASE FIELD",
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
  allowedServices: HivemindOSPlatformServiceId[] | null;
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
  status: "queued" | "running" | "approval_required" | "succeeded" | "failed" | "cancelled";
  progress: number | null;
  output: JsonValue | null;
  error: string | null;
  maximumDebitCredits: number;
  chargedCredits: number;
  createdAt: string;
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

export type HivemindOSClientOptions = {
  apiKey: string;
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

export class HivemindOSClient {
  readonly apiKeys = {
    list: () => this.request<{ apiKeys: HivemindOSApiKey[] }>("GET", "/api-keys"),
    create: (input: HivemindOSApiKeyCreate, options?: HivemindOSRequestOptions) =>
      this.request<{ apiKey: HivemindOSApiKey; secret: string }>("POST", "/api-keys", input, options),
    revoke: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ apiKey: HivemindOSApiKey }>("DELETE", `/api-keys/${encoded(id)}`, undefined, options),
  };

  readonly services = {
    list: () => this.request<{ services: HivemindOSPlatformService[] }>("GET", "/services"),
    invoke: (serviceId: HivemindOSPlatformServiceId, path: string, input?: Record<string, unknown>, options?: HivemindOSRequestOptions & { method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT" }) =>
      this.request<Record<string, unknown>>("POST", `/services/${encoded(serviceId)}/invoke`, { path, input, method: options?.method }, options),
  };

  readonly credits = {
    balance: () => this.request<{ credits: HivemindOSCreditsBalance }>("GET", "/credits/balance"),
  };

  readonly databases = {
    account: () => this.request<HivemindOSDatabaseAccount>("GET", "/databases/account"),
    provision: (input: { confirmation: typeof HIVEMINDOS_DATABASE_CONFIRMATIONS.provision }, options?: HivemindOSRequestOptions) =>
      this.request<HivemindOSDatabaseAccount>("POST", "/databases/account", input, options),
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
  };

  readonly trading = {
    quote: (input: ManagedTradingQuoteRequest, options?: HivemindOSRequestOptions) =>
      this.request<{ quote: ManagedTradingQuote }>("POST", "/trading/quotes", input, options),
    createOrder: (input: { quoteId: string; approvalId?: string }, options?: HivemindOSRequestOptions) =>
      this.request<{ order: ManagedTradingOrder }>("POST", "/trading/orders", input, options),
    positions: (walletId?: string) => this.request<{ positions: ManagedTradingPosition[] }>(
      "GET",
      walletId ? `/trading/positions?walletId=${encoded(walletId)}` : "/trading/positions",
    ),
  };

  readonly runs = {
    list: () => this.request<{ runs: HivemindOSRun[] }>("GET", "/runs"),
    create: (input: { serviceId: HivemindOSPlatformServiceId; path: string; input?: Record<string, unknown>; method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT" }, options?: HivemindOSRequestOptions) =>
      this.request<{ run: HivemindOSRun }>("POST", "/runs", input, options),
    get: (id: string) => this.request<{ run: HivemindOSRun }>("GET", `/runs/${encoded(id)}`),
    cancel: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ run: HivemindOSRun }>("POST", `/runs/${encoded(id)}/cancel`, {}, options),
  };

  readonly approvals = {
    list: () => this.request<{ approvals: HivemindOSApproval[] }>("GET", "/approvals"),
    decide: (id: string, decision: "approve" | "reject", options?: HivemindOSRequestOptions) =>
      this.request<{ approval: HivemindOSApproval }>("POST", `/approvals/${encoded(id)}`, { decision }, options),
  };

  readonly artifacts = {
    list: (runId?: string) => this.request<{ artifacts: HivemindOSArtifact[] }>(
      "GET",
      runId ? `/artifacts?runId=${encoded(runId)}` : "/artifacts",
    ),
  };

  readonly webhooks = {
    list: () => this.request<{ webhooks: HivemindOSWebhook[] }>("GET", "/webhooks"),
    create: (input: { url: string; events: string[] }, options?: HivemindOSRequestOptions) =>
      this.request<{ webhook: HivemindOSWebhook; signingSecret: string }>("POST", "/webhooks", input, options),
    remove: (id: string, options?: HivemindOSRequestOptions) =>
      this.request<{ webhook: HivemindOSWebhook }>("DELETE", `/webhooks/${encoded(id)}`, undefined, options),
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(options: HivemindOSClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) throw new Error("A HivemindOS API key is required.");
    this.apiKey = apiKey;
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

  private rawRequest(method: "GET", path: string, input: { accept: string }) {
    return this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers: { accept: input.accept, authorization: `Bearer ${this.apiKey}` },
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
      allowedServices: input.allowedServices,
      excludedServices: input.excludedServices,
      limits: input.limits,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "ok" in payload) {
    return payload as ApiEnvelope<{ apiKey: HivemindOSApiKey; secret: string }, HivemindOSPlatformFailure>;
  }
  return { ok: false, error: `HivemindOS request failed with HTTP ${response.status}.` } as const;
}
