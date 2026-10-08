import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  Coins,
  LogOut,
  Palette,
} from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { ConnectionDot } from '@/components/common/ConnectionDot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { queryClient } from '@/app/queryClient';
import { socket } from '@/lib/socket/socketClient';
import { OfflineBanner } from '@/components/common/OfflineBanner';

export const AdminShell: React.FC = () => {
  const user = useAuth((state) => state.user);
  const clearAuth = useAuth((state) => state.clear);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearAuth();
      socket.disconnect();
      queryClient.clear();
      navigate('/admin/login');
    }
  };

  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/canteens', label: 'Canteens', icon: Store, end: false },
    { to: '/admin/staff', label: 'Staff Accounts', icon: Users, end: false },
    { to: '/admin/settlements', label: 'Settlements', icon: Coins, end: false },
    { to: '/dev/components', label: 'Design System', icon: Palette, end: false },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-foreground">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col justify-between p-4 z-20">
        <div className="space-y-6">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="h-10 w-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-xl shadow-md shadow-brand/20">
              🍽
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight leading-tight">
                Pocket Canteen
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                Governance Portal
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand text-white font-semibold shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout in Sidebar Footer */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="truncate">
              <p className="text-sm font-semibold truncate">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || 'admin@pc.in'}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
              Admin
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full gap-2 border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <OfflineBanner variant="admin" />

        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-background/80 backdrop-blur border-b border-border px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConnectionDot showLabel={true} />
            <span className="text-xs text-muted-foreground">
              Campus Canteen Network (5 Units)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-mono text-xs">
              Env: Mock Mode
            </Badge>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
