import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api/client';
import { socket } from '@/lib/socket/socketClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import type { AuthResponse, User } from '@/types';

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

export const StudentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/student';

  const setSession = useAuth((state) => state.setSession);
  const updateUser = useAuth((state) => state.updateUser);

  // Steps: 'phone' | 'otp' | 'name'
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [studentName, setStudentName] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
  });

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const onSendOtp = async (data: PhoneFormValues) => {
    setLoading(true);
    setOtpError('');
    const fullPhone = `+91${data.phone}`;
    try {
      const res = await api<{ sent: boolean; resendAfterSec: number }>(
        '/auth/otp/send',
        {
          method: 'POST',
          json: { phone: fullPhone },
        }
      );
      setPhone(fullPhone);
      setResendTimer(res.resendAfterSec || 30);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error(err.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    setOtpError('');
    try {
      const res = await api<{ sent: boolean; resendAfterSec: number }>(
        '/auth/otp/send',
        {
          method: 'POST',
          json: { phone },
        }
      );
      setResendTimer(res.resendAfterSec || 30);
      toast.success('New OTP sent!');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error('Too many attempts. Please wait before retrying.');
      } else {
        toast.error(err.message || 'Failed to resend OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || loading) return;
    setLoading(true);
    setOtpError('');
    try {
      const res = await api<AuthResponse>('/auth/otp/verify', {
        method: 'POST',
        json: { phone, otp: codeToVerify },
      });

      setSession(res);
      socket.connect();

      // If user profile does not have a name yet, prompt for it
      if (!res.user.name || res.user.name.trim() === '') {
        setTempUser(res.user);
        setStep('name');
      } else {
        toast.success(`Welcome back, ${res.user.name}!`);
        navigate(nextUrl, { replace: true });
      }
    } catch (err: any) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (err instanceof ApiError && err.status === 429) {
        setOtpError('Too many attempts. Please try again later.');
        toast.error('Too many attempts. Please wait 1 minute.');
      } else {
        setOtpError('Invalid 6-digit code. Please enter 123456 in mock mode.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || loading) return;
    setLoading(true);
    try {
      const updated = await api<User>('/me', {
        method: 'PATCH',
        json: { name: studentName.trim() },
      });
      updateUser(updated);
      toast.success(`Welcome to Pocket Canteen, ${updated.name}!`);
      navigate(nextUrl, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 border border-brand/20 shadow-sm text-3xl mb-3">
            🍽
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Pocket Canteen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Skip the queue. Eat on time.
          </p>
        </div>

        <Card className="border-border/80 shadow-md">
          {/* STEP 1: Phone input */}
          {step === 'phone' && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Student Login</CardTitle>
                <CardDescription>
                  Enter your mobile number to receive an instant verification code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSendOtp)} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="phone-input"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <div className="flex h-11 items-center rounded-xl border border-input bg-muted/50 px-3 text-sm font-semibold text-muted-foreground select-none">
                        +91
                      </div>
                      <div className="relative flex-1">
                        <Input
                          id="phone-input"
                          type="tel"
                          inputMode="numeric"
                          placeholder="98765 43210"
                          maxLength={10}
                          aria-label="10-digit mobile number"
                          {...register('phone')}
                          className="pl-9"
                        />
                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-destructive font-medium">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-semibold gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Send OTP</span>
                  </Button>

                  <div className="pt-2 text-center">
                    <Link
                      to="/staff/login"
                      className="text-xs text-brand font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <span>Canteen Staff or Admin? Log in here</span>
                      <span>→</span>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* STEP 2: OTP Entry */}
          {step === 'otp' && (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setOtpError('');
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Change phone</span>
                  </button>
                  <span className="text-xs font-mono font-medium text-muted-foreground">
                    {phone}
                  </span>
                </div>
                <CardTitle className="text-lg mt-2">Enter Verification Code</CardTitle>
                <CardDescription>
                  Enter the 6-digit code sent to your phone (Use <b>123456</b> in mock)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className={isShaking ? 'animate-shake' : ''}>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setOtpError('');
                      if (val.length === 6) {
                        onVerifyOtp(val);
                      }
                    }}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {otpError && (
                  <p className="text-xs text-center text-destructive font-medium">
                    {otpError}
                  </p>
                )}

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => onVerifyOtp(otp)}
                    disabled={otp.length !== 6 || loading}
                    className="w-full font-semibold gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Verify Code</span>
                  </Button>

                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Resend code in{' '}
                        <span className="font-mono font-semibold text-foreground">
                          0:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* STEP 3: First-time profile name */}
          {step === 'name' && (
            <>
              <CardHeader className="pb-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand mb-1">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">What should we call you?</CardTitle>
                <CardDescription>
                  Your name helps the kitchen staff call out your order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSaveName} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="student-name-input"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Full Name
                    </label>
                    <Input
                      id="student-name-input"
                      type="text"
                      placeholder="e.g. Shubh Kumar"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!studentName.trim() || loading}
                    className="w-full font-semibold gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Continue to Canteens</span>
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
