import { describe, expect, it } from 'vitest';
import { checkConservation, computeTransfers } from '@/features/admin/settlements/computeTransfers';
import { settlementsToCsv } from '@/features/admin/settlements/exportCsv';
import type { SettlementRow } from '@/types/admin';

const row = (canteenName: string, netPayable: number): Pick<SettlementRow, 'canteenName' | 'netPayable'> => ({
  canteenName, netPayable,
});

describe('computeTransfers', () => {
  it('pairs one debtor with one creditor', () => {
    expect(computeTransfers([row('Juice Corner', -1900), row('Main Canteen', 1900), row('South Hub', 0)])).toEqual([
      { from: 'Juice Corner', to: 'Main Canteen', amount: 1900 },
    ]);
  });

  it('splits across several debtors and creditors (multi-party)', () => {
    const out = computeTransfers([row('A', -500), row('B', -300), row('C', 600), row('D', 200)]);
    expect(out).toEqual([
      { from: 'A', to: 'C', amount: 500 },
      { from: 'B', to: 'C', amount: 100 },
      { from: 'B', to: 'D', amount: 200 },
    ]);
    // Everything that creditors are owed is paid out exactly.
    expect(out.filter((t) => t.to === 'C').reduce((s, t) => s + t.amount, 0)).toBe(600);
    expect(out.filter((t) => t.to === 'D').reduce((s, t) => s + t.amount, 0)).toBe(200);
  });

  it('leaves unmatched debt as floating credit (September mock data)', () => {
    const out = computeTransfers([
      row('Main Canteen', 1900), row('Juice Corner', -9420), row('South Hub', 0),
      row('North Block Café', 600), row('Engineering Canteen', -1500),
    ]);
    expect(out).toEqual([
      { from: 'Juice Corner', to: 'Main Canteen', amount: 1900 },
      { from: 'Juice Corner', to: 'North Block Café', amount: 600 },
    ]);
  });

  it('is safe with float amounts and no activity', () => {
    expect(computeTransfers([row('X', -0.1), row('Y', 0.1)])).toEqual([{ from: 'X', to: 'Y', amount: 0.1 }]);
    expect(computeTransfers([])).toEqual([]);
    expect(computeTransfers([row('X', 0), row('Y', 0)])).toEqual([]);
  });
});

describe('checkConservation', () => {
  const rows = [{ netPayable: 1900 }, { netPayable: -9420 }, { netPayable: 0 }, { netPayable: 600 }, { netPayable: -1500 }];

  it('balances when Σ Δ + floating credit = 0', () => {
    expect(checkConservation(rows, 8420)).toEqual({ sum: -8420, gap: 0, balanced: true });
  });

  it('reports a mismatch with the gap', () => {
    const r = checkConservation(rows, 8920);
    expect(r.balanced).toBe(false);
    expect(r.gap).toBe(500);
  });

  it('tolerates float noise below one paisa', () => {
    expect(checkConservation([{ netPayable: 0.1 }, { netPayable: 0.2 }, { netPayable: -0.3 }], 0).balanced).toBe(true);
  });
});

describe('settlementsToCsv', () => {
  it('writes the agreed columns', () => {
    const csv = settlementsToCsv([
      { id: '1', canteenId: 'c', canteenName: 'Main Canteen', creditIssued: 4200, creditRedeemed: 6100, netPayable: 1900, status: 'pending' },
    ]);
    const lines = csv.split(/\r?\n/);
    expect(lines[0]).toBe('canteen,issued,redeemed,net,status');
    expect(lines[1]).toBe('Main Canteen,4200.00,6100.00,1900.00,pending');
  });
});