import { api } from './client';
import type { Task, PaginatedResponse } from './types';

export interface TaskFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  page?: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  projectId: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  labelIds?: string[];
}

export const tasksApi = {
  list(orgId: string, filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v != null) params.set(k, String(v)); });
    return api.get<PaginatedResponse<Task>>(`/organizations/${orgId}/tasks?${params}`);
  },

  get(orgId: string, id: string): Promise<Task> {
    return api.get<Task>(`/organizations/${orgId}/tasks/${id}`);
  },

  create(orgId: string, data: CreateTaskData): Promise<Task> {
    return api.post<Task>(`/organizations/${orgId}/tasks`, data);
  },

  update(orgId: string, id: string, data: Partial<CreateTaskData>): Promise<Task> {
    return api.patch<Task>(`/organizations/${orgId}/tasks/${id}`, data);
  },

  archive(orgId: string, id: string): Promise<Task> {
    return api.post<Task>(`/organizations/${orgId}/tasks/${id}/archive`);
  },

  kanban(orgId: string, projectId: string): Promise<Task[]> {
    return api.get<Task[]>(`/organizations/${orgId}/projects/${projectId}/kanban`);
  },
};
