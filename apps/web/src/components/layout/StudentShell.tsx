import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, ReceiptText, Wallet, User as UserIcon } from 'lucide-react';
import { ConnectionDot } from '@/components/common/ConnectionDot';
import { cn } from '@/lib/utils';

export const StudentShell: React.FC = () => {
  const navigate = useNavigate();

  const navItems = [
    { to: '/student', label: 'Home', icon: Home, end: true },
    { to: '/student/orders', label: 'Orders', icon: ReceiptText, end: false },
    { to: '/student/wallet', label: 'Wallet', icon: Wallet, end: false },
    { to: '/student/profile', label: 'Profile', icon: UserIcon, end: false },
  ];

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-foreground flex justify-center selection:bg-brand/20">
      {/* Mobile-first frame */}
      <div className="w-full max-w-[480px] min-h-screen bg-background border-x border-border shadow-sm flex flex-col relative pb-20">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍽</span>
            <span className="font-bold tracking-tight text-base text-foreground">
              Pocket Canteen
            </span>
            <ConnectionDot className="ml-1" />
          </div>

          {/* Wallet placeholder chip */}
          <button
            onClick={() => navigate('/student/wallet')}
            className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <span>💰</span>
            <span className="font-mono">₹--</span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <nav
          aria-label="Student Navigation"
          className="fixed bottom-0 z-40 w-full max-w-[480px] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
        >
          <div className="grid grid-cols-4 h-16 items-center px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors py-1',
                      isActive
                        ? 'text-brand font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          'h-5 w-5 transition-transform',
                          isActive && 'scale-110 stroke-[2.5px]'
                        )}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
