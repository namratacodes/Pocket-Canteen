
---
---

# 📎 APPENDIX — Shared UI & Engineering Contract (identical in every phase)

> [!IMPORTANT]
> This appendix is **copied word-for-word into all 6 phase files**. It's what keeps screens built by different people looking and behaving like one app.
> **Rules:**
> 1. If `src/styles/tokens.css`, `tailwind.config.ts`, or a component listed here already exists in the repo, **use it. Don't recreate it.**
> 2. If it doesn't exist, create it **exactly** as written here.
> 3. **Never hard-code** hex colours, font sizes, or raw `fetch` calls in feature code. Use the tokens, components and helpers below.
> 4. To change anything in this contract, update it in **all 6 phase files plus `shared_ui_contract.md`** in one PR, reviewed by the whole team.
>
> **Contract version: v1.0 (5 Oct 2026)**

## A. Design Tokens

### A.1 `src/styles/tokens.css` (CSS variables, HSL format for shadcn)
```css
@tailwind base; @tailwind components; @tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;          /* #FFFFFF */
    --foreground: 222 47% 11%;        /* slate-900 #0F172A */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --muted: 210 40% 96%;             /* slate-100 */
    --muted-foreground: 215 16% 47%;  /* slate-500 */
    --border: 214 32% 91%;            /* slate-200 */
    --input: 214 32% 91%;
    --ring: 25 95% 53%;               /* brand */

    --primary: 25 95% 53%;            /* brand orange #F97316 */
    --primary-foreground: 0 0% 100%;
    --brand-dark: 17 88% 40%;         /* #C2410C — small text on white, pressed */
    --brand-soft: 33 100% 96%;        /* #FFF7ED — tinted backgrounds */

    --success: 142 72% 29%;           /* #15803D */
    --success-soft: 138 76% 97%;      /* #F0FDF4 */
    --warning: 38 92% 50%;            /* #F59E0B */
    --warning-soft: 48 100% 96%;      /* #FFFBEB */
    --danger: 0 72% 51%;              /* #DC2626 */
    --danger-soft: 0 86% 97%;         /* #FEF2F2 */
    --info: 221 83% 53%;              /* #2563EB */
    --info-soft: 214 100% 97%;        /* #EFF6FF */

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --radius: 1rem;
  }
  .dark {                              /* staff kitchen board is always dark */
    --background: 222 47% 7%;         /* #0B1120 */
    --foreground: 210 40% 98%;
    --card: 217 33% 12%;              /* #141C2E */
    --card-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --border: 217 33% 20%;
    --input: 217 33% 20%;
    --success-soft: 142 50% 12%;
    --warning-soft: 38 60% 12%;
    --danger-soft: 0 50% 14%;
    --info-soft: 221 50% 14%;
    --brand-soft: 25 60% 12%;
  }
  body { @apply bg-background text-foreground antialiased; font-feature-settings: "tnum" 1; }
}
```

### A.2 `tailwind.config.ts` (`theme.extend`)
```ts
import { fontFamily } from 'tailwindcss/defaultTheme';
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        brand: { DEFAULT: 'hsl(var(--primary))', dark: 'hsl(var(--brand-dark))', soft: 'hsl(var(--brand-soft))' },
        success: { DEFAULT: 'hsl(var(--success))', soft: 'hsl(var(--success-soft))' },
        warning: { DEFAULT: 'hsl(var(--warning))', soft: 'hsl(var(--warning-soft))' },
        danger:  { DEFAULT: 'hsl(var(--danger))',  soft: 'hsl(var(--danger-soft))' },
        info:    { DEFAULT: 'hsl(var(--info))',    soft: 'hsl(var(--info-soft))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        chart: { star: '#F59E0B', plowhorse: '#2563EB', puzzle: '#A855F7', dog: '#64748B', primary: '#F97316', secondary: '#15803D' },
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
        mono: ['"JetBrains Mono"', ...fontFamily.mono],
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 4px)', sm: 'calc(var(--radius) - 8px)' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 8px rgb(0 0 0 / 0.04)',
        float: '0 8px 24px rgb(0 0 0 / 0.12)',
      },
      keyframes: {
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 hsl(var(--info) / .6)' }, '100%': { boxShadow: '0 0 0 12px hsl(var(--info) / 0)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-8px)' }, '40%,80%': { transform: 'translateX(8px)' } },
      },
      animation: { 'pulse-ring': 'pulse-ring 1.2s ease-out infinite', shake: 'shake .4s ease-in-out' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```
