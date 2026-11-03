const CLONE_COMMAND_PREFIX = /^git clone\s+/i;

/** Self-hosted Bitbucket Server / Data Center instances we know by name (p2tools). */
const BITBUCKET_SERVER_HOSTS = ['pi2tools.icesi.edu.co'];

// Bitbucket Server URLs: clone ".../scm/<proyecto>/<repo>.git", browse ".../projects/<KEY>/repos/<repo>/...".
const SERVER_CLONE_PATH = /\/scm\/[^/]+\/[^/]+/;
const SERVER_BROWSE_PATH = /^(.*)\/projects\/([^/]+)\/repos\/([^/]+)(\/.*)?$/;

export type BitbucketKind = 'cloud' | 'server';

function parse(raw: string): URL | null {
  try {
    return new URL(raw.trim().replace(CLONE_COMMAND_PREFIX, ''));
  } catch {
    return null;
  }
}

export function bitbucketKind(raw: string): BitbucketKind | null {
  const url = parse(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === 'bitbucket.org' || host.endsWith('.bitbucket.org')) return 'cloud';
  if (BITBUCKET_SERVER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
      || SERVER_CLONE_PATH.test(url.pathname)
      || SERVER_BROWSE_PATH.test(url.pathname)) {
    return 'server';
  }
  return null;
}

/**
 * Bitbucket's "Clone" button copies "git clone https://<usuario>@host/...".
 * The backend rejects any userinfo in the URL, so drop the command prefix and the
 * bare username. A user:password pair is left untouched for the backend to reject.
 * On Bitbucket Server, the repository page URL (.../projects/KEY/repos/repo/browse)
 * is turned into its clone URL (.../scm/key/repo.git).
 */
export function normalizeGitUrl(raw: string): string {
  const trimmed = raw.trim().replace(CLONE_COMMAND_PREFIX, '');
  const kind = bitbucketKind(trimmed);
  if (!kind) return trimmed;
  const url = new URL(trimmed);
  let changed = false;
  if (url.username && !url.password) {
    url.username = '';
    changed = true;
  }
  const browse = kind === 'server' ? SERVER_BROWSE_PATH.exec(url.pathname) : null;
  if (browse) {
    const [, base, projectKey, repo] = browse;
    url.pathname = `${base}/scm/${projectKey.toLowerCase()}/${repo}.git`;
    url.search = '';
    url.hash = '';
    changed = true;
  }
  return changed ? url.toString() : trimmed;
}
