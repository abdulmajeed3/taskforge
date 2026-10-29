import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users, MoreHorizontal, Shield, LogOut, UserPlus, Mail, Clock, X } from 'lucide-react';
import { membersApi } from '../../api/members';
import { invitationsApi } from '../../api/invitations';
import { useAuth } from '../../contexts/auth-context';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Spinner } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '../../components/ui/dropdown';
import { ROLE_LABELS } from '../../lib/utils';
import { ApiError } from '../../api/client';

const ROLES = ['ADMIN', 'MEMBER', 'VIEWER'] as const;

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});
type InviteFormData = z.infer<typeof inviteSchema>;

export function MembersPage() {
  const { currentOrgId, user: currentUser, memberships } = useAuth();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const currentMembership = memberships.find((m) => m.organizationId === currentOrgId);
  const isAdmin = currentMembership && ['OWNER', 'ADMIN'].includes(currentMembership.role);

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members', currentOrgId],
    queryFn: () => membersApi.list(currentOrgId!),
    enabled: !!currentOrgId,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', currentOrgId],
    queryFn: () => invitationsApi.list(currentOrgId!),
    enabled: !!currentOrgId && !!isAdmin,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'MEMBER' },
  });

  const inviteMutation = useMutation({
    mutationFn: (d: InviteFormData) => invitationsApi.send(currentOrgId!, d.email, d.role),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invitations', currentOrgId] });
      toast.success(`Invitation sent to ${inv.email}`);
      setInviteOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to send invitation'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => invitationsApi.revoke(currentOrgId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations', currentOrgId] });
      toast.success('Invitation revoked');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      membersApi.updateRole(currentOrgId!, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', currentOrgId] });
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to update role'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => membersApi.remove(currentOrgId!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', currentOrgId] });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to remove member'),
  });

  const members = membersData?.items ?? [];
  const pendingInvitations = invitations.filter((i) => i.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Members</h1>
          <p className="text-sm text-slate-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : members.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No members found" />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => {
              const fullName = `${member.user.firstName} ${member.user.lastName}`;
              const isMe = member.user.id === currentUser?.id;
              const isOwner = member.role === 'OWNER';
              return (
                <li key={member.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar name={fullName} src={member.user.avatarUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{fullName}</p>
                      {isMe && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{member.user.email}</p>
                  </div>
                  <Badge variant={isOwner ? 'default' : 'outline'} className="text-xs">
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  {isAdmin && !isMe && !isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change role</DropdownMenuLabel>
                        {ROLES.map((role) => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => updateRoleMutation.mutate({ userId: member.user.id, role })}
                            className={member.role === role ? 'text-indigo-600' : ''}
                          >
                            <Shield className="h-4 w-4" /> {ROLE_LABELS[role]}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => removeMutation.mutate(member.user.id)}
                        >
                          <LogOut className="h-4 w-4" /> Remove from org
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Pending invitations */}
      {isAdmin && pendingInvitations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pending invitations ({pendingInvitations.length})
          </h2>
          <Card>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingInvitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{inv.email}</p>
                    <p className="text-xs text-slate-400">
                      Invited as {ROLE_LABELS[inv.role]} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                  <button
                    onClick={() => revokeMutation.mutate(inv.id)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    title="Revoke invitation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) { setInviteOpen(false); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => inviteMutation.mutate(d))} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="colleague@company.com"
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Role</label>
              <Select defaultValue="MEMBER" onValueChange={(v) => setValue('role', v as InviteFormData['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin — can manage members and projects</SelectItem>
                  <SelectItem value="MEMBER">Member — can create and edit tasks</SelectItem>
                  <SelectItem value="VIEWER">Viewer — read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500">
              In development the invitation token is printed to the API console. In production an email would be sent.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => { setInviteOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" loading={isSubmitting || inviteMutation.isPending}>Send invitation</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
