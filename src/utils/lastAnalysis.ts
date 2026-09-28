const LAST_ANALYSIS_KEY = 'pdgseg:lastAnalysisId';

export function getLastAnalysisId(): string | null {
  try {
    return localStorage.getItem(LAST_ANALYSIS_KEY);
  } catch {
    return null;
  }
}

export function setLastAnalysisId(id: string): void {
  try {
    localStorage.setItem(LAST_ANALYSIS_KEY, id);
  } catch {
    // localStorage unavailable (private browsing, etc.) — safe to ignore.
  }
}
