import type { Severity } from '@/types/enums';

/**
 * Single source of truth for severity colors across the app: green for LOW
 * (low risk), orange for MEDIUM, and an escalating red for HIGH/CRITICAL
 * so CRITICAL is the most visually alarming.
 */
export const SEVERITY_COLOR_CLASSES: Record<Severity, string> = {
  LOW: 'bg-green-100 text-green-700 border-green-200',
  MEDIUM: 'bg-orange-100 text-orange-700 border-orange-200',
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  CRITICAL: 'bg-red-600 text-white border-red-600',
};

/**
 * Solid hex per severity, for use on dark surfaces (e.g. the finding detail
 * drawer) where a light Tailwind tint would wash out. Reuses the app's
 * reserved status scale (good/warning/serious/critical) so severity reads
 * consistently with policy-compliance status elsewhere in the app.
 */
export const SEVERITY_HEX: Record<Severity, string> = {
  LOW: '#0ca30c',
  MEDIUM: '#fab219',
  HIGH: '#ec835a',
  CRITICAL: '#d03b3b',
};

// Text color that clears the best contrast against each SEVERITY_HEX fill.
export const SEVERITY_TEXT_ON_HEX: Record<Severity, string> = {
  LOW: '#0b0b0b',
  MEDIUM: '#0b0b0b',
  HIGH: '#0b0b0b',
  CRITICAL: '#ffffff',
};
