import axiosInstance from '@/utils/axiosInstance';
import type { ApiToken, CreateApiTokenRequest, CreatedApiToken } from '@/types/apiToken';

const BASE = '/api/v1/auth/api-tokens';

export async function listApiTokens(): Promise<ApiToken[]> {
  const { data } = await axiosInstance.get<ApiToken[]>(BASE);
  return data;
}

export async function createApiToken(request: CreateApiTokenRequest): Promise<CreatedApiToken> {
  const { data } = await axiosInstance.post<CreatedApiToken>(BASE, request);
  return data;
}

export async function revokeApiToken(id: string): Promise<void> {
  await axiosInstance.delete(`${BASE}/${id}`);
}
