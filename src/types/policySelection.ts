import { Category, Framework } from '@/types/enums';

export interface PolicySelectionRequest {
  policyIds: string[];
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
}
