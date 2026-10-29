import { api } from './client';
import type { User } from './types';

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', data, { skipAuth: true, skipOrgHeader: true });
  },

  login(data: { email: string; password: string }): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', data, { skipAuth: true, skipOrgHeader: true });
  },

  refresh(): Promise<AuthTokens> {
    return api.post<AuthTokens>('/auth/refresh', undefined, { skipAuth: true, skipOrgHeader: true });
  },

  logout(): Promise<void> {
    return api.post<void>('/auth/logout', undefined, { skipOrgHeader: true });
  },

  forgotPassword(email: string): Promise<void> {
    return api.post<void>('/auth/forgot-password', { email }, { skipAuth: true, skipOrgHeader: true });
  },

  resetPassword(token: string, password: string): Promise<void> {
    return api.post<void>('/auth/reset-password', { token, password }, { skipAuth: true, skipOrgHeader: true });
  },
};
