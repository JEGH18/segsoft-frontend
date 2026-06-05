import { Category, Framework } from './enums';

export interface CreatePolicyRequest {
  name: string;
  description: string;
  category: Category;
  framework: Framework;
  controlId?: string;
}

export interface PolicyResponse {
  id: string;
  name: string;
  description: string;
  category: Category;
  framework: Framework;
  controlId: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DEPRECATED';
  version: number;
  weight: number;
  createdAt: string;
  createdById: string | null;
  executable: boolean;
  rulesCount: number;
}

export interface PolicyFilters {
  framework?: string;
  category?: string;
  status?: string;
  name?: string;
  page?: number;
  size?: number;
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
