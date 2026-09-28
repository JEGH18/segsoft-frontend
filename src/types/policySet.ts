export interface PolicySetResponse {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  version: number;
  policyIds: string[];
  policyNames: string[];
  createdAt: string;
  createdById: string | null;
  updatedAt: string;
}

export interface CreatePolicySetRequest {
  name: string;
  description?: string;
  policyIds: string[];
}

/** Every field optional (PATCH semantics). policyIds, if sent, REPLACES the full composition. */
export interface UpdatePolicySetRequest {
  name?: string;
  description?: string;
  policyIds?: string[];
}

export interface PolicySetAuditLogEntry {
  id: string;
  action: string;
  userId: string | null;
  username: string | null;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface PolicySetPage {
  content: PolicySetResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  /** Non-null only when the WHOLE catalog is empty (not just this filtered page). */
  message: string | null;
}

export interface PolicySetPolicySummary {
  id: string;
  name: string;
  framework: string;
  category: string;
}

export interface PolicySetDetailResponse extends PolicySetResponse {
  policies: PolicySetPolicySummary[];
  categoryCoverage: Record<string, number>;
  usageCount: number;
}
