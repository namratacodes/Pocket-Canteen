import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/\d/, 'Password must contain at least 1 number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character / symbol'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const updateUser = useAuth((state) => state.updateUser);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormValues) => {
    setLoading(true);
    setErrorMsg('');

    try {
      await api('/auth/password', {
        method: 'PATCH',
        json: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
      });

      updateUser({ mustChangePassword: false });
      toast.success('Password updated successfully! Welcome.');

      if (user?.role === 'staff') {
        navigate('/staff/board', { replace: true });
      } else if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message || 'Failed to update password.');
      } else {
        setErrorMsg('Network error. Check server connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-2">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your account requires a permanent password before proceeding
          </p>
        </div>

        <Card className="border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Change Temporary Password</CardTitle>
            <CardDescription>
              Must be 8+ characters, with at least 1 number and 1 symbol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="currentPassword"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Temporary / Current Password
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  New Password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min 8 chars, 1 num, 1 symbol"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat new password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-semibold gap-2 mt-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Password & Continue</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
