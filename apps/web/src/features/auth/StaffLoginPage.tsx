import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChefHat, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api/client';
import { socket } from '@/lib/socket/socketClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { AuthResponse, Role } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface StaffLoginPageProps {
  role?: 'staff' | 'admin';
}

export const StaffLoginPage: React.FC<StaffLoginPageProps> = ({
  role = 'staff',
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');

  const setSession = useAuth((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = role === 'admin';
  const defaultNext = isAdmin ? '/admin' : '/staff/board';
  const destination = nextParam || defaultNext;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: isAdmin ? 'admin@pc.in' : 'staff@main.pc',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        json: {
          email: data.email,
          password: data.password,
        },
      });

      // Role check verification
      if (res.user.role !== role) {
        setErrorMsg(
          `This account is registered as '${res.user.role}', not '${role}'. Please use the appropriate login portal.`
        );
        return;
      }

      setSession(res);
      socket.connect();

      if (res.user.mustChangePassword) {
        toast.info('Temporary password in use. Please set a new password.');
        navigate('/change-password', { replace: true });
        return;
      }

      toast.success(
        isAdmin
          ? `Welcome to Admin Portal, ${res.user.name}!`
          : `Signed in to ${res.user.canteenName || 'Kitchen Board'}`
      );
      navigate(destination, { replace: true });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'ACCOUNT_DISABLED') {
          toast.error('This account has been disabled by the administrator.');
          setErrorMsg('Account disabled. Please contact campus admin.');
        } else if (err.code === 'INVALID_CREDENTIALS') {
          setErrorMsg('Invalid email or password.');
        } else if (err.status === 429) {
          setErrorMsg('Too many login attempts. Please wait 1 minute.');
        } else {
          setErrorMsg(err.message || 'Login failed. Please try again.');
        }
      } else {
        setErrorMsg('Network error. Check server connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        isAdmin
          ? 'min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4'
          : 'dark min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4'
      }
    >
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex h-16 w-16 items-center justify-center rounded-3xl shadow-md text-3xl mb-3 ${
              isAdmin
                ? 'bg-slate-900 text-white dark:bg-slate-800'
                : 'bg-brand/20 text-brand border border-brand/40'
            }`}
          >
            {isAdmin ? <Shield className="h-8 w-8 text-brand" /> : <ChefHat className="h-8 w-8" />}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {isAdmin ? 'Admin Portal' : 'Kitchen Board'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? 'Campus canteen network governance'
              : 'Kitchen order management & verification'}
          </p>
        </div>

        <Card className="border-border/80 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {isAdmin ? 'Administrator Sign In' : 'Staff Sign In'}
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Use your campus admin credentials (admin@pc.in / Admin@123)'
                : 'Enter your canteen staff credentials (staff@main.pc / Staff@123)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold"
                >
                  {errorMsg}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="staff-email"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Work Email
                </label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder={isAdmin ? 'admin@pc.in' : 'staff@main.pc'}
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="staff-password"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full font-semibold gap-2 mt-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Sign In</span>
              </Button>

              {/* Switch portals */}
              <div className="pt-2 flex flex-col gap-1.5 text-center text-xs text-muted-foreground">
                <Link to="/login" className="hover:text-brand font-medium">
                  Student? Go to Mobile App →
                </Link>
                {isAdmin ? (
                  <Link to="/staff/login" className="hover:text-brand font-medium">
                    Looking for Kitchen Board? Staff Login →
                  </Link>
                ) : (
                  <Link to="/admin/login" className="hover:text-brand font-medium">
                    Platform Administrator Login →
                  </Link>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
