import type {
  AdminCanteen, DayHours, SettlementEntry, SettlementRow, StaffAccount, Weekday,
} from '@/types/admin';

const open: DayHours = { open: '08:00', close: '22:00', closed: false };
const closedDay: DayHours = { open: '', close: '', closed: true };
export const standardHours = (): Record<Weekday, DayHours> => ({
  mon: { ...open }, tue: { ...open }, wed: { ...open }, thu: { ...open },
  fri: { ...open }, sat: { ...open }, sun: { ...closedDay },
});

type CanteenSeed = Omit<AdminCanteen, 'stats'> & { stats: Omit<AdminCanteen['stats'], 'staffCount'> };

export const mockCanteens: CanteenSeed[] = [
  {
    id: 'canteen_main', name: 'Main Canteen', location: 'Admin block, ground floor', isOpen: true,
    fssaiLicenseNo: '11223344556677', operatingHours: standardHours(),
    payment: { razorpayAccountRef: 'acc_MainCanteen9xQ', bankAccountLast4: '4321', kycStatus: 'verified' },
    stats: { ordersToday: 412, gmvToday: 52300, activeOrders: 12 }, createdAt: '2026-06-02T09:00:00Z',
  },
  {
    id: 'canteen_juice', name: 'Juice Corner', location: 'Library lawn', isOpen: true,
    fssaiLicenseNo: '22334455667788', operatingHours: standardHours(),
    payment: { razorpayAccountRef: 'acc_JuiceCorner7pL', bankAccountLast4: '8812', kycStatus: 'verified' },
    stats: { ordersToday: 188, gmvToday: 21400, activeOrders: 3 }, createdAt: '2026-06-09T09:00:00Z',
  },
  {
    id: 'canteen_south', name: 'South Hub', location: 'South gate', isOpen: false,
    fssaiLicenseNo: '33445566778899', operatingHours: standardHours(),
    payment: { razorpayAccountRef: 'acc_SouthHub4kD2', bankAccountLast4: '1090', kycStatus: 'pending' },
    stats: { ordersToday: 0, gmvToday: 0, activeOrders: 0 }, createdAt: '2026-07-14T09:00:00Z',
  },
  {
    id: 'canteen_north', name: 'North Block Café', location: 'North block, first floor', isOpen: true,
    fssaiLicenseNo: '44556677889900', operatingHours: standardHours(),
    payment: { razorpayAccountRef: 'acc_NorthBlock2mR8', bankAccountLast4: '6677', kycStatus: 'verified' },
    stats: { ordersToday: 520, gmvToday: 41800, activeOrders: 9 }, createdAt: '2026-07-21T09:00:00Z',
  },
  {
    id: 'canteen_engg', name: 'Engineering Canteen', location: 'Engineering block', isOpen: true,
    fssaiLicenseNo: '55667788990011', operatingHours: standardHours(),
    payment: { razorpayAccountRef: 'acc_EnggCanteen5tY3', bankAccountLast4: '3305', kycStatus: 'verified' },
    stats: { ordersToday: 722, gmvToday: 48800, activeOrders: 15 }, createdAt: '2026-08-03T09:00:00Z',
  },
];

const staff = (
  id: string, name: string, email: string, phone: string, canteenId: string, canteenName: string,
  lastLoginAt?: string, status: 'active' | 'disabled' = 'active'
): StaffAccount => ({ id, name, email, phone, canteenId, canteenName, status, createdAt: '2026-08-10T09:00:00Z', lastLoginAt });

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const mockStaff: StaffAccount[] = [
  staff('stf_1', 'Ramesh Kumar', 'staff@main.pc', '9876543211', 'canteen_main', 'Main Canteen', hoursAgo(1)),
  staff('stf_2', 'Priya Sharma', 'new@main.pc', '9876543213', 'canteen_main', 'Main Canteen'),
  staff('stf_3', 'Arjun Mehta', 'arjun@juice.pc', '9812345670', 'canteen_juice', 'Juice Corner', hoursAgo(5)),
  staff('stf_4', 'Sana Qureshi', 'sana@north.pc', '9823456701', 'canteen_north', 'North Block Café', hoursAgo(26)),
  staff('stf_5', 'Vikram Rao', 'vikram@north.pc', '9834567012', 'canteen_north', 'North Block Café', hoursAgo(3)),
  staff('stf_6', 'Deepa Nair', 'deepa@engg.pc', '9845670123', 'canteen_engg', 'Engineering Canteen', hoursAgo(2)),
  staff('stf_7', 'Manoj Singh', 'manoj@engg.pc', '9856701234', 'canteen_engg', 'Engineering Canteen', hoursAgo(72), 'disabled'),
  staff('stf_8', 'Kavita Joshi', 'kavita@engg.pc', '9867012345', 'canteen_engg', 'Engineering Canteen', hoursAgo(8)),
];

// September 2026: Σ Δ = -8,420 and floating credit = 8,420, so the conservation check balances.
const base = (
  canteenId: string, canteenName: string, creditIssued: number, creditRedeemed: number
): Omit<SettlementRow, 'id'> => ({
  canteenId, canteenName, creditIssued, creditRedeemed,
  netPayable: creditRedeemed - creditIssued, status: 'pending',
});

export const SEPT = '2026-09';
export const septRows: SettlementRow[] = [
  { id: `stl_${SEPT}_canteen_main`, ...base('canteen_main', 'Main Canteen', 4200, 6100) },
  { id: `stl_${SEPT}_canteen_juice`, ...base('canteen_juice', 'Juice Corner', 10320, 900) },
  {
    id: `stl_${SEPT}_canteen_south`, ...base('canteen_south', 'South Hub', 1000, 1000),
    status: 'settled', settledAt: '2026-10-02T10:30:00Z', recordedBy: 'Admin',
  },
  { id: `stl_${SEPT}_canteen_north`, ...base('canteen_north', 'North Block Café', 2400, 3000) },
  { id: `stl_${SEPT}_canteen_engg`, ...base('canteen_engg', 'Engineering Canteen', 3500, 2000) },
];
export const SEPT_FLOATING = 8420;

// Deterministic pseudo-random so drill-down entries are stable between renders.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function split(total: number, rand: () => number): number[] {
  const parts: number[] = [];
  let left = total;
  while (left > 0) {
    const amt = Math.min(left, Math.round(120 + rand() * 480));
    parts.push(amt);
    left -= amt;
  }
  return parts;
}

export function makeEntries(rowId: string, issued: number, redeemed: number): SettlementEntry[] {
  const rand = rng(hash(rowId));
  const make = (type: 'issued' | 'redeemed', amounts: number[]): SettlementEntry[] =>
    amounts.map((amount) => {
      const day = 1 + Math.floor(rand() * 30);
      const hour = 8 + Math.floor(rand() * 13);
      return {
        orderUid: `PKT-202609${String(day).padStart(2, '0')}-${String(1 + Math.floor(rand() * 900)).padStart(4, '0')}`,
        type,
        amount,
        date: `2026-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00Z`,
        studentMasked: `S••••${String(1000 + Math.floor(rand() * 9000))}`,
      };
    });
  return [...make('issued', split(issued, rand)), ...make('redeemed', split(redeemed, rand))].sort(
    (a, b) => b.date.localeCompare(a.date)
  );
}