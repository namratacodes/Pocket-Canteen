import { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isIos, isStandalone, usePwa } from './pwaStore';

const IOS_TIP_KEY = 'pc-ios-install-tip-dismissed';

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(IOS_TIP_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * "Install app" card.
 * - Android/desktop Chrome: a button that opens the browser's install dialog.
 * - iPhone/iPad Safari: a one-time tip (iOS has no install button for web apps).
 * - Already installed: renders nothing.
 */
export const InstallAppCard = ({ className }: { className?: string }) => {
  const installEvent = usePwa((s) => s.installEvent);
  const installed = usePwa((s) => s.installed);
  const [iosDismissed, setIosDismissed] = useState(readDismissed);

  if (installed || isStandalone()) return null;

  if (installEvent) {
    const install = async () => {
      await installEvent.prompt();
      await installEvent.userChoice;
      usePwa.getState().setInstallEvent(null); // the event can only be used once
    };
    return (
      <Card className={cn('flex items-center justify-between gap-3 p-4', className)}>
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 shrink-0 text-brand-dark" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Install Pocket Canteen</p>
            <p className="text-xs text-muted-foreground">Opens faster and works even on weak Wi-Fi.</p>
          </div>
        </div>
        <Button className="min-h-[44px]" onClick={install}>
          Install app
        </Button>
      </Card>
    );
  }

  if (isIos() && !iosDismissed) {
    const dismiss = () => {
      try {
        localStorage.setItem(IOS_TIP_KEY, '1');
      } catch {
        /* ignore */
      }
      setIosDismissed(true);
    };
    return (
      <Card className={cn('flex items-center justify-between gap-3 p-4', className)}>
        <div className="flex items-center gap-3">
          <Share className="h-5 w-5 shrink-0 text-brand-dark" aria-hidden />
          <p className="text-sm">
            To install: tap <span className="font-semibold">Share</span>, then{' '}
            <span className="font-semibold">Add to Home Screen</span>.
          </p>
        </div>
        <Button variant="outline" className="min-h-[44px]" onClick={dismiss}>
          Got it
        </Button>
      </Card>
    );
  }

  return null;
};