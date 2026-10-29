import { api } from './client';
import type { Organization } from './types';

export interface OrgStats {
  memberCount: number;
  projectCount: number;
  taskCount: number;
  completedTaskCount: number;
}

export const orgsApi = {
  create(data: { name: string; description?: string }): Promise<Organization> {
    return api.post<Organization>('/organizations', data, { skipOrgHeader: true });
  },

  get(id: string): Promise<Organization> {
    return api.get<Organization>(`/organizations/${id}`, { skipOrgHeader: true });
  },

  update(id: string, data: { name?: string; description?: string }): Promise<Organization> {
    return api.patch<Organization>(`/organizations/${id}`, data);
  },

  archive(id: string): Promise<Organization> {
    return api.post<Organization>(`/organizations/${id}/archive`);
  },

  delete(id: string): Promise<void> {
    return api.delete<void>(`/organizations/${id}`);
  },

  stats(id: string): Promise<OrgStats> {
    return api.get<OrgStats>(`/organizations/${id}/stats`);
  },
};
