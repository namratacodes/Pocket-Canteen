import type { Quadrant } from '@/types/admin';

// Recharts needs literal colour values (not Tailwind classes). Kept in one place.
export const chartColors = {
  brand: '#F97316',
  neutral: '#94A3B8',
  info: '#2563EB',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
};

export interface QuadrantMeta {
  label: string;
  action: string;
  color: string;
  shape: 'star' | 'square' | 'diamond' | 'triangle';
}

// Shape + label + colour, so quadrant is never colour-only.
export const QUADRANTS: Record<Quadrant, QuadrantMeta> = {
  star: { label: 'Star', action: 'High volume, high margin. Keep and promote.', color: '#F59E0B', shape: 'star' },
  plowhorse: { label: 'Plowhorse', action: 'High volume, low margin. Raise price or cut cost.', color: '#2563EB', shape: 'square' },
  puzzle: { label: 'Puzzle', action: 'Low volume, high margin. Promote it more.', color: '#A855F7', shape: 'diamond' },
  dog: { label: 'Dog', action: 'Low volume, low margin. Rework or drop.', color: '#64748B', shape: 'triangle' },
};
export const QUADRANT_ORDER: Quadrant[] = ['star', 'plowhorse', 'puzzle', 'dog'];