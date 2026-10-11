import { env } from '../config/env';

/** 'YYYY-MM-DD' of the given instant in campus time zone. */
export function campusDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.CAMPUS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Minutes since local midnight (campus time zone). */
export function campusMinutes(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: env.CAMPUS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')!.value);
  const m = Number(parts.find((p) => p.type === 'minute')!.value);
  return h * 60 + m;
}

/** hours = {open:'08:00', close:'22:00'}. Handles close < open (overnight). */
export function isWithinHours(hours: { open: string; close: string }, d: Date = new Date()): boolean {
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const now = campusMinutes(d);
  const open = toMin(hours.open);
  const close = toMin(hours.close);
  return open <= close ? now >= open && now < close : now >= open || now < close;
}

function tzOffsetMinutes(at: Date): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: env.CAMPUS_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** UTC instant of local midnight of 'YYYY-MM-DD' in campus time zone. */
export function campusStartOfDay(day: string): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  return new Date(guess.getTime() - tzOffsetMinutes(guess) * 60000);
}

/** Half-open range [start, end) for 'YYYY-MM' in campus time zone. */
export function campusMonthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { start: campusStartOfDay(`${month}-01`), end: campusStartOfDay(`${next}-01`) };
}
