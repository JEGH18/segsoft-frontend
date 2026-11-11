import { afterEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/utils/axiosInstance', () => ({ default: { post } }));

async function loadApi() {
  vi.resetModules();
  return import('./repositories');
}

describe('uploadZip', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    post.mockReset();
  });

  it('uploads straight to the backend when VITE_UPLOAD_BASE_URL is set (bypassing the Vercel proxy)', async () => {
    vi.stubEnv('VITE_UPLOAD_BASE_URL', 'https://api.example.test');
    post.mockResolvedValue({ data: { id: 'repo-1' } });
    const { uploadZip } = await loadApi();

    const file = new File(['zip'], 'project.zip', { type: 'application/zip' });
    const result = await uploadZip(file);

    expect(result).toEqual({ id: 'repo-1' });
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/api/v1/repositories');
    expect((body as FormData).get('file')).toBe(file);
    expect(config.baseURL).toBe('https://api.example.test');
    expect(config.withCredentials).toBe(false);
  });

  it('uses the default API origin when VITE_UPLOAD_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_UPLOAD_BASE_URL', '');
    post.mockResolvedValue({ data: { id: 'repo-2' } });
    const { uploadZip } = await loadApi();

    await uploadZip(new File(['zip'], 'p.zip'));

    expect(post.mock.calls[0][2].baseURL).toBeUndefined();
  });

  it('reports upload progress as a percentage', async () => {
    post.mockImplementation(async (_url, _body, config) => {
      config.onUploadProgress({ loaded: 25, total: 100 });
      config.onUploadProgress({ loaded: 100, total: 100 });
      return { data: { id: 'repo-3' } };
    });
    const { uploadZip } = await loadApi();
    const progress: number[] = [];

    await uploadZip(new File(['zip'], 'p.zip'), (p) => progress.push(p));

    expect(progress).toEqual([25, 100]);
  });
});