Fonts: `npm i @fontsource-variable/inter @fontsource/jetbrains-mono`, imported once in `main.tsx`.

### A.3 Colour usage rules
| Meaning | Token | Use for | Never use for |
|---|---|---|---|
| Brand / primary action | `brand` | Main CTA, active nav, links, focus ring | Status |
| New / informational | `info` | Kitchen "New" column, info banners | CTAs |
| In progress / caution | `warning` | "Preparing", rush chip, amber timers, wallet hold | Errors |
| Done / positive / veg | `success` | "Ready", success toasts, veg dot, credit `+₹` | — |
| Error / destructive / non-veg | `danger` | Cancel buttons, errors, overdue, non-veg dot, debits in red only when negative balance impact matters | Normal debits (use foreground) |
| Neutral | `muted`, `foreground` | Body text, secondary text, completed status | — |
- **Small orange text** (< 18px) on white must use `text-brand-dark` (contrast).
- Soft backgrounds (`bg-success-soft` etc.) are for badges and banners. Pair them with the solid colour for text and icon.

## B. Typography, Spacing, Layout

| Role | Classes |
|---|---|
| Page title | `text-2xl font-bold tracking-tight` |
| Section title | `text-lg font-semibold` |
| Card title | `text-base font-semibold` |
| Body | `text-sm` (student), `text-base` (staff board) |
| Caption / meta | `text-xs text-muted-foreground` |
| Money | `font-semibold tabular-nums` (mono on the kitchen board) |
| Token | `font-mono font-bold` · sm `text-base` · lg `text-3xl` · xl `text-6xl` |
| Pickup code | `font-mono font-bold tracking-[0.4em]` · `text-4xl` (normal) · `text-6xl` (ready) |

- Spacing scale: page padding `p-4` (student), `p-6` (staff/admin). Gap between cards `gap-3` (student), `gap-4` (others). Inside a card `p-4`.
- Radius: cards and sheets `rounded-2xl`, buttons and inputs `rounded-xl`, chips and badges `rounded-full`.
- Shadows: cards `shadow-card`, floating bars and dragged tickets `shadow-float`. Nothing else.
- **Breakpoints and shells:**
  | Shell | Width | Theme | Nav |
  |---|---|---|---|
  | Student | `max-w-[480px] mx-auto` | Light | Bottom nav, 64px tall, 4 items |
  | Staff | Full width, designed for 1024–1920 | **Dark** (`<html class="dark">` while in `/staff`) | 72px left rail + 56px top bar |
  | Admin | `min-w-[1280px]` design, responsive down to 1024 | Light | 240px sidebar + 56px top bar |
- **Touch targets:** at least `h-11` (44px) in student/admin, **at least `h-14` (56px)** on the staff board. PIN pad keys `h-[72px]`.
- **z-index:** content 0 · sticky headers 20 · floating cart bar 30 · sheets/dialogs 50 · toasts 60 · offline/connection banner 70 · shift-start overlay 80.

## C. Icons (lucide-react only, `size={20}` by default, `size={24}` on the board)
| Concept | Icon | Concept | Icon |
|---|---|---|---|
| Home | `Home` | Wallet | `Wallet` |
| Orders | `ReceiptText` | Profile | `User` |
| Canteen | `Store` | Search | `Search` |
| Cart | `ShoppingBag` | ETA / time | `Timer` |
| New order | `ClipboardList` | Preparing | `ChefHat` |
| Ready | `BellRing` | Completed | `CheckCircle2` |
| Cancelled | `XCircle` | Pickup code | `KeyRound` |
| Locked | `Lock` | Refund | `Undo2` |
| Hold | `Hourglass` | Hold released | `Unlock` |
| Sound on/off | `Volume2` / `VolumeX` | Offline | `WifiOff` |
| Rush | `Flame` | Combo | `Sparkles` |
| Analytics | `BarChart3` | Settlements | `ArrowLeftRight` |
| Admin adjust | `ShieldCheck` | Expired | `Clock` |
| Walk alert | `Footprints` | Menu manager | `UtensilsCrossed` |

