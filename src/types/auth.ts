export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  roles: string[];
}

export interface UserResponse {
  id: string;
  username: string;
  roles: string[];
}

export enum RoleType {
  DEVELOPER = 'DEVELOPER',
  AUDITOR = 'AUDITOR',
  SECURITY_ADMIN = 'SECURITY_ADMIN',
}
