export type RepositoryStatus =
  | 'UPLOADING'
  | 'READY_FOR_ANALYSIS'
  | 'ANALYZING'
  | 'ARCHIVED'
  | 'EXPIRED'
  | 'FAILED';

export type SourceType = 'ZIP' | 'GIT';

export type ArtifactType =
  | 'SOURCE_CODE'
  | 'CONFIG'
  | 'DEPENDENCY_MANIFEST'
  | 'DOCUMENTATION'
  | 'INFRASTRUCTURE_AS_CODE';

export type InventoryStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

export interface RepositoryResponse {
  id: string;
  status: RepositoryStatus;
  inventoryStatus?: InventoryStatus;
  sourceType: SourceType;
  originalName: string;
  gitUrl: string | null;
  branch: string | null;
  fileCount: number | null;
  excludedCount?: number;
  errorMessage: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CloneRepositoryRequest {
  gitUrl: string;
  branch?: string;
}

export interface RepositoryFile {
  id: string;
  path: string;
  language: string;
  artifactType: ArtifactType;
  sizeBytes: number;
  sha256: string;
}

export interface FileInventoryResponse {
  repositoryId: string;
  inventoryStatus: InventoryStatus;
  totalFiles: number;
  excludedCount: number;
  byLanguage: Record<string, number>;
  byArtifactType: Record<string, number>;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  files: RepositoryFile[];
}

export interface FileInventoryFilters {
  language?: string;
  artifactType?: ArtifactType;
  page: number;
  size: number;
}
