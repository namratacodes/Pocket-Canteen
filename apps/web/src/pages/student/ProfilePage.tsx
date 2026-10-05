import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, LogOut, Shield, BellRing, Smartphone, Loader2 } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { api } from '@/lib/api/client';
import { socket } from '@/lib/socket/socketClient';
import { queryClient } from '@/app/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const clearAuth = useAuth((state) => state.clear);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearAuth();
      socket.disconnect();
      queryClient.clear();
      toast.success('Signed out successfully.');
      navigate('/login');
    }
  };

  return (
    <div className="space-y-4">
      <div className="pt-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Student Profile
        </h2>
        <p className="text-xs text-muted-foreground">
          Account details and preferences
        </p>
      </div>

      {/* Account Info Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand text-xl font-bold">
              {user?.name ? user.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">
                  {user?.name || 'Student Account'}
                </h3>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                  {user?.role || 'Student'}
                </Badge>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {user?.phone || '+91 98765 43210'}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                <span>Verified Mobile</span>
              </span>
              <span className="font-mono text-foreground font-semibold">
                {user?.phone}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                <span>Authentication</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                OTP-Protected
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings / Shortcuts */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          App Settings
        </h3>

        <Card className="border">
          <CardContent className="p-3 divide-y divide-border">
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-2.5">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Order Notifications</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Enabled
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Progressive Web App</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                v1.0.0 (Phase 1)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout button */}
      <div className="pt-2">
        <Button
          variant="outline"
          disabled={loggingOut}
          onClick={handleLogout}
          className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span>Sign Out of Account</span>
        </Button>
      </div>
    </div>
  );
};
