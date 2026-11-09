import axiosInstance from '@/utils/axiosInstance';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegistrationResponse,
  RegistrationStatus,
  UserResponse,
} from '@/types/auth';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>('/api/v1/auth/login', data);
  return response.data;
}

/** Creates a DEVELOPER account and emails it a verification link; it does not start a session. */
export async function register(data: RegisterRequest): Promise<RegistrationResponse> {
  const response = await axiosInstance.post<RegistrationResponse>('/api/v1/auth/register', data);
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

/** Consumes the emailed link and starts the session (refresh token in an httpOnly cookie). */
export async function verifyEmail(token: string): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>('/api/v1/auth/verify-email', { token });
  return response.data;
}

/** Sends a new link if the email belongs to an unverified account; answers the same otherwise. */
export async function resendVerification(email: string): Promise<void> {
  await axiosInstance.post('/api/v1/auth/resend-verification', { email });
}

/** Emails a link to choose a new password; answers the same whether or not the email has an account. */
export async function forgotPassword(email: string): Promise<string> {
  const response = await axiosInstance.post<{ message: string }>('/api/v1/auth/forgot-password', { email });
  return response.data.message;
}

/** Sets a new password with the emailed link; it ends every session and does not start one. */
export async function resetPassword(token: string, password: string): Promise<string> {
  const response = await axiosInstance.post<{ message: string }>('/api/v1/auth/reset-password', { token, password });
  return response.data.message;
}

/** Consumes the link emailed when the account was locked; it does not start a session. */
export async function unlockAccount(token: string): Promise<string> {
  const response = await axiosInstance.post<{ message: string }>('/api/v1/auth/unlock', { token });
  return response.data.message;
}
