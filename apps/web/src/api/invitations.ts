import { api } from './client';

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  token?: string;
}

export const invitationsApi = {
  send(orgId: string, email: string, role: string): Promise<Invitation> {
    return api.post<Invitation>(`/organizations/${orgId}/invitations`, { email, role });
  },

  list(orgId: string): Promise<Invitation[]> {
    return api.get<Invitation[]>(`/organizations/${orgId}/invitations`);
  },

  revoke(orgId: string, invitationId: string): Promise<void> {
    return api.delete<void>(`/organizations/${orgId}/invitations/${invitationId}`);
  },

  accept(token: string): Promise<void> {
    return api.post<void>('/invitations/accept', { token }, { skipOrgHeader: true });
  },
};
