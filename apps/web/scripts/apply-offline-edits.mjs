// Applies the small offline-mode edits to existing screens.
//   node scripts/apply-offline-edits.mjs
// Safe to run twice. A file is only written when EVERY edit for it matches exactly once,
// so a file is never left half-edited. Run from apps/web.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ONLINE_IMPORT = "import { useIsOnline } from '@/lib/network/useOnlineStatus';";
const DONE_IMPORT = "from '@/lib/network/useOnlineStatus'";
const DONE_HOOK = 'const online = useIsOnline();';

// Each step: find (string or RegExp, must match exactly once), replace, done (text that proves it was applied).
const edits = {
  'src/app/queryClient.ts': [
    {
      name: 'queries: try the network (or the saved copy) even when the browser says offline',
      find: 'staleTime: 30_000,',
      replace: `staleTime: 30_000,
      // Still try the request when offline, so the saved copy from the service worker can answer
      // instead of the screen going blank.
      networkMode: 'offlineFirst',`,
      done: "networkMode: 'offlineFirst'",
    },
    {
      name: 'mutations: never queue and replay later',
      find: /refetchOnWindowFocus: true,(\s*)\},(\s*)\},(\s*)\}\);/,
      replace: `refetchOnWindowFocus: true,$1},
    // Never hold an action (order, payment, settlement) while offline and replay it later.
    mutations: {
      networkMode: 'always',
    },$2},$3});`,
      done: "networkMode: 'always'",
    },
  ],

  'src/features/student/menu/MenuItemCard.tsx': [
    { name: 'import', find: "import { cn } from '@/lib/utils';", replace: `import { cn } from '@/lib/utils';\n${ONLINE_IMPORT}`, done: DONE_IMPORT },
    { name: 'hook', find: 'const dec = useCartStore((state) => state.dec);', replace: `const dec = useCartStore((state) => state.dec);\n  ${DONE_HOOK}`, done: DONE_HOOK },
    {
      name: 'disable ADD',
      find: 'onClick={handleAdd}',
      replace: `onClick={handleAdd}\n                disabled={!online}\n                aria-label={online ? undefined : 'Connect to order'}`,
      done: "aria-label={online ? undefined : 'Connect to order'}",
    },
    { name: 'ADD label', find: />(\s*)ADD(\s*)<\/Button>/, replace: ">$1{online ? 'ADD' : 'OFFLINE'}$2</Button>", done: "'OFFLINE'" },
  ],

  'src/features/student/menu/ItemDetailSheet.tsx': [
    { name: 'import', find: "import { useCartStore } from '@/stores/cartStore';", replace: `import { useCartStore } from '@/stores/cartStore';\n${ONLINE_IMPORT}`, done: DONE_IMPORT },
    { name: 'hook', find: 'const dec = useCartStore((state) => state.dec);', replace: `const dec = useCartStore((state) => state.dec);\n  ${DONE_HOOK}`, done: DONE_HOOK },
    { name: 'disable Add to Cart', find: 'onClick={handleAdd}', replace: 'onClick={handleAdd}\n                disabled={!online}', done: 'onClick={handleAdd}\n                disabled={!online}' },
    { name: 'label', find: />(\s*)Add to Cart(\s*)<\/Button>/, replace: ">$1{online ? 'Add to Cart' : 'Connect to order'}$2</Button>", done: "'Connect to order'" },
  ],

  'src/features/student/menu/ComboCarousel.tsx': [
    { name: 'import', find: "import { useCartStore } from '@/stores/cartStore';", replace: `import { useCartStore } from '@/stores/cartStore';\n${ONLINE_IMPORT}`, done: DONE_IMPORT },
    { name: 'hook', find: 'const add = useCartStore((state) => state.add);', replace: `const add = useCartStore((state) => state.add);\n  ${DONE_HOOK}`, done: DONE_HOOK },
    { name: 'disable', find: 'disabled={!isCanteenOpen || hasSoldOut}', replace: 'disabled={!isCanteenOpen || hasSoldOut || !online}', done: 'hasSoldOut || !online' },
    { name: 'label', find: '<span>Add both</span>', replace: "<span>{online ? 'Add both' : 'Offline'}</span>", done: "'Add both' : 'Offline'" },
  ],

  'src/features/student/cart/CartSheet.tsx': [
    { name: 'import', find: "import type { MenuItem, ComboSuggestion } from '@/types';", replace: `import type { MenuItem, ComboSuggestion } from '@/types';\n${ONLINE_IMPORT}`, done: DONE_IMPORT },
    { name: 'hook', find: 'const count = useCartStore(selectCount);', replace: `const count = useCartStore(selectCount);\n  ${DONE_HOOK}`, done: DONE_HOOK },
    { name: 'disable upsell Add', find: "onClick={() => add(upsellMissingItem, canteenName || '')}", replace: "onClick={() => add(upsellMissingItem, canteenName || '')}\n                    disabled={!online}", done: "canteenName || '')}\n                    disabled={!online}" },
    { name: 'disable checkout', find: 'onClick={handleCheckout}', replace: 'onClick={handleCheckout}\n              disabled={!online}', done: 'onClick={handleCheckout}\n              disabled={!online}' },
    { name: 'checkout label', find: '<span>Proceed to Checkout</span>', replace: "<span>{online ? 'Proceed to Checkout' : 'Connect to order'}</span>", done: "'Proceed to Checkout' : 'Connect to order'" },
  ],

  'src/features/student/checkout/CheckoutPage.tsx': [
    { name: 'React import', find: "import React, { useState, useMemo } from 'react';", replace: "import React, { useState, useMemo, useEffect } from 'react';", done: 'useMemo, useEffect }' },
    {
      name: 'imports',
      find: "import type { Wallet } from '@/types';",
      replace: `import type { Wallet } from '@/types';\n${ONLINE_IMPORT}\nimport { setCheckoutActive } from '@/pwa/pwaStore';`,
      done: DONE_IMPORT,
    },
    {
      name: 'hooks',
      find: 'const count = useCartStore(selectCount);',
      replace: `const count = useCartStore(selectCount);
  ${DONE_HOOK}

  // Hold the "new version available" message while the student is paying.
  useEffect(() => {
    setCheckoutActive(true);
    return () => setCheckoutActive(false);
  }, []);`,
      done: 'setCheckoutActive(true)',
    },
    {
      name: 'error title',
      find: ": 'Order Failed'}",
      replace: `: orderError.code === 'NETWORK'
                  ? 'Order Not Confirmed'
                  : orderError.code === 'OFFLINE'
                  ? "You're Offline"
                  : 'Order Failed'}`,
      done: "'Order Not Confirmed'",
    },
    {
      name: 'Check My Orders button',
      find: "{orderError.code === 'NETWORK' && (",
      replace: `{orderError.code === 'NETWORK' && (
              <Button
                size="sm"
                onClick={() => navigate('/student/orders')}
                className="h-8 px-3 rounded-lg text-xs font-semibold"
              >
                Check My Orders
              </Button>
            )}

            {orderError.code === 'NETWORK' && (`,
      done: 'Check My Orders',
    },
    {
      name: 'Try Again disabled offline',
      find: /onClick=\{handlePlaceOrder\}(\s*)className="h-8 px-3/,
      replace: 'onClick={handlePlaceOrder}\n                disabled={!online}$1className="h-8 px-3',
      done: 'onClick={handlePlaceOrder}\n                disabled={!online}',
    },
    { name: 'disable pay button', find: 'disabled={isSubmitting}', replace: 'disabled={isSubmitting || !online}', done: 'isSubmitting || !online' },
    {
      name: 'pay button label',
      find: '{gatewayAmount === 0',
      replace: `{!online
                    ? 'Connect to order'
                    : gatewayAmount === 0`,
      done: "? 'Connect to order'",
    },
  ],

  'src/features/student/checkout/useCreateOrder.ts': [
    {
      name: 'refuse to start while offline',
      find: "if (step !== 'idle') return; // Guard against double submission",
      replace: `if (step !== 'idle') return; // Guard against double submission

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setOrderError({
        code: 'OFFLINE',
        message: "You're offline. Connect to the internet to place your order.",
      });
      return;
    }`,
      done: "code: 'OFFLINE'",
    },
    {
      name: 'safe message when the connection drops mid-request',
      find: /message: err\.message,(\s*)details: err\.details,/,
      replace: `message:
            err.code === 'NETWORK'
              ? "We couldn't confirm your order. Check My orders when you're back online before trying again."
              : err.message,$1details: err.details,`,
      done: "err.code === 'NETWORK'\n              ? \"We couldn't confirm",
    },
    {
      name: 'same message for non-API network failures',
      find: 'message: "Couldn\'t reach server. Check your internet connection.",',
      replace: `message:
          "We couldn't confirm your order. Check My orders when you're back online before trying again.",`,
      done: "\n          \"We couldn't confirm your order. Check My orders when you're back online before trying again.\",",
    },
  ],

  'src/features/student/orders/OrderConfirmationPage.tsx': [
    {
      name: 'imports (also fixes the missing formatINR import)',
      find: "import { formatTime, formatDate } from '@/lib/format';",
      replace: `import { formatTime, formatDate, formatINR } from '@/lib/format';
${ONLINE_IMPORT}
import { PickupCodeFallback } from './PickupCodeFallback';`,
      done: "import { PickupCodeFallback } from './PickupCodeFallback';",
    },
    { name: 'hook', find: "const isPendingQuery = searchParams.get('pending') === '1';", replace: `const isPendingQuery = searchParams.get('pending') === '1';\n  ${DONE_HOOK}`, done: DONE_HOOK },
    {
      name: 'keep the pickup code visible when the order cannot be loaded',
      find: 'if (isError || !order) {',
      replace: `if ((isError || !order) && storedCodeData) {
    // The pickup code lives on this phone, so it stays visible even when the order can't be loaded.
    return (
      <div className="space-y-4 pb-12">
        <PickupCodeFallback
          tokenNo={storedCodeData.tokenNo}
          code={storedCodeData.code}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isError || !order) {`,
      done: '<PickupCodeFallback',
    },
    {
      name: 'stale tag',
      find: '{/* Fresh Order Celebration Banner */}',
      replace: `{!online && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
        >
          Offline. This is the last saved status. It will update when you're back online.
        </div>
      )}

      {/* Fresh Order Celebration Banner */}`,
      done: 'This is the last saved status',
    },
    { name: 'disable retry payment', find: 'disabled={isRetryingPayment}', replace: 'disabled={isRetryingPayment || !online}', done: 'isRetryingPayment || !online' },
  ],

  'src/lib/payments/razorpay.ts': [
    {
      name: 'never fall back to the fake gateway outside mock mode',
      find: `    // Fallback to mock modal if real Razorpay fails to load
    return openMockRazorpayModal(opts);`,
      replace: `    // Never show the fake test gateway outside mock mode. A failed script load (offline, blocked)
    // must surface as an error, not as a "Simulate Payment Success" button.
    throw new Error("Couldn't load the payment page. Check your internet connection and try again.");`,
      done: 'Never show the fake test gateway',
    },
  ],

  'src/features/student/menu/MenuPage.tsx': [
    { name: 'import', find: "import type { ApiError } from '@/lib/api/client';", replace: "import type { ApiError } from '@/lib/api/client';\nimport { LastUpdatedNote } from '@/components/common/LastUpdatedNote';", done: "import { LastUpdatedNote }" },
    {
      name: 'last updated note',
      find: '{/* Controls: Search and Veg Only Toggle */}',
      replace: `<LastUpdatedNote scope={'menu:' + canteenId} hasData={menuItems.length > 0} />

      {/* Controls: Search and Veg Only Toggle */}`,
      done: '<LastUpdatedNote',
    },
  ],

  'src/features/student/canteens/CanteenSelectorPage.tsx': [
    {
      name: 'imports',
      find: "import type { ApiError } from '@/lib/api/client';",
      replace: `import type { ApiError } from '@/lib/api/client';
import { LastUpdatedNote } from '@/components/common/LastUpdatedNote';
import { InstallAppCard } from '@/pwa/InstallAppCard';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';`,
      done: "import { InstallAppCard }",
    },
    {
      name: 'has the student placed an order',
      find: "const [searchQuery, setSearchQuery] = useState('');",
      replace: `const [searchQuery, setSearchQuery] = useState('');
  // Offer "Install app" once the student has placed an order.
  const hasOrdered = usePickupCodeStore((state) => Object.keys(state.codes).length > 0);`,
      done: 'const hasOrdered',
    },
    {
      name: 'install card and last updated note',
      find: '{/* Search Bar */}',
      replace: `{hasOrdered && <InstallAppCard />}

      <LastUpdatedNote scope="canteens" hasData={canteens.length > 0} />

      {/* Search Bar */}`,
      done: '{hasOrdered && <InstallAppCard />}',
    },
  ],

  'src/pages/student/ProfilePage.tsx': [
    { name: 'import', find: "import { toast } from 'sonner';", replace: "import { toast } from 'sonner';\nimport { InstallAppCard } from '@/pwa/InstallAppCard';", done: "import { InstallAppCard }" },
    { name: 'install card', find: '{/* Account Info Card */}', replace: '<InstallAppCard />\n\n      {/* Account Info Card */}', done: '<InstallAppCard />' },
  ],

  'src/components/layout/StudentShell.tsx': [
    {
      name: 'imports',
      find: "import type { Wallet as WalletType } from '@/types';",
      replace: `import type { Wallet as WalletType } from '@/types';
import { OfflineBanner } from '@/components/common/OfflineBanner';
${ONLINE_IMPORT}`,
      done: "import { OfflineBanner }",
    },
    { name: 'hook', find: 'const navigate = useNavigate();', replace: `const navigate = useNavigate();\n  ${DONE_HOOK}`, done: DONE_HOOK },
    {
      name: 'wallet chip: may be outdated',
      find: /<\/button>(\s*)<\/header>/,
      replace: `{!online && (
              <span className="text-[10px] font-normal text-amber-700">may be outdated</span>
            )}
          </button>$1</header>`,
      done: 'may be outdated',
    },
    {
      name: 'banner above the header, sticky together',
      find: '<header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">',
      replace: `<div className="sticky top-0 z-40">
        <OfflineBanner variant="student" />
        <header className="flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">`,
      done: '<OfflineBanner variant="student" />',
    },
    { name: 'close the sticky wrapper', find: '</header>', replace: '</header>\n        </div>', done: '</header>\n        </div>' },
  ],

  'src/components/layout/StaffShell.tsx': [
    { name: 'import', find: "import { socket } from '@/lib/socket/socketClient';", replace: "import { socket } from '@/lib/socket/socketClient';\nimport { OfflineBanner } from '@/components/common/OfflineBanner';", done: "import { OfflineBanner }" },
    { name: 'kitchen banner', find: '{/* Top Kitchen Bar */}', replace: '<OfflineBanner variant="kitchen" />\n\n        {/* Top Kitchen Bar */}', done: '<OfflineBanner variant="kitchen" />' },
  ],

  'src/components/layout/AdminShell.tsx': [
    { name: 'import', find: "import { socket } from '@/lib/socket/socketClient';", replace: "import { socket } from '@/lib/socket/socketClient';\nimport { OfflineBanner } from '@/components/common/OfflineBanner';", done: "import { OfflineBanner }" },
    { name: 'admin banner', find: '{/* Top Header */}', replace: '<OfflineBanner variant="admin" />\n\n        {/* Top Header */}', done: '<OfflineBanner variant="admin" />' },
  ],
};

