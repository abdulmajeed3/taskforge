import { api } from './client';
import type { DashboardData } from './types';

export const dashboardApi = {
  get(orgId: string): Promise<DashboardData> {
    return api.get<DashboardData>(`/organizations/${orgId}/dashboard`);
  },
};
