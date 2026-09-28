import { Category, Framework } from './enums';

export interface CreatePolicyRequest {
  name: string;
  description: string;
  category: Category;
  framework: Framework;
  controlId?: string;
  /** Solo aplica a framework=ISO_27001: la guía de implementación ISO/IEC 27002. */
  implementationGuideId?: string;
}

// Catalog entry: for a given framework, which categories it defines a real
// control for, and what that control's id/name are. CUSTOM has
// no catalog (team-defined policies, no external standard) -- empty list.
export interface FrameworkControl {
  category: Category;
  controlId: string;
  controlName: string;
}

export interface PolicyResponse {
  id: string;
  name: string;
  description: string;
  category: Category;
  framework: Framework;
  controlId: string | null;
  implementationGuideId: string | null;
  /** true solo para políticas ISO_27001 sin implementationGuideId todavía. */
  detailPending: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'DEPRECATED';
  version: number;
  weight: number;
  applicability: Record<string, unknown>;
  createdAt: string;
  createdById: string | null;
  executable: boolean;
  rulesCount: number;
}

/** Only description, weight, applicability, and implementationGuideId are editable. */
export interface UpdatePolicyRequest {
  description?: string;
  weight?: number;
  applicability?: Record<string, unknown>;
  /** Completa el detalle ISO/IEC 27002 de una política ya registrada (detailPending -> false). */
  implementationGuideId?: string;
}

export interface Iso27002Control {
  id: string;
  title: string;
  category: 'ORGANIZATIONAL' | 'PEOPLE' | 'PHYSICAL' | 'TECHNOLOGICAL';
  implementationGuidance: string;
}

export interface PolicyTraceability {
  policyId: string;
  policyName: string;
  framework: string;
  annexAControl: { id: string; name: string | null };
  implementationGuide: { id: string; title: string; guidance: string } | null;
}

export interface PolicyFilters {
  framework?: string;
  category?: string;
  status?: string;
  name?: string;
  page?: number;
  size?: number;
}

export interface PolicyAuditLogEntry {
  id: string;
  action: string;
  userId: string | null;
  username: string | null;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface PolicyPage {
  content: PolicyResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export type Policy = PolicyResponse;
