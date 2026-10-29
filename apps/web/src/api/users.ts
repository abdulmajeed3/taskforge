import { api } from './client';
import type { User, OrgMembership } from './types';

export const usersApi = {
  me(): Promise<User> {
    return api.get<User>('/users/me', { skipOrgHeader: true });
  },

  updateProfile(data: { firstName?: string; lastName?: string; avatarUrl?: string | null }): Promise<User> {
    return api.patch<User>('/users/me', data, { skipOrgHeader: true });
  },

  changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    return api.post<void>('/users/me/change-password', data, { skipOrgHeader: true });
  },

  organizations(): Promise<OrgMembership[]> {
    return api.get<OrgMembership[]>('/users/me/organizations', { skipOrgHeader: true });
  },
};
