import axiosInstance from '@/utils/axiosInstance';
import { Framework } from '@/types/enums';
import { FrameworkControl, Iso27002Control } from '@/types/policy';
import type { NistControl } from '@/types/nistControl';

export async function getFrameworkControls(framework: Framework): Promise<FrameworkControl[]> {
  const response = await axiosInstance.get<FrameworkControl[]>(`/api/v1/frameworks/${framework}/controls`);
  return response.data;
}

export async function getNistControls(family?: string): Promise<NistControl[]> {
  const response = await axiosInstance.get<NistControl[]>('/api/v1/frameworks/nist/controls', {
    params: family ? { family } : undefined,
  });
  return response.data;
}

export async function getIso27002Controls(relatedControl?: string): Promise<Iso27002Control[]> {
  const response = await axiosInstance.get<Iso27002Control[]>('/api/v1/frameworks/iso-27002/controls', {
    params: relatedControl ? { relatedControl } : undefined,
  });
  return response.data;
}
