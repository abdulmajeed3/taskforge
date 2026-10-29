import { api } from './client';
import type { Comment } from './types';

export const commentsApi = {
  create(orgId: string, taskId: string, content: string): Promise<Comment> {
    return api.post<Comment>(`/organizations/${orgId}/tasks/${taskId}/comments`, { content });
  },

  update(orgId: string, taskId: string, commentId: string, content: string): Promise<Comment> {
    return api.patch<Comment>(`/organizations/${orgId}/tasks/${taskId}/comments/${commentId}`, { content });
  },

  delete(orgId: string, taskId: string, commentId: string): Promise<void> {
    return api.delete<void>(`/organizations/${orgId}/tasks/${taskId}/comments/${commentId}`);
  },
};
