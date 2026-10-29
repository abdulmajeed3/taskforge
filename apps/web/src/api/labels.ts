import { api } from './client';
import type { Label } from './types';

export const labelsApi = {
  list(orgId: string): Promise<Label[]> {
    return api.get<Label[]>(`/organizations/${orgId}/labels`);
  },

  create(orgId: string, data: { name: string; color: string }): Promise<Label> {
    return api.post<Label>(`/organizations/${orgId}/labels`, data);
  },

  update(orgId: string, id: string, data: { name?: string; color?: string }): Promise<Label> {
    return api.patch<Label>(`/organizations/${orgId}/labels/${id}`, data);
  },

  delete(orgId: string, id: string): Promise<void> {
    return api.delete<void>(`/organizations/${orgId}/labels/${id}`);
  },
};
