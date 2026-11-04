export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** The account waits for its email to be verified: registering does not start a session. */
export interface RegistrationResponse {
  username: string;
  email: string;
  message: string;
}

export interface RegistrationStatus {
  enabled: boolean;
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
  /** Null for the deployment accounts, which have no email. */
  email?: string | null;
  roles: string[];
}

export enum RoleType {
  DEVELOPER = 'DEVELOPER',
  AUDITOR = 'AUDITOR',
  SECURITY_ADMIN = 'SECURITY_ADMIN',
}
