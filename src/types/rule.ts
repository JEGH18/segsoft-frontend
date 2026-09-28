export type RuleType = 'PATTERN_REGEX' | 'AST_QUERY' | 'CONFIG_CHECK' | 'DEPENDENCY_CHECK';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RuleStatus = 'ACTIVE' | 'ARCHIVED';

export interface CreateRuleRequest {
  type: RuleType;
  payload: Record<string, unknown>;
  targetArtifact?: string;
  languages?: string[];
  severity: Severity;
  cweId?: string;
}

export interface RuleResponse {
  id: string;
  policyId: string;
  type: RuleType;
  payload: Record<string, unknown>;
  targetArtifact: string | null;
  languages: string[];
  severity: Severity;
  cweId: string | null;
  category: string | null;
  status: RuleStatus;
  createdAt: string;
}

export interface RulePage {
  content: RuleResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