## D. Order Status: Single Source of Truth (`src/lib/statusMeta.ts`)
```ts
import { ClipboardList, ChefHat, BellRing, CheckCircle2, XCircle, Loader2, type LucideIcon } from 'lucide-react';
export type OrderStatus = 'placed' | 'queued' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded_to_wallet';
type Tone = 'info' | 'warning' | 'success' | 'muted' | 'danger';
export const statusMeta: Record<OrderStatus, { staffLabel: string; studentLabel: string; tone: Tone; icon: LucideIcon; column?: 'new' | 'preparing' | 'ready'; step: 0 | 1 | 2 | 3 | 4 }> = {
  placed:    { staffLabel: 'New',       studentLabel: 'Order received',   tone: 'info',    icon: ClipboardList, column: 'new',       step: 1 },
  queued:    { staffLabel: 'New',       studentLabel: 'Order received',   tone: 'info',    icon: ClipboardList, column: 'new',       step: 1 },
  preparing: { staffLabel: 'Preparing', studentLabel: 'Being prepared',   tone: 'warning', icon: ChefHat,       column: 'preparing', step: 2 },
  ready:     { staffLabel: 'Ready',     studentLabel: 'Ready for pickup', tone: 'success', icon: BellRing,      column: 'ready',     step: 3 },
  completed: { staffLabel: 'Completed', studentLabel: 'Collected',        tone: 'muted',   icon: CheckCircle2,                       step: 4 },
  cancelled: { staffLabel: 'Cancelled', studentLabel: 'Cancelled',        tone: 'danger',  icon: XCircle,                            step: 0 },
};
export const pendingPaymentMeta = { studentLabel: 'Waiting for payment', tone: 'muted' as Tone, icon: Loader2 };
export const toneClasses: Record<Tone, string> = {
  info: 'bg-info-soft text-info', warning: 'bg-warning-soft text-warning', success: 'bg-success-soft text-success',
  muted: 'bg-muted text-muted-foreground', danger: 'bg-danger-soft text-danger',
};
```
**Kitchen column header colours:** New `border-t-4 border-info` · Preparing `border-t-4 border-warning` · Ready `border-t-4 border-success`.
**Timer colours (everywhere):** normal `text-muted-foreground` · amber `text-warning` · red `text-danger font-semibold` (+ `ring-2 ring-danger` on the card).

## E. Shared Components (exact specs; build once in `src/components/common/`)
| Component | Props | Exact look |
|---|---|---|
| `Button` (shadcn) | variants `default` (brand), `secondary`, `outline`, `ghost`, `destructive`; sizes `sm` `default` `lg` `xl`(h-14 text-lg, staff) | `rounded-xl font-semibold`. **One primary button per screen** |
| `Price` | `amount:number; sign?: 'auto'|'none'; className?` | `formatINR()`, `tabular-nums`. With `sign='auto'`: `+₹` in `text-success`, `−₹` in `text-foreground` |
| `VegDot` | `isVeg:boolean` | 14px square `border-2` (success or danger) with an 6px filled circle inside, `aria-label="Veg"/"Non-veg"` |
| `TokenChip` | `token; size:'sm'|'lg'|'xl'` | `font-mono font-bold rounded-xl border-2 border-foreground/80 px-3` |
| `StatusBadge` | `status; paymentStatus?; audience:'student'|'staff'` | `rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex gap-1` + `toneClasses[tone]` + icon 14px. If `paymentStatus==='pending'`, use `pendingPaymentMeta` (spinning icon) |
| `ConnectionDot` | reads `connectionStore` | 8px dot: `bg-success` connected · `bg-warning animate-pulse` reconnecting · `bg-danger` offline. Tooltip text "Live" / "Reconnecting…" / "Offline" |
| `OfflineBanner` | reads `connectionStore` | `bg-danger text-white text-sm py-2 text-center`, `WifiOff` icon, z-70 |
| `EmptyState` | `icon; title; description?; action?` | Centered, icon 40px in a `bg-muted rounded-full p-4` circle, title `text-base font-semibold`, desc `text-sm text-muted-foreground` |
| `ErrorState` | `error: ApiError | Error; onRetry` | Like EmptyState with `AlertTriangle` in `text-danger`. Message from `error.message`. `outline` button "Try again" |
| `SkeletonCard` | `lines?=3` | shadcn `Skeleton` inside a card with the same padding and radius as the real card (no layout shift) |
| `ConfirmDialog` | `open; title; description; confirmText; destructive?; loading?; onConfirm; onOpenChange` | shadcn Dialog. Cancel button = `outline` "Keep" / "Cancel". Confirm = `destructive` if `destructive` |
| `PageHeader` | `title; back?: boolean; right?: ReactNode` | Sticky `h-14` bar, `ChevronLeft` back button, title `text-lg font-semibold` |
| `Toaster` | sonner | `position="top-center"` (student) / `"bottom-right"` (staff, admin), `richColors`, duration 3000ms. Success → `toast.success`, errors → `toast.error`. Max 1 line + optional action |

