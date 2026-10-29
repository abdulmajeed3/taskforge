import { api } from './client';
import type { Notification, PaginatedResponse, PaginationMeta } from './types';

export interface NotificationsResponse {
  items: Notification[];
  meta: PaginationMeta & { unreadCount: number };
}

export const notificationsApi = {
  list(orgId: string, page = 1): Promise<NotificationsResponse> {
    return api.get<NotificationsResponse>(`/organizations/${orgId}/notifications?page=${page}`);
  },

  markRead(orgId: string, id: string): Promise<void> {
    return api.post<void>(`/organizations/${orgId}/notifications/${id}/read`);
  },

  markAllRead(orgId: string): Promise<void> {
    return api.post<void>(`/organizations/${orgId}/notifications/read-all`);
  },
};