function count(text, find) {
  if (typeof find === 'string') return text.split(find).length - 1;
  const flags = find.flags.includes('g') ? find.flags : find.flags + 'g';
  return (text.match(new RegExp(find.source, flags)) || []).length;
}

let failed = 0;
for (const [rel, steps] of Object.entries(edits)) {
  const file = path.join(root, rel);
  if (!existsSync(file)) { console.log(`MISSING  ${rel} (file not found, skipped)`); failed++; continue; }

  const raw = readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  let text = raw.replace(/\r\n/g, '\n');
  const problems = [];
  let changed = 0;
  let already = 0;

  for (const s of steps) {
    if (text.includes(s.done)) { already++; continue; }
    const n = count(text, s.find);
    if (n !== 1) { problems.push(`  - "${s.name}": expected 1 match, found ${n}`); continue; }
    text = typeof s.find === 'string' ? text.replace(s.find, () => s.replace) : text.replace(s.find, s.replace);
    changed++;
  }

  if (problems.length) {
    failed++;
    console.log(`FAILED   ${rel}  (file left untouched)\n${problems.join('\n')}`);
  } else if (changed === 0) {
    console.log(`already  ${rel}`);
  } else {
    writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8');
    console.log(`edited   ${rel}  (${changed} change${changed > 1 ? 's' : ''}${already ? `, ${already} already done` : ''})`);
  }
}
console.log(failed ? `\n${failed} file(s) need attention. Send me the FAILED lines.` : '\nAll edits applied.');
process.exit(failed ? 1 : 0);