## F. Copy & Tone
- Friendly, short, and in **second person** ("Your order is ready"). Emoji only in student headlines (max 1). **No emoji in admin.**
- Money is always `₹1,234.00` via `formatINR`. Never `Rs` or `INR 1234`.
- Time: `1:18 PM` (12-hour). Relative: "2 min ago". Dates: `5 Oct` (same year) / `5 Oct 2025`.
- Token always appears as `A-14`. Order reference as `PKT-20261005-0042`.
- Canonical words: **Cancel order** (not "Abort"), **Wallet** (not "Credits"), **Pickup code** (not OTP; OTP is for login only), **Token**, **Counter A**, **Sold out** (not "Unavailable" in the student UI).
- Error messages say **what happened + what to do**: "Couldn't reach server. Check your internet and try again."

## G. Formatters (`src/lib/format.ts`)
```ts
import { format, formatDistanceToNowStrict, isThisYear } from 'date-fns';
export const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
export const formatTime = (iso: string) => format(new Date(iso), 'h:mm a');
export const formatDate = (iso: string) => format(new Date(iso), isThisYear(new Date(iso)) ? 'd MMM' : 'd MMM yyyy');
export const timeAgo = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
export const formatMMSS = (sec: number) => { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const cn = (...c: ClassValue[]) => twMerge(clsx(c));   // in lib/utils.ts
```

## H. API, Errors & Data Fetching
- **Every request goes through `api<T>()`** from `src/lib/api/client.ts`. No raw `fetch` or axios in features.
- Error body from the backend: `{ "error": { "code": "SNAKE_CASE", "message": "Human text", "details": {} } }` → thrown as `ApiError { status, code, message, details }`. A network failure is `ApiError(0, 'NETWORK', "Couldn't reach server")`.
- UI logic switches on **`error.code`**, never on the message.
- Shared error codes: `UNAUTHENTICATED, FORBIDDEN, RATE_LIMITED, NETWORK, VALIDATION_FAILED, ITEM_UNAVAILABLE, PRICE_CHANGED, CANTEEN_CLOSED, INSUFFICIENT_WALLET, ALREADY_PREPARING, NOT_CANCELLABLE, INVALID_TRANSITION, PICKUP_CODE_INVALID, PICKUP_LOCKED, NOT_READY, PAYMENT_EXPIRED, DUPLICATE_FSSAI, EMAIL_EXISTS`.
- Money is a `number` in rupees with 2 decimals (Razorpay `amount` is in **paise**; only `razorpay.ts` deals with paise).
- Dates are ISO-8601 UTC strings, formatted only with the §G helpers.
- **Query keys (`src/lib/api/queryKeys.ts`)**, the only keys allowed:
  ```ts
  export const qk = {
    me: ['me'] as const,
    canteens: ['canteens'] as const,
    canteen: (id: string) => ['canteens', id] as const,
    menu: (canteenId: string) => ['menu', canteenId] as const,
    combos: (canteenId: string) => ['combos', canteenId] as const,
    order: (id: string) => ['orders', id] as const,
    ordersActive: ['orders', 'active'] as const,
    ordersPast: ['orders', 'past'] as const,
    wallet: ['wallet'] as const,
    ledger: (type: string) => ['wallet', 'ledger', type] as const,
    kitchen: (canteenId: string) => ['kitchen', canteenId] as const,
    kitchenMenu: ['kitchen', 'menu'] as const,
    analytics: (name: string, params: object) => ['analytics', name, params] as const,
    admin: (name: string, params?: object) => ['admin', name, params ?? {}] as const,
  };
  ```
- TanStack Query defaults: `staleTime 30s`, `retry` only on 5xx (max 2), `refetchOnWindowFocus true`.

