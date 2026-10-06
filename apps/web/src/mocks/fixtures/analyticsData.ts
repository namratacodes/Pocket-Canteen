import { addDays, format, subDays } from 'date-fns';
import type {
  AnalyticsRange, ComboRule, EtaAccuracy, ForecastRow, Kpis, MatrixPoint, PeakHour, Quadrant, TopDish,
} from '@/types/admin';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);

const RANGE_MULT: Record<AnalyticsRange, number> = { today: 1, '7d': 6.5, '30d': 27 };
// Each canteen gets a stable size so admin sees different numbers per canteen.
const canteenScale = (id?: string) => (id ? 0.6 + (hash(id) % 80) / 100 : 1);

export function kpis(range: AnalyticsRange, canteenId?: string): Kpis {
  const orders = Math.round(142 * RANGE_MULT[range] * canteenScale(canteenId));
  return { orders, revenue: orders * 90, avgPrepMins: 9.2, cancelRate: 1.4 };
}

// Lunch peak at 13:00, tea peak around 16:30.
export function peakHours(range: AnalyticsRange, canteenId?: string): PeakHour[] {
  const rand = rng(hash(`peak${canteenId ?? ''}`));
  const scale = RANGE_MULT[range] * canteenScale(canteenId);
  return Array.from({ length: 15 }, (_, i) => {
    const hour = 8 + i;
    const base =
      6 + 62 * Math.exp(-((hour - 13) ** 2) / 3) + 36 * Math.exp(-((hour - 16.5) ** 2) / 1.6) + 10 * Math.exp(-((hour - 9) ** 2) / 2);
    const orders = Math.max(1, Math.round((base + rand() * 6) * scale));
    return { hour, orders, revenue: orders * 88 };
  });
}

const DISHES: [string, number, number][] = [
  ['Samosa', 120, 15], ['Masala Chai', 104, 12], ['Veg Sandwich', 88, 60], ['Chicken Biryani', 71, 140],
  ['Cold Coffee', 66, 70], ['Paneer Wrap', 58, 90], ['Veg Thali', 52, 110], ['Maggi', 49, 40],
  ['Fresh Lime Soda', 41, 35], ['Aloo Paratha', 37, 50], ['Cutting Chai', 33, 10], ['Brownie', 22, 65],
];
export function topDishes(range: AnalyticsRange, canteenId?: string): TopDish[] {
  const scale = RANGE_MULT[range] * canteenScale(canteenId);
  return DISHES.map(([name, qty, price], i) => {
    const q = Math.round(qty * scale);
    return { menuItemId: `item_${i + 1}`, name, qty: q, revenue: q * price };
  });
}

const FORECAST_ITEMS: [string, number][] = [
  ['Samosa', 300], ['Masala Chai', 260], ['Veg Sandwich', 190], ['Chicken Biryani', 142],
  ['Cold Coffee', 120], ['Paneer Wrap', 96], ['Veg Thali', 88], ['Maggi', 74],
];
export function forecast(canteenId?: string): ForecastRow[] {
  const scale = canteenScale(canteenId);
  return FORECAST_ITEMS.map(([name, p], i) => {
    const predicted = Math.round(p * scale);
    return { menuItemId: `item_${i + 1}`, name, predicted, low: Math.round(predicted * 0.93), high: Math.round(predicted * 1.08) };
  });
}

const SUGGESTIONS: Record<Quadrant, string> = {
  star: 'Best seller with healthy margin. Keep it prominent on the menu.',
  plowhorse: 'Sells well but earns little. Try a small price rise or cheaper ingredients.',
  puzzle: 'Earns well but rarely ordered. Feature it as a combo or special.',
  dog: 'Rarely ordered and low margin. Consider rewriting the recipe or removing it.',
};
const MATRIX_NAMES = [
  'Samosa', 'Masala Chai', 'Veg Sandwich', 'Chicken Biryani', 'Cold Coffee', 'Paneer Wrap', 'Veg Thali', 'Maggi',
  'Fresh Lime Soda', 'Aloo Paratha', 'Cutting Chai', 'Brownie', 'Egg Roll', 'Poha', 'Idli Sambar', 'Dosa',
  'Chole Bhature', 'Rajma Rice', 'Veg Burger', 'French Fries', 'Cold Drink', 'Lassi', 'Cheese Toast', 'Pav Bhaji',
  'Fried Rice', 'Noodles', 'Momos', 'Ice Cream', 'Filter Coffee', 'Upma',
];
// 8 stars, 8 plowhorses, 7 puzzles, 7 dogs.
const QUADRANT_PLAN: Quadrant[] = [
  ...Array<Quadrant>(8).fill('star'), ...Array<Quadrant>(8).fill('plowhorse'),
  ...Array<Quadrant>(7).fill('puzzle'), ...Array<Quadrant>(7).fill('dog'),
];
export function menuMatrix(canteenId?: string): MatrixPoint[] {
  const rand = rng(hash(`matrix${canteenId ?? ''}`));
  return MATRIX_NAMES.map((name, i) => {
    const quadrant = QUADRANT_PLAN[i];
    const highVolume = quadrant === 'star' || quadrant === 'plowhorse';
    const highMargin = quadrant === 'star' || quadrant === 'puzzle';
    return {
      menuItemId: `item_${i + 1}`,
      name,
      quadrant,
      volume: Math.round(highVolume ? 130 + rand() * 170 : 12 + rand() * 78),
      margin: Math.round(highMargin ? 48 + rand() * 24 : 12 + rand() * 24),
      suggestion: SUGGESTIONS[quadrant],
    };
  });
}

export const combos = (): ComboRule[] => [
  { items: ['Samosa', 'Masala Chai'], support: 0.18, confidence: 0.62, lift: 2.1 },
  { items: ['Veg Sandwich', 'Cold Coffee'], support: 0.11, confidence: 0.54, lift: 1.9 },
  { items: ['Chicken Biryani', 'Fresh Lime Soda'], support: 0.07, confidence: 0.47, lift: 1.7 },
  { items: ['Maggi', 'Cutting Chai'], support: 0.09, confidence: 0.41, lift: 1.5 },
  { items: ['Paneer Wrap', 'Cold Drink'], support: 0.06, confidence: 0.36, lift: 1.4 },
  { items: ['Aloo Paratha', 'Lassi'], support: 0.05, confidence: 0.31, lift: 1.3 },
];

export function etaAccuracy(canteenId?: string): EtaAccuracy {
  const rand = rng(hash(`eta${canteenId ?? ''}`));
  const today = new Date();
  const points = Array.from({ length: 14 }, (_, i) => {
    const predictedAvg = 9 + rand() * 2;
    const actualAvg = Math.max(3, predictedAvg + (rand() - 0.5) * 4.4);
    return {
      date: format(subDays(today, 13 - i), 'yyyy-MM-dd'),
      predictedAvg: Math.round(predictedAvg * 10) / 10,
      actualAvg: Math.round(actualAvg * 10) / 10,
    };
  });
  const mae = points.reduce((s, p) => s + Math.abs(p.predictedAvg - p.actualAvg), 0) / points.length;
  return { points, mae: Math.round(mae * 10) / 10 };
}

export const tomorrowKey = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');