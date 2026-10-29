import { api } from './client';
import type { Project, PaginatedResponse } from './types';

export interface ProjectTaskStats {
  total: number;
  byStatus: { status: string; count: number }[];
}

export const projectsApi = {
  list(page = 1): Promise<PaginatedResponse<Project>> {
    return api.get<PaginatedResponse<Project>>(`/organizations/current/projects?page=${page}`);
  },

  listForOrg(orgId: string, page = 1): Promise<PaginatedResponse<Project>> {
    return api.get<PaginatedResponse<Project>>(`/organizations/${orgId}/projects?page=${page}`);
  },

  create(orgId: string, data: { name: string; description?: string }): Promise<Project> {
    return api.post<Project>(`/organizations/${orgId}/projects`, data);
  },

  get(orgId: string, id: string): Promise<Project> {
    return api.get<Project>(`/organizations/${orgId}/projects/${id}`);
  },

  update(orgId: string, id: string, data: { name?: string; description?: string }): Promise<Project> {
    return api.patch<Project>(`/organizations/${orgId}/projects/${id}`, data);
  },

  archive(orgId: string, id: string): Promise<Project> {
    return api.post<Project>(`/organizations/${orgId}/projects/${id}/archive`);
  },

  stats(orgId: string, id: string): Promise<ProjectTaskStats> {
    return api.get<ProjectTaskStats>(`/organizations/${orgId}/projects/${id}/stats`);
  },
};
