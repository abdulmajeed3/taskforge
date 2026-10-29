import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '../../api/users';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Avatar } from '../../components/ui/avatar';
import { ApiError } from '../../api/client';

const profileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'One uppercase letter').regex(/[0-9]/, 'One number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user, refreshMemberships } = useAuth();
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    values: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  });

  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

  const updateProfileMutation = useMutation({
    mutationFn: (d: ProfileData) => usersApi.updateProfile(d),
    onSuccess: () => {
      toast.success('Profile updated');
      refreshMemberships();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (d: PasswordData) =>
      usersApi.changePassword({ currentPassword: d.currentPassword, newPassword: d.newPassword }),
    onSuccess: () => {
      toast.success('Password changed. Please sign in again on other devices.');
      passwordForm.reset();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        passwordForm.setError('currentPassword', { message: 'Incorrect password' });
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Failed');
      }
    },
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={fullName} src={user?.avatarUrl} size="lg" />
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">{fullName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <form
            onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name"
                error={profileForm.formState.errors.firstName?.message}
                {...profileForm.register('firstName')}
              />
              <Input
                label="Last name"
                error={profileForm.formState.errors.lastName?.message}
                {...profileForm.register('lastName')}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={updateProfileMutation.isPending}
                disabled={!profileForm.formState.isDirty}
              >
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit((d) => changePasswordMutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="Min. 8 characters, one uppercase, one number"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={changePasswordMutation.isPending}>
                Change password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email verified</dt>
              <dd className={user?.isEmailVerified ? 'text-emerald-600' : 'text-amber-600'}>
                {user?.isEmailVerified ? 'Verified' : 'Not verified'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
