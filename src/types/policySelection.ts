import { Category, Framework } from '@/types/enums';

export interface PolicySelectionRequest {
  policyIds: string[];
  /** Set when the selection was populated by applying a Policy Set. Omit/null for a manual selection. */
  policySetId?: string | null;
}

export interface SelectedPolicySummary {
  id: string;
  name: string;
  framework: Framework;
  controlId: string | null;
  category: Category;
  rulesCount: number;
}

export interface PolicySelectionResponse {
  id: string;
  repositoryId: string;
  selectedPolicies: SelectedPolicySummary[];
  categoryCoverage: Record<Category, number>;
  uncoveredCategories: Category[];
  version: number;
  policySetId: string | null;
  policySetName: string | null;
  /** "MANUAL" | "POLICY_SET:{id}:{version}" | "MANUAL_ADJUSTMENT (from POLICY_SET:{id}:{version})" */
  source: string;
}

export interface ApplyPolicySetRequest {
  policySetId: string;
}
