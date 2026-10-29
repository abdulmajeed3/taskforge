import { api } from './client';
import type { Member, PaginatedResponse } from './types';

export const membersApi = {
  list(orgId: string, page = 1): Promise<PaginatedResponse<Member>> {
    return api.get<PaginatedResponse<Member>>(`/organizations/${orgId}/members?page=${page}`);
  },

  updateRole(orgId: string, userId: string, role: string): Promise<Member> {
    return api.patch<Member>(`/organizations/${orgId}/members/${userId}/role`, { role });
  },

  remove(orgId: string, userId: string): Promise<void> {
    return api.delete<void>(`/organizations/${orgId}/members/${userId}`);
  },

  leave(orgId: string): Promise<void> {
    return api.post<void>(`/organizations/${orgId}/members/leave`);
  },
};
