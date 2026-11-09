/** Metadata of a CI/CD API token; the value itself is only returned once, at creation. */
export interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string | null;
  ownerUsername: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  expired: boolean;
}

export interface CreateApiTokenRequest {
  name: string;
  /** 1 to 365; the backend uses 90 when omitted. */
  expiresInDays?: number;
}

export interface CreatedApiToken {
  id: string;
  name: string;
  /** Plaintext value: shown once and never retrievable again. */
  token: string;
  tokenPrefix: string;
  createdAt: string;
  expiresAt: string;
}
