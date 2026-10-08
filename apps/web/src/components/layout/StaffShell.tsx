import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChefHat,
  ClipboardList,
  Utensils,
  BarChart3,
  Volume2,
  VolumeX,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { ConnectionDot } from '@/components/common/ConnectionDot';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { queryClient } from '@/app/queryClient';
import { socket } from '@/lib/socket/socketClient';
import { OfflineBanner } from '@/components/common/OfflineBanner';

export const StaffShell: React.FC = () => {
  const user = useAuth((state) => state.user);
  const clearAuth = useAuth((state) => state.clear);
  const navigate = useNavigate();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearAuth();
      socket.disconnect();
      queryClient.clear();
      navigate('/staff/login');
    }
  };

  const navItems = [
    { to: '/staff/board', label: 'Board', icon: ClipboardList },
    { to: '/staff/menu', label: 'Menu', icon: Utensils },
    { to: '/staff/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="dark flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Left Navigation Rail */}
      <aside className="w-20 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 justify-between z-30 select-none">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Brand mark */}
          <div className="h-12 w-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand">
            <ChefHat className="h-7 w-7" />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center gap-3 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center justify-center gap-1 w-full h-16 rounded-2xl transition-all',
                      isActive
                        ? 'bg-brand text-white shadow-lg shadow-brand/25 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )
                  }
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Logout bottom rail button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Sign out of Kitchen"
          className="h-12 w-12 rounded-2xl text-slate-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <OfflineBanner variant="kitchen" />

        {/* Top Kitchen Bar */}
        <header className="h-16 flex-shrink-0 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🍳</span>
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                {user?.canteenName || 'Main Canteen'} · Kitchen
              </h1>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <ConnectionDot showLabel={true} />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors',
                soundEnabled
                  ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400'
              )}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  <span>Muted</span>
                </>
              )}
            </button>

            {/* Live Clock */}
            <div className="font-mono text-base font-bold tracking-wider text-slate-200 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-inner">
              {currentTime || '--:--:--'}
            </div>

            {/* Logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Exit</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
