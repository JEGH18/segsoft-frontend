import axiosInstance from '@/utils/axiosInstance';
import { AuthResponse, LoginRequest, RegisterRequest, RegistrationStatus, UserResponse } from '@/types/auth';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>('/api/v1/auth/login', data);
  return response.data;
}

/** Creates a DEVELOPER account and starts its session (refresh token in an httpOnly cookie). */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>('/api/v1/auth/register', data);
  return response.data;
}

export async function registrationStatus(): Promise<RegistrationStatus> {
  const response = await axiosInstance.get<RegistrationStatus>('/api/v1/auth/registration');
  return response.data;
}

export async function refresh(): Promise<AuthResponse> {
  // refreshToken is sent automatically via the httpOnly cookie
  const response = await axiosInstance.post<AuthResponse>('/api/v1/auth/refresh', {});
  return response.data;
}

export async function logout(): Promise<void> {
  // cookie is sent automatically; backend invalidates it and clears Set-Cookie
  await axiosInstance.post('/api/v1/auth/logout', {});
}

export async function me(): Promise<UserResponse> {
  const response = await axiosInstance.get<UserResponse>('/api/v1/auth/me');
  return response.data;
}