## I. Real-Time Conventions
- Socket event names are `domain:action` in snake_case: `order:new`, `order:status_changed`, `order:eta_updated`, `order:call_to_walk`, `order:cancelled`, `order:pickup_locked`, `menu:availability_changed`, `canteen:status_changed`, `canteen:queue_updated`, `wallet:updated`.
- Rooms: `user:{userId}` · `canteen:{canteenId}` (staff) · `canteen:{canteenId}:public` (students on a menu) · `admin`.
- Subscribe only with the `useSocketEvent(event, handler)` hook. Every handler patches the cache with `queryClient.setQueryData` using the keys in §H.
- **Every handler applies the stale guard:** skip if `incoming.updatedAt < cached.updatedAt`. `order:new` is deduped by `id`.

## J. Local Storage, Sounds, Env
| localStorage key | Owner | Content |
|---|---|---|
| `pc-cart-v1` | cartStore | `{canteenId, canteenName, lines}` |
| `pc-pickup-codes-v1` | pickupCodeStore | `{[orderId]: {code, tokenNo, savedAt}}` (purged after 24h) |
| `pc-prefs-v1` | prefs (veg filter, etc.) | Student UI prefs |
| `pc-kitchen-prefs-v1` | kitchenPrefsStore | `{soundOn, nagMode, density, fontScale, volume}` |
| `pc-onboard-draft` (sessionStorage) | Onboarding wizard | Form draft |
Tokens are **never** stored in localStorage.

| Sound file (`public/sounds/`) | Used for |
|---|---|
| `new-order.mp3` | Kitchen: new order |
| `ding.mp3` | Kitchen: nag reminder / ready from another device |
| `chime.mp3` | Student: call-to-walk / ready |

Env vars: `VITE_API_URL`, `VITE_WS_URL`, `VITE_RAZORPAY_KEY_ID`, `VITE_USE_MOCKS`, `VITE_SENTRY_DSN`.

## K. Motion
- Durations: micro `150ms`, standard `200ms`, step tracker and progress `700ms`. Easing `ease-out`.
- Approved animations only: `animate-pulse-ring` (new ticket, 10s), `animate-shake` (wrong pickup code), fade/slide from `tailwindcss-animate` for dialogs and sheets, card exit `opacity-0 scale-95` 200ms.
- Wrap all of them in `motion-safe:`, so they're disabled when `prefers-reduced-motion` is set.

## L. Code Conventions
- Files: components `PascalCase.tsx`, hooks `useCamelCase.ts`, others `camelCase.ts`. One component per file.
- Folders: `src/features/<role>/<area>/` for screens, `src/components/common/` for shared UI, `src/lib/` for helpers, `src/stores/` for Zustand, `src/mocks/` for MSW.
- Forms: react-hook-form + zod. Errors appear below the field as `text-xs text-danger`.
- Every data screen implements **4 states**: loading (`SkeletonCard`), empty (`EmptyState`), error (`ErrorState`), success.
- ESLint (`react/no-danger: error`, `no-restricted-syntax` for raw hex values in className) + Prettier (`singleQuote`, `printWidth 110`, `trailingComma all`).
- Branch naming: `feat/web-<phase>-<area>` (e.g. `feat/web-p4-kitchen-board`). PRs go into `dev`.

## M. Accessibility Minimums
- Visible focus `focus-visible:ring-2 ring-ring ring-offset-2` on everything interactive.
- Icons-only buttons need `aria-label`. Status changes go through `aria-live="polite"`.
- Colour is never the only signal: always icon + text.
- Contrast is at least 4.5:1 (see the §A.3 small-orange-text rule).

## N. Consistency Checklist (every PR must pass)
- [ ] No hard-coded hex values or `text-[#…]`. Only tokens from §A
- [ ] Status labels, colours and icons come from `statusMeta` only
- [ ] Money via `Price`/`formatINR`, time via `formatTime`/`timeAgo`
- [ ] Requests via `api()`, query keys via `qk`, sockets via `useSocketEvent`
- [ ] Loading, empty and error states use the shared components
- [ ] Touch targets and fonts match §B for the shell the screen lives in
- [ ] Copy follows §F (canonical words, ₹ format, tone)
- [ ] Icons match the §C map
- [ ] Animations are only those in §K, wrapped in `motion-safe:`
