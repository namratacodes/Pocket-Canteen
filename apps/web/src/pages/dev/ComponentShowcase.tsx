import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/common/Price';
import { VegDot } from '@/components/common/VegDot';
import { TokenChip } from '@/components/common/TokenChip';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConnectionDot } from '@/components/common/ConnectionDot';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useConnection } from '@/stores/connectionStore';
import { Coffee, RotateCw } from 'lucide-react';
import type { OrderStatus } from '@/types';

export const ComponentShowcase: React.FC = () => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [demoOtp, setDemoOtp] = useState('123456');

  const connectionStatus = useConnection((s) => s.status);
  const setConnectionStatus = useConnection((s) => s.set);

  const statuses: OrderStatus[] = [
    'placed',
    'queued',
    'preparing',
    'ready',
    'completed',
    'cancelled',
  ];

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {showSpinner && (
        <div>
          <FullPageSpinner />
          <button
            onClick={() => setShowSpinner(false)}
            className="fixed top-4 right-4 z-[60] bg-white text-black px-4 py-2 rounded-xl text-xs font-bold shadow-lg"
          >
            Close Preview
          </button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Phase 1 Design System & Component Kit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live interactive showcase for all design tokens, shared primitives, and accessible widgets.
        </p>
      </div>

      {/* 1. Price Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Price Formatter (`Price`)</CardTitle>
          <CardDescription>
            Enforces INR format `₹1,234.50` with JetBrains Mono font
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Standard (₹35)</span>
            <Price amount={35} className="text-lg" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Decimal (₹120.5)</span>
            <Price amount={120.5} className="text-lg text-brand" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Large (₹42,500)</span>
            <Price amount={42500} className="text-2xl font-bold" />
          </div>
        </CardContent>
      </Card>

      {/* 2. VegDot Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. FSSAI Food Marker (`VegDot`)</CardTitle>
          <CardDescription>
            Official Indian green/red square-in-square indicator in sm, md, lg
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Veg (sm, md, lg):</span>
            <VegDot isVeg={true} size="sm" />
            <VegDot isVeg={true} size="md" />
            <VegDot isVeg={true} size="lg" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Non-Veg (sm, md, lg):</span>
            <VegDot isVeg={false} size="sm" />
            <VegDot isVeg={false} size="md" />
            <VegDot isVeg={false} size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* 3. TokenChip Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Order Token (`TokenChip`)</CardTitle>
          <CardDescription>
            High contrast monospace token chip for student tickets and kitchen board
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Small (List item)</span>
            <TokenChip token="A-14" size="sm" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Large (Kitchen card)</span>
            <TokenChip token="B-09" size="lg" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Extra Large (Live Tracker)</span>
            <TokenChip token="A-14" size="xl" />
          </div>
        </CardContent>
      </Card>

      {/* 4. StatusBadge Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Order Status (`StatusBadge`)</CardTitle>
          <CardDescription>
            Maps the 6 backend order states and payment pending state using statusMeta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-2">
              Staff / Admin Labels:
            </span>
            <div className="flex flex-wrap gap-3">
              {statuses.map((st) => (
                <StatusBadge key={st} status={st} />
              ))}
              <StatusBadge status="placed" paymentStatus="pending" />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-2">
              Student Consumer Labels:
            </span>
            <div className="flex flex-wrap gap-3">
              {statuses.map((st) => (
                <StatusBadge key={st} status={st} isStudent={true} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. ConnectionDot Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Real-Time Status (`ConnectionDot`)</CardTitle>
          <CardDescription>
            Pulsing live indicator reacting to connectionStore and network events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 border p-3 rounded-xl">
              <ConnectionDot showLabel={true} />
              <span className="text-xs text-muted-foreground font-mono">
                (current: {connectionStatus})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Simulate State:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConnectionStatus('connected')}
            >
              🟢 Connected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConnectionStatus('reconnecting')}
            >
              🟠 Reconnecting
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConnectionStatus('offline')}
            >
              🔴 Offline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 6. Button Sizes & Touch Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Buttons & Kitchen Touch Targets</CardTitle>
          <CardDescription>
            Minimum 44px on student mobile, 56px (`kitchen` size) for greasy tablet use
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button variant="default">Student Default (44px)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="success">Success</Button>
          <Button variant="outline">Outline</Button>
          <Button size="kitchen" variant="default" className="shadow-md">
            Kitchen Size (56px Target)
          </Button>
        </CardContent>
      </Card>

      {/* 7. InputOTP Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7. 6-Digit OTP / Pickup PinPad (`InputOTP`)</CardTitle>
          <CardDescription>
            Accessible numeric inputs with auto-advance and paste support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-xs">
            <InputOTP maxLength={6} value={demoOtp} onChange={setDemoOtp}>
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
          <p className="text-xs text-muted-foreground font-mono">Value: {demoOtp}</p>
        </CardContent>
      </Card>

      {/* 8. Empty & Error States */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">8a. Empty State (`EmptyState`)</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Coffee}
              title="Cart is Empty"
              description="Your tray is currently empty. Browse canteen menus to add delicious items."
              action={<Button size="sm">Browse Canteens</Button>}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">8b. Error State (`ErrorState`)</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorState
              title="Menu Load Failed"
              error={{ message: 'Unable to reach Main Canteen service.' }}
              onRetry={() => alert('Retry clicked')}
            />
          </CardContent>
        </Card>
      </div>

      {/* 9. Skeleton Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">9. Skeleton Placeholder (`SkeletonCard`)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} hasImage={true} />
        </CardContent>
      </Card>

      {/* 10. Dialogs & Full Page Spinner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">10. Modals & Bootstrap Spinners</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={() => setConfirmOpen(true)} variant="outline">
            Open Confirm Dialog Demo
          </Button>

          <Button
            onClick={() => {
              setShowSpinner(true);
              setTimeout(() => setShowSpinner(false), 2000);
            }}
            variant="secondary"
            className="gap-2"
          >
            <RotateCw className="h-4 w-4" />
            <span>Preview Full Page Auth Spinner (2s)</span>
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Cancel Order A-14?"
            description="Are you sure you want to cancel this order? ₹110 will be refunded to your Pocket Canteen wallet immediately."
            confirmText="Yes, Cancel Order"
            destructive={true}
            loading={confirmLoading}
            onConfirm={() => {
              setConfirmLoading(true);
              setTimeout(() => {
                setConfirmLoading(false);
                setConfirmOpen(false);
              }, 1200);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
