export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
}

export function httpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export const CATEGORY_LABELS: Record<string, string> = {
  SQL_INJECTION: 'SQL Injection',
  XSS: 'XSS',
  AUTHENTICATION_FAILURE: 'Fallo de Autenticación',
  INSECURE_DATA_HANDLING: 'Manejo Inseguro de Datos',
  DEPENDENCY_VULNERABILITY: 'Vulnerabilidad en Dependencias',
};

export const FRAMEWORK_LABELS: Record<string, string> = {
  ISO_27001: 'ISO 27001',
  OWASP_TOP_10_2021: 'OWASP Top 10 2021',
  OWASP_ASVS: 'OWASP ASVS',
  NIST_SP_800_53: 'NIST SP 800-53',
  CUSTOM: 'Personalizado',
  DEVSECOPS: 'DevSecOps',
  UNSPECIFIED: 'Sin marco',
};

export const STATUS_LABELS: Record<string, string> = {
  COMPLIANT: 'Cumple',
  NON_COMPLIANT: 'No cumple',
  REQUIRES_REVIEW: 'Requiere revisión',
};

export const STATUS_CLASSES: Record<string, string> = {
  COMPLIANT: 'bg-green-100 text-green-700',
  NON_COMPLIANT: 'bg-red-100 text-red-700',
  REQUIRES_REVIEW: 'bg-amber-100 text-amber-700',
};

export const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export function label(labels: Record<string, string>, key: string | null | undefined): string {
  if (!key) return '—';
  return labels[key] ?? key;
}

/** Traffic-light color for a compliance percentage. */
export function complianceBarClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'bg-neutral-200';
  if (value >= 80) return 'bg-green-500';
  if (value >= 50) return 'bg-amber-400';
  return 'bg-red-500';
}
