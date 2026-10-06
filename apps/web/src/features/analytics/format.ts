export const formatHour = (h: number): string => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

export const compactINR = (n: number): string =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const pct = (fraction: number): string => `${Math.round(fraction * 100)}%`;

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export const median = (values: number[]): number => percentile(values, 0.5);