export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  roles?: string[];   // returned by the backend as Set<Role> → serialized as string[]
}

export interface UserSession {
  accessToken: string;
  refreshToken?: string;
  roles: string[];
  expiresAt?: number;
}
