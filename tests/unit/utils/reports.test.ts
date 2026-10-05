import { describe, it, expect, vi } from 'vitest';
import { exportReport, fileNameFromDisposition, generateReport, getReport, listReports } from '@/api/reports';
import axiosInstance from '@/utils/axiosInstance';

describe('report export API', () => {
  it('reads the file name from Content-Disposition', () => {
    expect(fileNameFromDisposition('attachment; filename="segsoft-report-1.sarif"')).toBe('segsoft-report-1.sarif');
    expect(fileNameFromDisposition('attachment; filename=segsoft-report-1.pdf')).toBe('segsoft-report-1.pdf');
    expect(fileNameFromDisposition(undefined)).toBeNull();
  });

  it('returns the blob, server file name and X-Cache status', async () => {
    const blob = new Blob(['%PDF']);
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="segsoft-report-r1.pdf"', 'x-cache': 'HIT' },
    });

    const file = await exportReport('r1', 'pdf');

    expect(axiosInstance.get).toHaveBeenCalledWith('/api/v1/reports/r1/export', {
      params: { format: 'pdf' },
      responseType: 'blob',
    });
    expect(file).toEqual({ blob, fileName: 'segsoft-report-r1.pdf', cache: 'HIT' });
  });

  it('falls back to a default file name', async () => {
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({ data: new Blob([]), headers: {} });
    const file = await exportReport('r1', 'sarif');
    expect(file.fileName).toBe('segsoft-report-r1.sarif');
    expect(file.cache).toBeNull();
  });

  it('generates a report on the analysis endpoint', async () => {
    vi.spyOn(axiosInstance, 'post').mockResolvedValue({ data: { id: 'r1', url: '/api/v1/reports/r1' } });
    const report = await generateReport('a1');
    expect(axiosInstance.post).toHaveBeenCalledWith('/api/v1/analyses/a1/reports');
    expect(report.url).toBe('/api/v1/reports/r1');
  });

  it('requests the selected view and filters the history by repository', async () => {
    const get = vi.spyOn(axiosInstance, 'get').mockResolvedValue({ data: {} });
    await getReport('r1', 'executive');
    expect(get).toHaveBeenCalledWith('/api/v1/reports/r1', { params: { view: 'executive' } });
    await listReports(0, 20, { repositoryId: 'repo-1' });
    expect(get).toHaveBeenLastCalledWith('/api/v1/reports', { params: { page: 0, size: 20, repositoryId: 'repo-1' } });
  });
});
